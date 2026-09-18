const pool = require('../config/database');

function clean(value){ return value == null ? null : String(value).trim() || null }

function validateBank(input){
  const accountHolderName = clean(input.accountHolderName)
  const accountNumber = clean(input.accountNumber)
  const ifscCode = clean(input.ifscCode)?.toUpperCase()
  const bankName = clean(input.bankName)
  if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
    throw Object.assign(new Error('Complete bank account details are required'), { code:'INVALID_PARTNER_PAYOUT_ACCOUNT' })
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    throw Object.assign(new Error('Enter a valid IFSC code'), { code:'INVALID_PARTNER_PAYOUT_ACCOUNT' })
  }
  if (!/^[0-9]{6,30}$/.test(accountNumber)) {
    throw Object.assign(new Error('Enter a valid bank account number'), { code:'INVALID_PARTNER_PAYOUT_ACCOUNT' })
  }
  return { method:'bank', accountHolderName, accountNumber, ifscCode, bankName }
}

function validateUpi(input){
  const upiId = clean(input.upiId)?.toLowerCase()
  if (!upiId || !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(upiId)) {
    throw Object.assign(new Error('Enter a valid UPI ID'), { code:'INVALID_PARTNER_PAYOUT_ACCOUNT' })
  }
  return { method:'upi', upiId }
}

function publicAccount(row){
  if (!row) return null
  if (row.method === 'upi') {
    return { id:row.id, method:'upi', upi_id:row.upi_id, is_verified:row.is_verified, is_active:row.is_active }
  }
  const account = String(row.account_number || '')
  return {
    id:row.id,
    method:'bank',
    account_holder_name:row.account_holder_name,
    bank_name:row.bank_name,
    ifsc_code:row.ifsc_code,
    account_number_masked: account ? `••••${account.slice(-4)}` : null,
    is_verified:row.is_verified,
    is_active:row.is_active,
  }
}

async function get(userId){
  const result = await pool.query(`SELECT * FROM lead_partner_payout_accounts WHERE user_id=$1 AND is_active=TRUE ORDER BY id DESC LIMIT 1`, [Number(userId)])
  return publicAccount(result.rows[0] || null)
}

async function save({userId, method, accountHolderName, accountNumber, ifscCode, bankName, upiId}){
  const normalizedMethod = String(method || '').trim().toLowerCase()
  const details = normalizedMethod === 'bank'
    ? validateBank({accountHolderName,accountNumber,ifscCode,bankName})
    : normalizedMethod === 'upi'
      ? validateUpi({upiId})
      : (()=>{ throw Object.assign(new Error('Select Bank Account or UPI'),{code:'INVALID_PARTNER_PAYOUT_ACCOUNT'}) })()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`lead-partner-payout-account:${Number(userId)}`])
    await client.query(`UPDATE lead_partner_payout_accounts SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND is_active=TRUE`, [Number(userId)])
    const result = await client.query(`INSERT INTO lead_partner_payout_accounts (user_id,method,account_holder_name,account_number,ifsc_code,bank_name,upi_id,is_verified,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,TRUE) RETURNING *`, [Number(userId),details.method,details.accountHolderName || null,details.accountNumber || null,details.ifscCode || null,details.bankName || null,details.upiId || null])
    await client.query('COMMIT')
    return publicAccount(result.rows[0])
  } catch(e){
    await client.query('ROLLBACK')
    throw e
  } finally { client.release() }
}

async function getInternal(clientOrPool, userId){
  const result = await clientOrPool.query(`SELECT * FROM lead_partner_payout_accounts WHERE user_id=$1 AND is_active=TRUE LIMIT 1`, [Number(userId)])
  return result.rows[0] || null
}

module.exports = { get, save, getInternal, publicAccount }
