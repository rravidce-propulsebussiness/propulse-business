const assert = require('assert');
const pool = require('../src/config/database');
const payoutService = require('../src/services/leadPartnerPayoutService');
const earningsService = require('../src/services/leadPartnerEarningsService');

const tag = `payout-test-${Date.now()}-${process.pid}`;
const email = `${tag}@example.test`;
const proof = 'data:image/png;base64,iVBORw0KGgo=';
let ids = {};

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

async function main() {
  const c = await pool.connect();
  let cleanupNeeded = false;
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL lock_timeout = 5000');
    await c.query('SET LOCAL statement_timeout = 30000');

    const user = (await c.query(
      `INSERT INTO users(name,email,password_hash,role,is_active)
       VALUES($1,$2,'test','lead_partner',TRUE) RETURNING id`, ['Payout Test Partner', email]
    )).rows[0];
    ids.user = Number(user.id);
    console.log('fixture: partner user created');

    const partner = (await c.query(
      `INSERT INTO lead_partners(user_id,status) VALUES($1,'active') RETURNING id`, [ids.user]
    )).rows[0];
    ids.partner = Number(partner.id);
    console.log('fixture: partner created');

    const admin = (await c.query(
      `INSERT INTO users(name,email,password_hash,role,is_active)
       VALUES($1,$2,'test','admin',TRUE) RETURNING id`,
      ['Payout Test Admin', `${tag}-admin@example.test`]
    )).rows[0];
    ids.admin = Number(admin.id);
    console.log('fixture: admin created');

    const industry = (await c.query('SELECT id FROM industries ORDER BY id LIMIT 1')).rows[0];
    const service = (await c.query('SELECT id FROM services ORDER BY id LIMIT 1')).rows[0];
    const state = (await c.query('SELECT id FROM states ORDER BY id LIMIT 1')).rows[0];
    const city = (await c.query('SELECT id FROM cities ORDER BY id LIMIT 1')).rows[0];
    assert(industry && service && state && city, 'Base catalog is required');

    async function makeEarning(amount) {
      const lead = (await c.query(
        `INSERT INTO leads(industry_id,service_id,state_id,city_id,customer_name,customer_phone,requirement,created_by,lead_partner_id,pricing)
         VALUES($1,$2,$3,$4,$5,'9000000000','Test requirement',$6,$7,'{"shares":[{"shares":1,"normal":100,"pro":100}]}')
         RETURNING id`,
        [industry.id, service.id, state.id, city.id, `${tag}-lead-${amount}-${Math.random()}`, ids.user, ids.partner]
      )).rows[0];

      const payment = (await c.query(
        `INSERT INTO payments(user_id,amount,payment_method,status)
         VALUES($1,$2,'manual','paid') RETURNING id`, [ids.user, amount]
      )).rows[0];

      const purchase = (await c.query(
        `INSERT INTO lead_purchases(lead_id,user_id,shares,amount,pricing_tier,status)
         VALUES($1,$2,1,$3,'normal','paid') RETURNING id`,
        [lead.id, ids.user, amount]
      )).rows[0];

      const earning = (await c.query(
        `INSERT INTO lead_partner_earnings
         (partner_id,user_id,lead_id,lead_purchase_id,payment_id,gross_sale_amount,commission_percent,earning_amount,status)
         VALUES($1,$2,$3,$4,$5,$6,5,$6*0.95,'available') RETURNING id`,
        [ids.partner, ids.user, lead.id, purchase.id, payment.id, amount]
      )).rows[0];

      return {leadId:Number(lead.id), purchaseId:Number(purchase.id), earningId:Number(earning.id)};
    }

    ids.first = await makeEarning(700);
    ids.second = await makeEarning(100);
    ids.third = await makeEarning(50);

    await c.query(
      `INSERT INTO lead_partner_payout_accounts
       (user_id,method,upi_id,is_verified,is_active)
       VALUES($1,'upi',$2,TRUE,TRUE)`,
      [ids.user, `${tag}@upi`]
    );

    await c.query('COMMIT');
    cleanupNeeded = true;
    console.log('fixture: committed');

    console.log('test: concurrent withdrawals');
    const concurrent = await Promise.allSettled([
      payoutService.requestWithdrawal({userId:ids.user,amount:665,notes:'concurrency A'}),
      payoutService.requestWithdrawal({userId:ids.user,amount:665,notes:'concurrency B'})
    ]);
    assert.strictEqual(concurrent.filter(x => x.status === 'fulfilled').length, 1, 'Exactly one concurrent withdrawal should succeed');
    assert.strictEqual(concurrent.filter(x => x.status === 'rejected').length, 1, 'Exactly one concurrent withdrawal should fail');

    const pending = (await q(
      `SELECT id,amount,status,payout_account_snapshot FROM lead_partner_payout_requests
       WHERE user_id=$1 AND status='pending' ORDER BY id DESC LIMIT 1`, [ids.user]
    ))[0];
    assert(pending, 'Successful withdrawal should be pending');
    assert.strictEqual(Number(pending.amount), 665, 'Withdrawal amount should be 665');
    assert.strictEqual(pending.payout_account_snapshot.upi_id, `${tag}@upi`, 'Payout account must be snapshotted');

    const reserved = (await q(
      `SELECT COALESCE(SUM(amount),0) total FROM lead_partner_payout_items WHERE payout_id=$1 AND status='reserved'`, [pending.id]
    ))[0];
    assert.strictEqual(Number(reserved.total), 665, 'Pending payout must reserve exactly its request amount');

    console.log('test: reject payout');
    await payoutService.adminProcess({
      requestId:Number(pending.id), adminId:ids.admin, action:'reject', rejectionReason:'Test rejection'
    });
    const rejectedItems = (await q(
      `SELECT COUNT(*)::int count FROM lead_partner_payout_items WHERE payout_id=$1 AND status='reserved'`, [pending.id]
    ))[0];
    assert.strictEqual(Number(rejectedItems.count), 0, 'Rejected payout cannot retain reservations');

    console.log('test: second withdrawal');
    const secondPayout = await payoutService.requestWithdrawal({userId:ids.user,amount:665,notes:'paid lifecycle'});
    const secondAccount = (await q(
      `SELECT payout_account_snapshot FROM lead_partner_payout_requests WHERE id=$1`, [secondPayout.id]
    ))[0];
    assert.strictEqual(secondAccount.payout_account_snapshot.upi_id, `${tag}@upi`, 'Second payout snapshot must be stored');

    console.log('test: pay payout');
    await payoutService.adminProcess({
      requestId:Number(secondPayout.id), adminId:ids.admin, action:'paid',
      transferReference:`${tag}-UTR-1`, proofUrl:proof
    });

    const paid = (await q(
      `SELECT status FROM lead_partner_payout_requests WHERE id=$1`, [secondPayout.id]
    ))[0];
    assert.strictEqual(paid.status, 'paid', 'Paid payout must become paid');

    const earning1 = (await q(
      `SELECT status FROM lead_partner_earnings WHERE id=$1`, [ids.first.earningId]
    ))[0];
    assert.strictEqual(earning1.status, 'paid', 'Fully paid earning must become paid');

    console.log('test: duplicate UTR');
    const thirdPayout = await payoutService.requestWithdrawal({userId:ids.user,amount:95,notes:'duplicate UTR'});
    await assert.rejects(
      () => payoutService.adminProcess({
        requestId:Number(thirdPayout.id), adminId:ids.admin, action:'paid',
        transferReference:`${tag}-UTR-1`, proofUrl:proof
      }),
      e => e.code === 'DUPLICATE_REFERENCE'
    );

    console.log('test: earning reversal against pending payout');
    const fourthPayout = await payoutService.requestWithdrawal({userId:ids.user,amount:47.5,notes:'fake lead pending test'});
    await earningsService.reverseForPurchase(
      pool,
      ids.third.purchaseId,
      'Automated payout lifecycle test'
    );
    const reversedPayout = (await q(
      `SELECT status,amount FROM lead_partner_payout_requests WHERE id=$1`, [fourthPayout.id]
    ))[0];
    assert.strictEqual(reversedPayout.status, 'rejected', 'Payout emptied by earning reversal must be rejected');

    console.log('Lead Partner payout lifecycle tests passed.');
  } catch (error) {
    console.error(`Lead Partner payout lifecycle tests failed: ${error.message}`);
    throw error;
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    if (cleanupNeeded) {
      const cleanup = await pool.connect();
      try {
        await cleanup.query('BEGIN');
        await cleanup.query('SET LOCAL lock_timeout = 5000');
        await cleanup.query('DELETE FROM lead_partner_payout_items WHERE payout_id IN (SELECT id FROM lead_partner_payout_requests WHERE user_id=$1)', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_partner_payout_requests WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_partner_earning_adjustment_allocations WHERE earning_id IN (SELECT id FROM lead_partner_earnings WHERE user_id=$1)', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_partner_earning_adjustments WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_partner_earnings WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_purchases WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM payments WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_partner_payout_accounts WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM leads WHERE created_by=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM lead_partners WHERE user_id=$1', [ids.user || 0]);
        await cleanup.query('DELETE FROM users WHERE id=$1', [ids.admin || 0]);
        await cleanup.query('DELETE FROM users WHERE id=$1', [ids.user || 0]);
        await cleanup.query('COMMIT');
      } catch (e) {
        await cleanup.query('ROLLBACK').catch(() => {});
        console.error('Payout test cleanup failed:', e.message);
        process.exitCode = 1;
      } finally {
        cleanup.release();
      }
    }
    clearTimeout(timeout);
    await pool.end();
  }
}
main().catch(error => {
  console.error(`Lead Partner payout lifecycle tests failed: ${error.message}`);
  process.exitCode = 1;
});
