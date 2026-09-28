import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=fs.readFileSync(path.join(root,'src/pages/LeadPartnerPricing.jsx'),'utf8')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(source.includes("page:String(page), limit:'20'"),'Pricing workspace must request a bounded server page')
assert(source.includes("setTimeout(()=>{setPage(1);setSearch(searchInput.trim())},300)"),'Pricing lead search must be debounced')
assert(source.includes('pricing-override-tools'),'Pricing override workspace must expose real search/filter controls')
assert(source.includes('pricing-pagination'),'Pricing override workspace must expose page navigation')
assert(!source.includes('leads.slice(0,5)'),'Pricing overrides must not silently hide leads after the first five')
assert(!source.includes('＋ Add Override'),'Pricing workspace must not show an inert Add Override action')
assert(source.includes('lead.customerPhone'),'Pricing override rows must use the API contact field')
assert(source.includes('filteredRules.map'),'Configured-rule search must actually filter the displayed rules')

console.log('Lead Partner pricing pagination/UI regression test passed.')
