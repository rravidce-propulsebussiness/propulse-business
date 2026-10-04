import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=fs.readFileSync(path.join(root,'src/pages/LeadPartnerReports.jsx'),'utf8')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(source.includes("new URLSearchParams({status:filter,search:query,page:String(nextPage),limit:'50'})"),'Lead Partner reports must request a bounded server page')
assert(source.includes("setTimeout(()=>{setPage(1);setQuery(search.trim())},300)"),'Lead Partner report search must be debounced before server requests')
assert(source.includes('reportSummary.reason_counts'),'Report reason analytics must use server summary data')
assert(source.includes("limit:'100'"),'CSV export must use bounded export pages')
assert(source.includes('do{')&&source.includes('}while(exportPage<=totalPages);'),'CSV export must walk every matching report page')
assert(source.includes('reports-pagination'),'Lead Partner reports must expose page navigation')
assert(!source.includes('return reports.filter'),'Lead Partner reports must not client-filter an arbitrary snapshot')

console.log('Lead Partner report pagination and export regression test passed.')
