const pool = require('../config/database');

const clean = (v) => v === undefined || v === null ? null : String(v).trim() || null;

function normalizeInput(data = {}) {
  const methodType = String(data.methodType || 'upi').trim().toLowerCase();
  if (!['upi', 'bank', 'both'].includes(methodType)) {
    throw Object.assign(new Error('Payment method must be UPI, bank, or both'), { code: 'INVALID_METHOD_TYPE' });
  }
  const label = clean(data.label);
  if (!label) throw Object.assign(new Error('A payment account label is required'), { code: 'LABEL_REQUIRED' });
  return {
    label,
    methodType,
    accountName: clean(data.accountName),
    upiId: clean(data.upiId),
    bankName: clean(data.bankName),
    accountNumber: clean(data.accountNumber),
    ifscCode: clean(data.ifscCode)?.toUpperCase() || null,
    branchName: clean(data.branchName),
    qrCode: clean(data.qrCode),
    instructions: clean(data.instructions),
    isActive: data.isActive !== false,
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
  };
}

async function list({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE is_active=TRUE';
  return (await pool.query(`SELECT * FROM payment_receiving_details ${where} ORDER BY sort_order ASC,id ASC`)).rows;
}

async function getPublic() {
  return list({ includeInactive: false });
}

async function create(data) {
  const x = normalizeInput(data);
  return (await pool.query(`INSERT INTO payment_receiving_details(label,method_type,account_name,upi_id,bank_name,account_number,ifsc_code,branch_name,qr_code,instructions,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [x.label,x.methodType,x.accountName,x.upiId,x.bankName,x.accountNumber,x.ifscCode,x.branchName,x.qrCode,x.instructions,x.isActive,x.sortOrder])).rows[0];
}

async function update(id, data) {
  const x = normalizeInput(data);
  const row = (await pool.query(`UPDATE payment_receiving_details SET label=$1,method_type=$2,account_name=$3,upi_id=$4,bank_name=$5,account_number=$6,ifsc_code=$7,branch_name=$8,qr_code=$9,instructions=$10,is_active=$11,sort_order=$12,updated_at=CURRENT_TIMESTAMP WHERE id=$13 RETURNING *`, [x.label,x.methodType,x.accountName,x.upiId,x.bankName,x.accountNumber,x.ifscCode,x.branchName,x.qrCode,x.instructions,x.isActive,x.sortOrder,id])).rows[0];
  if (!row) throw Object.assign(new Error('Payment receiving account not found'), { code: 'NOT_FOUND' });
  return row;
}

async function remove(id) {
  const row = (await pool.query(`DELETE FROM payment_receiving_details WHERE id=$1 RETURNING *`, [id])).rows[0];
  if (!row) throw Object.assign(new Error('Payment receiving account not found'), { code: 'NOT_FOUND' });
  return row;
}

module.exports = { getPublic, list, create, update, remove, normalizeInput };
