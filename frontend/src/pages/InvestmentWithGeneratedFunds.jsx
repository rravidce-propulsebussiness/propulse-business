import {useEffect,useState} from 'react'
import {useLocation} from 'react-router-dom'
import Investment from './Investment'
import InvestmentCycleDashboard from './InvestmentCycleDashboard'

export default function InvestmentWithGeneratedFunds(){
 const location=useLocation()
 const showNew=new URLSearchParams(location.search).get('new')==='1'
 const [showLegacy,setShowLegacy]=useState(showNew)
 useEffect(()=>setShowLegacy(showNew),[showNew])
 return <><InvestmentCycleDashboard onAddInvestment={()=>setShowLegacy(true)} onRequestExit={()=>document.querySelector('.legacy-investment .investment-pending-card button')?.click()}/>{showLegacy&&<div className="legacy-investment"><Investment/></div>}</>
}
