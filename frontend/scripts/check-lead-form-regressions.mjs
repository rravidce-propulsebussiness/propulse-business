// Regressions found by testing the homeowner lead forms end to end.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

// 1. Homepage popup: PIN is the first field, so choosing a category afterwards must keep the
//    location (it used to reset PIN + city and then fail with "Enter and select a valid city").
const popup = read('src/components/GlobalLeadPopup.jsx')
const setFlow = popup.slice(popup.indexOf('function setFlow('), popup.indexOf('function setFlow(') + 600)
for (const field of ['cityId:current.cityId', 'pincode:current.pincode', 'name:current.name', 'phone:current.phone']) {
  assert(setFlow.includes(field), `Changing the popup category must keep ${field.split(':')[0]}`)
}
assert(!setFlow.includes("setCitySearch('')"), 'Changing the popup category must not clear the city text')
assert(!setFlow.includes('setDetected(null)'), 'Changing the popup category must not clear the detected PIN location')

// 2. Every homeowner form that sends consent:true tells the homeowner their request is shared.
const notice = 'By submitting, you agree ProPulse may contact you and share your requirement with relevant verified professionals.'
for (const file of ['src/components/GlobalLeadPopup.jsx', 'src/pages/RequirementWizard.jsx', 'src/components/InteriorRequirementExact.jsx', 'src/components/RealEstateRequirementExact.jsx']) {
  const source = read(file)
  assert(source.includes(notice), `${file} must show the sharing/consent notice`)
  assert(source.includes('href="/privacy-policy/"'), `${file} must link the privacy policy`)
}

// 3. The quote page accepts the same project keys as the project page (project-12, 12, seo-slug).
const quote = read('src/pages/ProjectQuote.jsx')
const idLine = quote.split('\n').find(line => line.includes('const id=')) || ''
const resolve = new Function('projectId', idLine.replace('const id=', 'return ') )
assert.equal(resolve('project-12'), '12')
assert.equal(resolve('12'), '12', 'a plain numeric project id must open the quote page')
assert.equal(resolve('g-2-villa-in-kondapur'), 'g-2-villa-in-kondapur', 'an SEO slug must open the quote page')
assert.equal(resolve('sample-villa'), '', 'archived sample projects are not quotable')
assert.equal(resolve('../admin'), '', 'unsafe keys are rejected')

console.log('Lead form regressions (popup location, consent notice, quote link) passed.')
