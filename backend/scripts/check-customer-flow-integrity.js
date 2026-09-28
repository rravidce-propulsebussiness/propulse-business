const assert = require('assert');
const pool = require('../src/config/database');

async function main() {
  const columns = (await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name IN ('contact_consent_at','contact_consent_version','intake_submission_key')"
  )).rows.map(row => row.column_name);
  assert.deepStrictEqual(new Set(columns), new Set(['contact_consent_at','contact_consent_version','intake_submission_key']));

  const flows = (await pool.query(
    "SELECT d.key,v.id AS version_id,v.version_no,(SELECT COUNT(*)::int FROM customer_flow_questions q WHERE q.version_id=v.id AND q.is_active=TRUE) AS question_count FROM customer_flow_definitions d JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published' WHERE d.key IN ('build','design') ORDER BY d.key"
  )).rows;
  assert.strictEqual(flows.length, 2);
  for (const flow of flows) {
    assert.strictEqual(Number(flow.version_no), 1);
    assert.ok(Number(flow.question_count) >= 10);
  }

  const functionDef = (await pool.query(
    "SELECT pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.proname='prevent_duplicate_lead_insert' ORDER BY p.oid DESC LIMIT 1"
  )).rows[0]?.definition || '';
  assert.match(functionDef, /service_id IS NOT DISTINCT FROM new\.service_id/i);
  assert.match(functionDef, /normalized_requirement/i);
  assert.match(functionDef, /created_at/i);
  console.log('Customer flow schema and seed checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
