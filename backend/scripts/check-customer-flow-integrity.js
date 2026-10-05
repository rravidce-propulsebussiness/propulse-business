const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function main() {
  const compatSeed = fs.readFileSync(path.join(__dirname,'../src/database/migrations/20260928_customer_flow_04_existing_catalog_compat.sql'),'utf8');
  const realEstateBuySellMigration = fs.readFileSync(path.join(__dirname,'../src/database/migrations/20261006_real_estate_buy_sell_only.sql'),'utf8');
  const popup = fs.readFileSync(path.join(__dirname,'../../frontend/src/components/GlobalLeadPopup.jsx'),'utf8');
  const realEstateUi = fs.readFileSync(path.join(__dirname,'../../frontend/src/components/RealEstateRequirementExact.jsx'),'utf8');
  const publicIntake = fs.readFileSync(path.join(__dirname,'../src/services/publicLeadIntakeService.js'),'utf8');
  const flowService = fs.readFileSync(path.join(__dirname,'../src/services/customerFlowService.js'),'utf8');
  assert.match(compatSeed, /LOWER\(COALESCE\(i\.slug,''\)\)/);
  assert.match(compatSeed, /LOWER\(i\.name\) LIKE '%construction%'/);
  assert.match(compatSeed, /LOWER\(i\.name\) LIKE '%interior%'/);
  assert.match(compatSeed, /AS service_id/);
  assert.doesNotMatch(compatSeed, /INSERT\s+INTO\s+industries/i);
  assert.doesNotMatch(compatSeed, /INSERT\s+INTO\s+services/i);
  assert.match(realEstateBuySellMigration, /NOT IN \('buy','sell'\)/);
  assert.doesNotMatch(popup, /<option value="rent">|<option value="invest">/);
  assert.doesNotMatch(realEstateUi, /key:'rental'|key:'investment'|intent:'rent'|intent:'invest'/);
  assert.doesNotMatch(publicIntake, /propertyIntent:\s*\{[^}]*rent:|propertyIntent:\s*\{[^}]*invest:/s);
  assert.match(flowService, /r\.key==='property'[\s\S]*property_intent'[\s\S]*\['buy','sell'\]/);

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

  const propertyIntentOptions=(await pool.query(
    "SELECT o.value,o.is_active FROM customer_flow_definitions d JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published' JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key='property_intent' JOIN customer_flow_question_options o ON o.question_id=q.id WHERE d.key='property' AND v.version_no=(SELECT MAX(v2.version_no) FROM customer_flow_versions v2 WHERE v2.definition_id=d.id AND v2.status='published') AND o.value IN ('buy','sell','rent','invest') ORDER BY o.display_order,o.id"
  )).rows;
  const activePropertyIntents=propertyIntentOptions.filter(row=>row.is_active).map(row=>row.value);
  assert.deepStrictEqual(activePropertyIntents,['buy','sell']);
  assert(propertyIntentOptions.some(row=>row.value==='rent'&&!row.is_active),'Rent intent must be inactive');
  assert(propertyIntentOptions.some(row=>row.value==='invest'&&!row.is_active),'Invest intent must be inactive');

  const functionDef = (await pool.query(
    "SELECT pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.proname='prevent_duplicate_lead_insert' ORDER BY p.oid DESC LIMIT 1"
  )).rows[0]?.definition || '';
  assert.match(functionDef, /service_id IS NOT DISTINCT FROM new\.service_id/i);
  assert.match(functionDef, /normalized_requirement/i);
  assert.match(functionDef, /created_at/i);
  console.log('Customer flow schema and seed checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
