import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'src/pages/LeadsV2.jsx'), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

assert(source.includes('lead.customer_name'), 'Lead cards must render the backend customer name')
assert(source.includes("['PIN code', lead.pincode]"), 'Expanded lead details must render the canonical PIN code')
assert(source.includes('LEAD PRICE'), 'Lead cards must show the current lead price without requiring expansion')
assert(!source.includes("['Source',"), 'Expanded marketplace leads must not show internal source metadata')
assert(source.includes('aria-label="Requirement"'), 'Expanded marketplace leads must include a Requirement section')
assert(source.includes('requirementText') && source.includes('requirementExtra'), 'Requirement section must render stored descriptions and additional customer requirements')
assert(!source.includes('!hasStructuredQuote'), 'Structured project answers must not hide the Requirement section')
for (const key of ['pincode', 'pin', 'zipcode', 'zip', 'postalcode']) {
  assert(source.includes(`'${key}'`), `PIN alias ${key} must be treated as canonical to avoid duplicate custom-field rendering`)
}

console.log('Lead marketplace name/price/PIN/requirement/privacy-of-source regression test passed.')
