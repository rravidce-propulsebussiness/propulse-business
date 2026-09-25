import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const header = read('src/components/UserHeader.css')
const leads = read('src/pages/LeadsV2.css')
const wallet = read('src/pages/WalletV2.css')
const membership = read('src/pages/Membership.css')
const profile = read('src/pages/Profile.css')
const payout = read('src/pages/PayoutAccount.css')

assert(header.includes('position:sticky'), 'UserHeader must stay in document flow with position: sticky')
assert(!/\.user-header\{[^}]*position:fixed/.test(header), 'UserHeader must not be fixed over page content')
assert(header.includes('top:calc(100% + 6px)'), 'Mobile navigation should be positioned relative to the header height')
assert(!/\.lv2-shell\{padding-top:(?:68|76)px/.test(leads), 'Leads must not duplicate fixed-header top padding')
assert(!profile.includes('padding:110px 34px') && !profile.includes('padding:90px 16px'), 'Profile must not carry fixed-header compensation padding')
assert(!payout.includes('padding:110px 24px') && !payout.includes('padding:90px 16px'), 'Payout account must not carry fixed-header compensation padding')

for (const [name, css] of [['Leads', leads], ['Wallet', wallet], ['Membership', membership]]) {
  assert(css.includes('var(--propulse-overlay-z,2000)'), `${name} dialogs must layer above the sticky user header`)
}

console.log('User header layout regression test passed.')
