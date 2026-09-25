import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=fs.readFileSync(path.join(root,'src/pages/InvestorFAQ.jsx'),'utf8')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(source.includes("fontSize:'clamp(38px,5vw,64px)'"),'Investor FAQ title must define its own responsive font size')
assert(source.includes("lineHeight:1.05"),'Investor FAQ title must define a safe line height')
assert(source.includes("margin:'8px 0 14px'"),'Investor FAQ title must reserve space below the heading')
assert(source.includes("lineHeight:1.6"),'Investor FAQ subtitle must define readable line height')
assert(source.includes("margin:'0 0 28px'"),'Investor FAQ subtitle must use normal-flow spacing')
assert(!source.includes("position:'absolute'"),'Investor FAQ hero text must remain in normal document flow')

console.log('Investor FAQ layout regression test passed.')
