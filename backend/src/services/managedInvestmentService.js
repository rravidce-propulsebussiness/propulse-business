const pool = require('../config/database');
const paymentService = require('./paymentService');

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw Object.assign(new Error('Amount must be greater than zero'), { code: 'INVALID_AMOUNT' });
  return number;
}

async function settings(client = pool) {
  const result = await client.query('SELECT * FROM investor_settings WHERE id=1');
  return result.rows[0] || { is_enabled: false, requires_pro: true, investment_cycle_days: 30 };
}

async function investmentConfig(client) {
  const result = await client.query(`
    SELECT MIN(r.minimum_amount) AS minimum_amount,
           MAX(r.maximum_amount) AS maximum_amount,
           MIN(r.maturity_days) AS maturity_days
    FROM investment_industry_rules r
    JOIN industries i ON i.id=r.industry_id
    WHERE r.is_active=TRUE AND i.is_active=TRUE
  `);
  const row = result.rows[0] || {};
  if (row.minimum_amount == null || row.maximum_amount == null) {
    throw Object.assign(new Error('Investment configuration is not available yet'), { code: 'INVESTMENT_DISABLED' });
  }
  return {
    minimumAmount: Number(row.minimum_amount),
    maximumAmount: Number(row.maximum_amount),
    maturityDays: Number(row.maturity_days || 30),
  };
}

async function proMember(userId, client) {
  const result = await client.query(`
    SELECT 1 FROM memberships
    WHERE user_id=$1 AND LOWER(COALESCE(plan,''))='pro'
      AND status IN ('active','paid')
      AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)
    LIMIT 1
  `, [Number(userId)]);
  return result.rows.length > 0;
}

async function technicalIndustry(client) {
  const result = await client.query(`
    SELECT r.industry_id, i.name AS industry_name
    FROM investment_industry_rules r
    JOIN industries i ON i.id=r.industry_id
    WHERE r.is_active=TRUE AND i.is_active=TRUE
    ORDER BY r.id
    LIMIT 1
  `);
  if (!result.rows[0]) throw Object.assign(new Error('Investment configuration is not available yet'), { code: 'INVESTMENT_DISABLED' });
  return result.rows[0];
}

async function validate({ client, userId, rawAmount }) {
  const config = await investmentConfig(client);
  const setting = await settings(client);
  if (!(setting.is_enabled ?? setting.enabled)) throw Object.assign(new Error('Investment is currently disabled'), { code: 'INVESTMENT_DISABLED' });
  if (setting.requires_pro && !(await proMember(userId, client))) throw Object.assign(new Error('Active Pro membership is required to invest'), { code: 'PRO_REQUIRED' });
  const value = amount(rawAmount);
  if (value < config.minimumAmount || value > config.maximumAmount) {
    throw Object.assign(new Error(`Investment must be between ₹${config.minimumAmount} and ₹${config.maximumAmount}`), { code: 'AMOUNT_OUT_OF_RANGE' });
  }
  const industry = await technicalIndustry(client);
  return { value, setting, config, industry };
}

async function createCheckout({ userId, amount: rawAmount, useWallet = true, reinvestmentEnabled = false }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { value, setting, config, industry } = await validate({ client, userId, rawAmount });
    const pending = (await client.query(`SELECT id FROM investments WHERE user_id=$1 AND status='pending' LIMIT 1 FOR UPDATE`, [Number(userId)])).rows[0];
    if (pending) throw Object.assign(new Error('An investment payment is already pending'), { code: 'PAYMENT_PENDING' });

    const maturityDays = Number(setting.investment_cycle_days ?? config.maturityDays ?? 30);
    const created = (await client.query(`
      INSERT INTO investments(user_id,industry_id,state_id,city_id,amount,return_percent,expected_return,maturity_days,reinvestment_enabled,status,starts_at,matures_at)
      VALUES($1,$2,NULL,NULL,$3,0,$3,$4,$5,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+make_interval(days=>$4))
      RETURNING *
    `, [Number(userId), Number(industry.industry_id), value, maturityDays, Boolean(reinvestmentEnabled)])).rows[0];

    const payment = await paymentService.createWalletFirstPayment(client, {
      userId: Number(userId),
      totalAmount: value,
      purchaseType: 'investment',
      purchaseId: created.id,
      notes: 'Propulse managed investment funding',
      useWallet: Boolean(useWallet),
    });

    await client.query('UPDATE investments SET payment_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2', [payment.payment.id, created.id]);
    let investment = created;
    if (payment.externalAmount <= 0) {
      investment = (await client.query(`
        UPDATE investments SET status='active',starts_at=CURRENT_TIMESTAMP,matures_at=CURRENT_TIMESTAMP+make_interval(days=$1),updated_at=CURRENT_TIMESTAMP
        WHERE id=$2 RETURNING *
      `, [maturityDays, created.id])).rows[0];
      await client.query(`INSERT INTO investment_transactions(investment_id,user_id,type,amount,reference_type,reference_id) VALUES($1,$2,'investment',$3,'wallet',$4)`, [created.id, Number(userId), value, payment.payment.id]);
    }
    await client.query('COMMIT');
    return {
      ...payment,
      investment: { ...investment, amount: Number(investment.amount), expected_return: Number(investment.expected_return), return_percent: 0, realized_revenue: 0, payout_amount: 0, reinvestment_available: false },
      paymentPending: payment.externalAmount > 0,
      managedAllocation: true,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createCheckout };
