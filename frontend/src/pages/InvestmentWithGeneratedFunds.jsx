import {useEffect,useState} from 'react'
import Investment from './Investment'
import {authRequest} from '../utils/auth'
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
function Parity(){const[f,setF]=useState(null),[c,setC]=useState(null);useEffect(()=>{let ok=true;const load=async()=>{try{const[a,b]=await Promise.all([authRequest('/investments/funds'),authRequest('/investments/cycle')]);if(ok){setF(a);setC(b?.cycle||b||null)}}catch{}};load();const id=setInterval(load,5000);return()=>{ok=false;clearInterval(id)}},[]);if(!f)return null;return <div style={{margin:'12px 0',padding:'12px 15px',border:'1px solid #dce7f1',borderRadius:10,background:'#f8fbfe',display:'flex',gap:18,flexWrap:'wrap',fontSize:12}}><b>Cycle #{c?.id??'—'} · {c?.auto_invest?'Auto-Invest ON':'Auto-Invest OFF'}</b><span>Ads available: {money(f.available_for_ads)}</span><span>Withdrawable: {money(f.transferable??f.withdrawable_earnings)}</span><span>Ad spent: {money(f.ad_spent??f.total_ad_spent)}</span><span>Generated: {money(f.generated)}</span></div>}
export default function InvestmentWithGeneratedFunds(){return <><Investment/><Parity/></>}
