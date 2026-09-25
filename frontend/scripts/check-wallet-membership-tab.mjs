import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const wallet=fs.readFileSync(path.join(root,'src/pages/Wallet.jsx'),'utf8')
const css=fs.readFileSync(path.join(root,'src/pages/WalletV2.css'),'utf8')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(wallet.includes("setTab('membership')"),'Wallet must expose a Membership tab')
assert(wallet.includes("<strong>MEMBERSHIP</strong><small>Plans & payments</small>"),'Membership tab must have a clear label')
assert((wallet.match(/<MembershipPayments \/>/g)||[]).length===1,'Membership activity must render from one shared component only')
assert(wallet.includes("tab==='membership'?<MembershipPayments />"),'Membership activity must render only when the Membership tab is active')
assert(!wallet.includes("</section><MembershipPayments />"),'Membership activity must not remain as a standalone section below Wallet history')
assert(css.includes('grid-template-columns:repeat(4,1fr)'), 'Desktop Wallet tabs must support four equal tabs')
assert(css.includes('.wallet-main>.membership-payment-workspace{margin-top:0}'),'Tabbed membership activity must align with the Wallet history panel')

console.log('Wallet membership tab regression test passed.')
