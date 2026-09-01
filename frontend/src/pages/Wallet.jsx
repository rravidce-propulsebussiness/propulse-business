import UserHeader from '../components/UserHeader'

export default function Wallet(){
  return <div style={{minHeight:'100vh',background:'#f7f8fa'}}><UserHeader/><main style={{maxWidth:1180,margin:'0 auto',padding:'42px 24px'}}><span style={{fontSize:12,fontWeight:800,letterSpacing:1.5,color:'#667085'}}>WALLET</span><h1 style={{margin:'8px 0',fontSize:36}}>Propulse Wallet</h1><p style={{color:'#667085'}}>Your wallet will hold funds for faster lead purchases.</p><section style={{marginTop:28,background:'#fff',border:'1px solid #e5e7eb',borderRadius:18,padding:28}}><div style={{fontSize:13,color:'#667085'}}>AVAILABLE BALANCE</div><div style={{fontSize:44,fontWeight:800,margin:'8px 0 16px'}}>₹0</div><p style={{color:'#667085',margin:0}}>Wallet top-up and wallet-funded lead purchases are not enabled in the current payment backend yet. Your existing lead purchase and membership flows continue to work normally.</p></section></main></div>
}
