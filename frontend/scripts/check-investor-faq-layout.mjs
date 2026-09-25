import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=fs.readFileSync(path.join(root,'src/pages/InvestorFAQ.jsx'),'utf8')
const css=fs.readFileSync(path.join(root,'src/pages/InvestorFAQ.css'),'utf8')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(source.includes("import './InvestorFAQ.css'"),'Investor FAQ must use its dedicated stylesheet')
assert(!source.includes('style={{'),'Investor FAQ should not rely on duplicated inline style objects')
assert(source.includes('investor-faq-hero'),'Investor FAQ must expose the premium hero structure')
assert(source.includes('investor-faq-number'),'FAQ rows must use the numbered visual hierarchy')
assert(source.includes('aria-expanded={expanded}'),'FAQ accordion buttons must expose expanded state')
assert(source.includes('aria-controls={answerId}'),'FAQ accordion buttons must link to their answer region')
assert(css.includes("font-size:clamp(36px,4.2vw,56px)"),'Investor FAQ title must stay responsive')
assert(css.includes('line-height:1.02'),'Investor FAQ title must keep a safe line height')
assert(css.includes('min-height:220px'),'Investor FAQ premium hero must remain compact on desktop')
assert(css.includes('flex:0 0 124px;width:124px;height:124px'),'Investor FAQ guide badge must remain compact')
assert(!css.includes('min-height:300px'),'Investor FAQ must not regress to the oversized hero')
assert(css.includes('.investor-faq-card.open'),'Open FAQ state must have dedicated styling')
assert(css.includes('@media(max-width:520px)'),'Investor FAQ must include mobile layout rules')
assert(!css.includes('position:absolute') || css.includes('.investor-faq-hero-mark small{position:absolute'),'Only decorative FAQ elements may use absolute positioning')

console.log('Investor FAQ premium layout regression test passed.')
