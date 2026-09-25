import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const leads = read('src/pages/LeadsV2.jsx')
const picker = read('src/components/PaymentProofPicker.jsx')

assert((leads.match(/<PaymentProofPicker/g) || []).length === 2, 'Both lead payment paths must reuse the shared proof picker')
assert(!leads.includes("lead-payment-proof')?.files"), 'Lead checkout must not read payment proof directly from the DOM')
assert(leads.includes('paymentProof.dataUrl'), 'Submitted proof must come from the same React state that drives the preview')
assert(picker.includes('Selected — ready to submit'), 'Selected proof must show an explicit ready state')
assert(picker.includes('Selected payment proof preview'), 'Image proofs must render a visible preview')
assert(picker.includes('Change'), 'Selected proof must offer a change control')
assert(picker.includes('Remove'), 'Selected proof must offer a remove control')
assert(picker.includes("'image/jpeg'") && picker.includes("'image/png'") && picker.includes("'application/pdf'"), 'Proof picker must restrict supported file types')
assert(picker.includes('5 MB or smaller'), 'Proof picker must enforce the 5 MB limit')

console.log('Payment proof preview regression test passed.')
