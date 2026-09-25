import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'src/pages/LeadsV2.jsx'), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

assert(source.includes("lead.customer_name"), 'Lead cards must render the backend customer name')
assert(source.includes("PIN {lead.pincode}"), 'Lead cards must render the canonical PIN code')
assert(source.includes("['PIN code', lead.pincode]"), 'Expanded lead details must render the canonical PIN code')
for (const key of ['pincode', 'pin', 'zipcode', 'zip', 'postalcode']) {
  assert(source.includes(`'${key}'`), `PIN alias ${key} must be treated as canonical to avoid duplicate custom-field rendering`)
}

console.log('Lead marketplace name/PIN display regression test passed.')
