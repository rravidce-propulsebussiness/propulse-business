import { useCallback, useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminDirectEnquiries.css'

const STATUSES=['new','contacted','site_visit','quoted','won','closed']
const statusLabel={
  new:'New',contacted:'Contacted',site_visit:'Site visit',quoted:'Quoted',won:'Won',closed:'Closed',
}
const readableDate=value=>value?new Date(value).toLocaleString('en-IN'):'—'

export default function AdminDirectEnquiries(){
  const [items,setItems]=useState([])
  const [page,setPage]=useState(1)
  const [status,setStatus]=useState('all')
  const [pagination,setPagination]=useState({page:1,total:0,totalPages:1})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(0)
  const [error,setError]=useState('')

  const load=useCallback(async()=>{
    setLoading(true);setError('')
    try {
      const query=new URLSearchParams({page:String(page),limit:'25',status})
      const result=await authRequest('/direct-project-enquiries?'+query.toString())
      setItems(Array.isArray(result?.items)?result.items:[])
      setPagination(result?.pagination||{page:1,total:0,totalPages:1})
    }catch(err){setError(err.message||'Unable to load direct enquiries')}
    finally{setLoading(false)}
  },[page,status])
  useEffect(()=>{load()},[load])

  async function changeStatus(item,newStatus){
    if(saving)return
    setSaving(item.id);setError('')
    try{
      const result=await authRequest('/direct-project-enquiries/'+item.id+'/status',{
        method:'PATCH',body:JSON.stringify({status:newStatus}),
      })
      setItems(current=>current.map(row=>row.id===item.id?{...row,status:result.status}:row))
    }catch(err){setError(err.message||'Could not update enquiry status')}
    finally{setSaving(0)}
  }

  return <section className="admin-direct-enquiries">
    <header className="admin-direct-header">
      <div>
        <span>FIRST-PARTY PROJECT ENQUIRIES</span>
        <h1>Direct ProPulse Construction &amp; Interiors</h1>
        <p>Customers requesting work from ProPulse itself. These enquiries are separate from the paid lead marketplace and are never listed for sale.</p>
      </div>
      <button type="button" onClick={load} disabled={loading}>Refresh</button>
    </header>
    <div className="admin-direct-toolbar">
      <label>Filter by status
        <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
          <option value="all">All enquiries</option>
          {STATUSES.map(value=><option key={value} value={value}>{statusLabel[value]}</option>)}
        </select>
      </label>
      <span>{pagination.total} enquiries</span>
    </div>
    {error&&<p role="alert" className="admin-direct-error">{error}</p>}
    {loading?<p role="status">Loading enquiries…</p>:items.length===0?<p className="admin-direct-empty">No direct ProPulse enquiries in this view.</p>:
    <div className="admin-direct-table-wrap">
      <table>
        <thead><tr><th>Received</th><th>Customer</th><th>Service / Area</th><th>Requirement</th><th>Status</th></tr></thead>
        <tbody>{items.map(item=><tr key={item.id}>
          <td><strong>#{item.id}</strong><br/>{readableDate(item.created_at)}</td>
          <td><strong>{item.customer_name}</strong><br/><a href={'tel:'+item.customer_phone}>{item.customer_phone}</a>{item.customer_email&&<><br/><a href={'mailto:'+item.customer_email}>{item.customer_email}</a></>}</td>
          <td><strong>{item.service_type==='construction'?'Construction':'Interiors'}</strong><br/>{item.project_location}</td>
          <td className="admin-direct-requirement">{item.requirement}</td>
          <td><select aria-label={'Status for direct enquiry #'+item.id} value={item.status} disabled={saving===item.id} onChange={e=>changeStatus(item,e.target.value)}>
            {STATUSES.map(value=><option key={value} value={value}>{statusLabel[value]}</option>)}
          </select></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <div className="admin-direct-pagination">
      <button type="button" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Previous</button>
      <span>Page {pagination.page||page} / {pagination.totalPages||1}</span>
      <button type="button" disabled={page>=(pagination.totalPages||1)||loading} onClick={()=>setPage(p=>p+1)}>Next</button>
    </div>
  </section>
}
