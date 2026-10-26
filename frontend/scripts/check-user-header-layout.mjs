import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const header = read('src/components/UserHeader.css')
const headerJsx = read('src/components/UserHeader.jsx')
const leads = read('src/pages/LeadsV2.css')
const wallet = read('src/pages/WalletV2.css')
const membership = read('src/pages/Membership.css')
const profile = read('src/pages/Profile.css')
const payout = read('src/pages/PayoutAccount.css')
const publicHeader = read('src/components/PublicSiteChrome.css')
const investorHeader = read('src/components/InvestorHeader.css')
const adminLayout = read('src/admin/components/AdminLayout.jsx')
const adminStyles = read('src/admin/components/AdminLayout.css')
const leadPartnerNav = read('src/components/LeadPartnerSidebar.jsx')
const leadPartnerStyles = read('src/pages/LeadPartnerShared.css')

assert(/\.user-header\{[^}]*position:fixed/.test(header), 'UserHeader must remain fixed while the page scrolls')
assert(header.includes('top:0;left:0;right:0;width:100%'), 'Fixed UserHeader must stay pinned across the viewport')
assert(header.includes('.user-header-spacer{height:var(--propulse-user-header-height)'), 'Desktop fixed header must reserve its document-flow height')
assert(header.includes('.user-header-spacer{height:var(--propulse-user-header-height-mobile)}'), 'Mobile fixed header must reserve its document-flow height')
assert((headerJsx.match(/user-header-spacer/g)||[]).length===2, 'Public and signed-in UserHeader variants must render the fixed-header spacer')
assert(header.includes('top:calc(100% + 6px)'), 'Mobile navigation should be positioned relative to the header height')
assert(!/\.lv2-shell\{padding-top:(?:68|76)px/.test(leads), 'Leads must not duplicate fixed-header top padding')
assert(!profile.includes('padding:110px 34px') && !profile.includes('padding:90px 16px'), 'Profile must not carry fixed-header compensation padding')
assert(!payout.includes('padding:110px 24px') && !payout.includes('padding:90px 16px'), 'Payout account must not carry fixed-header compensation padding')

for (const [name, css] of [['Leads', leads], ['Wallet', wallet], ['Membership', membership]]) {
  assert(css.includes('var(--propulse-overlay-z,2000)'), `${name} dialogs must layer above the fixed user header`)
}

assert(header.includes('left:12px;right:auto;width:min(340px'), 'Professional mobile navigation must open from the left')
assert(header.includes('.user-logout{display:none}') && header.includes('.user-header-mobile-logout{display:block'), 'Mobile logout must live in the navigation rather than duplicate the header')
assert(publicHeader.includes('left:12px;right:auto;width:min(360px'), 'Homeowner mobile navigation must open on the left')
assert(investorHeader.includes('left:10px;right:auto;top:calc(100% + 6px)'), 'Investor mobile navigation must open on the left')
assert(adminLayout.includes('className="admin-topbar-right"') && adminLayout.indexOf('className="admin-mobile-menu"') < adminLayout.indexOf('className="admin-topbar-right"'), 'Admin menu button belongs in the topbar left actions')
assert(adminStyles.includes('inset:0 auto 0 0'), 'Admin mobile menu must be anchored to the left side')
assert(leadPartnerNav.includes('aria-expanded={menuOpen}') && leadPartnerNav.includes('lead-partner-menu-toggle'), 'Lead Partner mobile menu must be toggleable')
assert(leadPartnerStyles.includes('.lead-partner-sidebar:not(.menu-open) .lead-partner-nav{display:none!important}'), 'Lead Partner mobile navigation must remain hidden until opened')

assert(headerJsx.indexOf('className="user-menu-toggle"') < headerJsx.indexOf('className="user-header-brand"'), 'Professional menu button must appear before the logo')
assert(leadPartnerNav.indexOf('className="lead-partner-menu-toggle"') < leadPartnerNav.indexOf('className="lead-partner-brand"'), 'Lead Partner menu button must appear before the logo')

console.log('User header layout regression test passed.')
