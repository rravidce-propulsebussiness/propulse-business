import {Component} from 'react'
import {reportClientError} from '../utils/clientObservability'

export default class AppErrorBoundary extends Component{
  constructor(props){
    super(props)
    this.state={failed:false}
  }
  static getDerivedStateFromError(){
    return{failed:true}
  }
  componentDidCatch(error,info){
    reportClientError(error,{kind:'react_error_boundary',componentStack:info?.componentStack||null})
  }
  render(){
    if(!this.state.failed)return this.props.children
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f5f8fb'}}>
      <section style={{width:'min(520px,100%)',padding:28,border:'1px solid #dce6ef',borderRadius:18,background:'#fff',boxShadow:'0 18px 50px rgba(21,50,81,.08)',textAlign:'center'}}>
        <div style={{width:48,height:48,margin:'0 auto 14px',display:'grid',placeItems:'center',borderRadius:14,background:'#fff0ed',color:'#b64c40',fontWeight:900,fontSize:22}}>!</div>
        <h1 style={{margin:'0 0 8px',fontSize:24,color:'#123f6c'}}>Something went wrong</h1>
        <p style={{margin:'0 auto 18px',maxWidth:420,color:'#6f8397',lineHeight:1.6}}>The error has been recorded for review. Reload the page to continue.</p>
        <button type="button" onClick={()=>window.location.reload()} style={{border:0,borderRadius:10,padding:'11px 18px',background:'#145a96',color:'#fff',fontWeight:800,cursor:'pointer'}}>Reload page</button>
      </section>
    </main>
  }
}
