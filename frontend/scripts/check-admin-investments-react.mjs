import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8')
const page=read('src/admin/pages/AdminInvestments.jsx')
const wallet=read('src/admin/pages/AdminInvestmentsWallet.jsx')
const css=read('src/admin/pages/AdminInvestmentsPremium.css')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

for(const source of [page,wallet]){
  assert(!source.includes('MutationObserver'),'Admin Investments must not use MutationObserver')
  assert(!source.includes('document.querySelector'),'Admin Investments must not patch React output with querySelector')
  assert(!source.includes('document.createElement'),'Admin Investments must not inject runtime DOM nodes/styles')
  assert(!source.includes('.innerHTML'),'Admin Investments must not construct action UI through innerHTML')
}
assert(wallet.includes('<InvestorActionModals'), 'Investor ad-spend actions must render through React')
assert(wallet.includes('className="investor-history-actions"'), 'Investor history footer actions must render in JSX')
assert(wallet.includes('/managed-ad-spend'), 'Native React spend action must use the managed ad-spend endpoint')
assert(wallet.includes('/linked-leads?page=')&&wallet.includes('linked.leads || []'), 'Admin linked-leads modal must consume the paginated object contract')
assert(wallet.includes('linked-leads-pagination'), 'Admin linked-leads modal must render pagination controls')
assert(css.includes('.investor-history-actions{')&&css.includes('.investor-history-summary{'), 'Investor modal/action styles must live in the stylesheet')

console.log('React Admin Investments regression checks passed.')
