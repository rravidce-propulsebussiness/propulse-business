const text=value=>String(value??'').trim()
const lower=value=>text(value).toLowerCase()

const purchaseTypeLabel=value=>{
  const type=lower(value)
  if(type==='lead')return'Lead'
  if(type==='membership')return'Membership'
  if(type==='booster')return'Booster'
  if(type==='wallet_topup'||type==='topup')return'Wallet top-up'
  return type?type.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'Purchase'
}

const leadLabel=id=>id?`Lead #${id}`:'Lead'

export function transactionTitle(row){
  if(!row)return'Transaction'
  if(row.source==='lead')return`Lead purchase · ${leadLabel(row.lead_id||row.purchase_id)}`
  if(row.source==='direct'){
    const kind=purchaseTypeLabel(row.purchase_type)
    return row.purchase_type==='lead'
      ?`Lead direct payment · ${leadLabel(row.purchase_id)}`
      :`${kind} direct payment`
  }

  const type=lower(row.type)
  const referenceType=lower(row.reference_type)
  if(type==='refund'){
    if(referenceType==='membership')return'Membership refund'
    if(referenceType==='lead')return`Lead purchase refund · ${leadLabel(row.reference_id)}`
    return'Wallet refund'
  }
  if(type==='debit'){
    if(referenceType==='membership')return'Membership payment'
    if(referenceType==='lead')return`Lead purchase · ${leadLabel(row.reference_id)}`
    if(referenceType==='booster')return'Booster payment'
    return'Wallet debit'
  }
  if(type==='credit'){
    if(['topup','wallet_topup','wallet'].includes(referenceType))return'Wallet top-up'
    return'Wallet credit'
  }
  return'Transaction'
}

export function leadPaymentSplit(row,money){
  const wallet=Number(row?.wallet_amount||0)
  const direct=Number(row?.external_amount||0)
  const parts=[]
  if(wallet>0)parts.push(`Wallet ${money(wallet)}`)
  if(direct>0)parts.push(`Direct ${money(direct)}`)
  return parts.join(' · ')
}

export function normalizeLeadPurchase(row){
  const leadId=row?.lead_id||row?.purchase_id
  const context=[text(row?.property_type),text(row?.budget)].filter(Boolean).join(' · ')
  return{
    ...row,
    source:'lead',
    kind:'lead',
    type:'debit',
    amount:Number(row?.amount||0),
    wallet_amount:Number(row?.wallet_amount||0),
    external_amount:Number(row?.external_amount||0),
    lead_id:leadId,
    historyKind:'Lead purchase',
    displayTitle:`Lead purchase · ${leadLabel(leadId)}`,
    leadContext:context
  }
}

function normalizeCombined(row){
  return{
    ...row,
    amount:Number(row?.amount||0),
    historyKind:row?.source==='wallet'?'Wallet':'Direct payment',
    displayTitle:transactionTitle(row)
  }
}

export function buildWalletHistory(history={}){
  const leadRows=(Array.isArray(history.leadPurchases)?history.leadPurchases:[]).map(normalizeLeadPurchase)
  const combined=(Array.isArray(history.combined)?history.combined:[]).map(normalizeCombined)
  const leadPaymentIds=new Set(leadRows.map(x=>text(x.payment_id)).filter(Boolean))
  const leadIds=new Set(leadRows.map(x=>text(x.lead_id)).filter(Boolean))

  const isLeadPaymentMovement=row=>{
    const paymentMatch=text(row.payment_id)&&leadPaymentIds.has(text(row.payment_id))
    if(row.source==='direct'){
      return paymentMatch||(lower(row.purchase_type)==='lead'&&leadIds.has(text(row.purchase_id)))
    }
    if(row.source==='wallet'&&lower(row.type)==='debit'){
      return paymentMatch||(lower(row.reference_type)==='lead'&&leadIds.has(text(row.reference_id)))
    }
    return false
  }

  const wallet=combined.filter(x=>x.source==='wallet')
  const all=[...combined.filter(x=>!isLeadPaymentMovement(x)),...leadRows]
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))

  return{all,wallet,lead:leadRows}
}
