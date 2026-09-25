import { useState } from 'react'

const faqs=[
  ['What is an investment cycle?','Each investment cycle is a separate accounting period. New funds added while a cycle is open stay in that cycle. When the cycle closes, the next real investment starts a fresh cycle.'],
  ['How does Auto-Invest work?','With Auto-Invest ON, eligible investor earnings can be consumed by future advertising. The available-for-ads amount is based on the current cycle ledger.'],
  ['When can I withdraw earnings?','Only realized investor earnings are withdrawable. Your invested principal is never treated as withdrawable. Pending withdrawal requests reserve the requested amount until they are paid or rejected.'],
  ['What happens when a lead is shared?','A lead can be sold as one or more shares up to its buyer capacity. History shows unique leads, single-share sales, shared sales, total shares, gross sale value and your investor earnings separately.'],
  ['Are previous cycles mixed with the current cycle?','No. Current-cycle balances and activity are kept separate from closed-cycle history so investment, ad spend, revenue and withdrawals are not combined.'],
  ['What happens during final exit?','Final exit stops new lead assignment for the cycle. Existing leads can finish resolving, after which the cycle can close.']
]

export default function InvestorFAQ(){
  const [open,setOpen]=useState(0)
  return <main style={{minHeight:'calc(100vh - 74px)',background:'#f6f8fb',padding:'34px 5% 60px'}}><div style={{maxWidth:1000,margin:'0 auto'}}><span style={{fontSize:10,fontWeight:900,letterSpacing:1,color:'#f15a24'}}>INVESTOR FAQ</span><h1 style={{margin:'8px 0 14px',color:'#102f58',fontSize:'clamp(38px,5vw,64px)',lineHeight:1.05,letterSpacing:'-0.035em',maxWidth:900}}>Frequently asked questions</h1><p style={{color:'#71839b',fontSize:14,lineHeight:1.6,margin:'0 0 28px',maxWidth:760}}>Understand cycles, earnings, advertising usage, shared lead sales and withdrawals.</p><div style={{display:'grid',gap:10}}>{faqs.map(([q,a],i)=><article key={q} style={{background:'#fff',border:'1px solid #dfe6ef',borderRadius:12,overflow:'hidden'}}><button type="button" onClick={()=>setOpen(open===i?-1:i)} style={{width:'100%',border:0,background:'#fff',padding:'16px 18px',display:'flex',justifyContent:'space-between',textAlign:'left',color:'#17395f',fontSize:12,fontWeight:900,cursor:'pointer'}}><span>{q}</span><span>{open===i?'−':'+'}</span></button>{open===i&&<div style={{padding:'0 18px 18px',color:'#61748c',fontSize:10,lineHeight:1.7}}>{a}</div>}</article>)}</div></div></main>
}
