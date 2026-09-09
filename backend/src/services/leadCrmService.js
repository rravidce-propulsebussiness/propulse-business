const pool = require('../config/database');

const VALID_STATUSES = ['new','contacted','follow_up','interested','meeting','won','lost','not_interested'];

function normalizeDate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw Object.assign(new Error('Invalid follow-up date'), { code: 'INVALID_DATE' });
  return d.toISOString();
}

async function updateLeadCrm({ leadId, userId, status, remarks, nextFollowupAt, markFollowedUp = false }) {
  const id = Number(leadId);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('Invalid lead'), { code: 'INVALID_LEAD' });
  if (!VALID_STATUSES.includes(String(status || 'new'))) throw Object.assign(new Error('Invalid CRM status'), { code: 'INVALID_STATUS' });

  const access = await pool.query(`
    SELECT 1 FROM lead_purchases WHERE lead_id=$1 AND user_id=$2 AND status='paid'
    UNION ALL
    SELECT 1 FROM lead_entitlement_claims WHERE lead_id=$1 AND user_id=$2
    LIMIT 1
  `, [id, userId]);
  if (!access.rowCount) throw Object.assign(new Error('You do not have access to this lead'), { code: 'FORBIDDEN' });

  const next = normalizeDate(nextFollowupAt);
  const existing = (await pool.query(`SELECT * FROM lead_crm WHERE lead_id=$1 AND user_id=$2`, [id, userId])).rows[0];
  const followed = Boolean(markFollowedUp);
  const last = followed ? new Date().toISOString() : existing?.last_followed_up_at || null;
  const count = Number(existing?.followup_count || 0) + (followed ? 1 : 0);
  const contactedBy = followed ? userId : existing?.contacted_by_user_id || null;

  const row = (await pool.query(`
    INSERT INTO lead_crm(lead_id,user_id,status,remarks,last_followed_up_at,next_followup_at,followup_count,contacted_by_user_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT(lead_id,user_id) DO UPDATE SET
      status=EXCLUDED.status,
      remarks=EXCLUDED.remarks,
      last_followed_up_at=EXCLUDED.last_followed_up_at,
      next_followup_at=EXCLUDED.next_followup_at,
      followup_count=EXCLUDED.followup_count,
      contacted_by_user_id=EXCLUDED.contacted_by_user_id,
      updated_at=CURRENT_TIMESTAMP
    RETURNING *
  `, [id, userId, status, String(remarks || '').trim(), last, next, count, contactedBy])).rows[0];

  const user = row.contacted_by_user_id ? (await pool.query(`SELECT name FROM users WHERE id=$1`, [row.contacted_by_user_id])).rows[0] : null;
  return { ...row, contacted_by_name: user?.name || '' };
}

module.exports = { VALID_STATUSES, updateLeadCrm };
