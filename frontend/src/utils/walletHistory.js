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
const leadPaymentState=row=>lower(row?.status||row?.payment_status)

export function transactionTitle(row){
  if(!row)return'Transaction'
  if(row.source==='lead')return`Lead purchase · ${leadLabel(row.lead_id||row.purchase_id)}`
  if(row.source==='direct'){
    const kind=purchaseTypeLabel(row.purchase_type)
    if(lower(row.purchase_type)==='lead'){
      const state=leadPaymentState(row)
      if(state==='pending')return`Lead payment pending · ${leadLabel(row.purchase_id)}`
      if(state==='rejected')return`Lead payment rejected · ${leadLabel(row.purchase_id)}`
      if(state==='failed')return`Lead payment failed · ${leadLabel(row.purchase_id)}`
      if(state==='refunded')return`Lead payment refunded · ${leadLabel(row.purchase_id)}`
      return`Lead direct payment · ${leadLabel(row.purchase_id)}`
    }
    return`${kind} direct payment`
  }

  const type=lower(row.type)
  const referenceType=lower(row.reference_type)
  const paymentState=leadPaymentState(row)
  if(type==='refund'){
    if(referenceType==='membership')return'Membership refund'
    if(referenceType==='lead')return`Lead purchase refund · ${leadLabel(row.reference_id)}`
    return'Wallet refund'
  }
  if(type==='debit'){
    if(referenceType==='membership')return'Membership payment'
    if(referenceType==='lead'){
      if(paymentState==='rejected')return`Lead payment rejected · ${leadLabel(row.reference_id)}`
      if(paymentState==='failed')return`Lead payment failed · ${leadLabel(row.reference_id)}`
      return`Lead purchase · ${leadLabel(row.reference_id)}`
    }
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
    balance_after:row?.balance_after==null?null:Number(row.balance_after),
    lead_id:leadId,
    status:'paid',
    historyKind:'Lead purchase',
    displayTitle:`Lead purchase · ${leadLabel(leadId)}`,
    leadContext:context
  }
}

function normalizeCombined(row){
  const state=leadPaymentState(row)
  const isUnsettledLeadAttempt=row?.source==='direct'&&lower(row?.purchase_type)==='lead'&&state!=='paid'
  return{
    ...row,
    type:isUnsettledLeadAttempt?'attempt':row?.type,
    amount:Number(row?.amount||0),
    balance_after:row?.balance_after==null?null:Number(row.balance_after),
    historyKind:isUnsettledLeadAttempt?'Lead payment attempt':row?.source==='wallet'?'Wallet':'Direct payment',
    displayTitle:transactionTitle(row)
  }
}

function collapseLeadAttempts(rows,purchasedLeadIds){
  const latestByLead=new Map()
  for(const row of rows){
    if(row.source!=='direct'||lower(row.purchase_type)!=='lead')continue
    const leadId=text(row.purchase_id)
    if(!leadId||purchasedLeadIds.has(leadId))continue
    const existing=latestByLead.get(leadId)
    if(!existing){
      latestByLead.set(leadId,{...row,attemptCount:1})
      continue
    }
    const nextDate=new Date(row.created_at).getTime()
    const currentDate=new Date(existing.created_at).getTime()
    if(nextDate>currentDate){
      latestByLead.set(leadId,{...row,attemptCount:existing.attemptCount+1})
    }else{
      existing.attemptCount+=1
    }
  }
  return [...latestByLead.values()]
}

export function buildWalletHistory(history={}){
  const leadRows=(Array.isArray(history.leadPurchases)?history.leadPurchases:[]).map(normalizeLeadPurchase)
  const combined=(Array.isArray(history.combined)?history.combined:[]).map(normalizeCombined)
  const leadPaymentIds=new Set(leadRows.map(x=>text(x.payment_id)).filter(Boolean))
  const purchasedLeadIds=new Set(leadRows.map(x=>text(x.lead_id)).filter(Boolean))
  const leadAttemptRows=combined.filter(x=>x.source==='direct'&&lower(x.purchase_type)==='lead')
  const leadAttemptPaymentIds=new Set(leadAttemptRows.map(x=>text(x.payment_id)).filter(Boolean))
  const collapsedAttempts=collapseLeadAttempts(leadAttemptRows,purchasedLeadIds)

  const suppressMovement=row=>{
    const paymentId=text(row.payment_id)
    if(row.source==='direct'&&lower(row.purchase_type)==='lead')return true
    if(row.source==='wallet'&&lower(row.type)==='debit'){
      return (paymentId&&leadPaymentIds.has(paymentId))||(paymentId&&leadAttemptPaymentIds.has(paymentId))
    }
    return false
  }

  const wallet=combined.filter(x=>x.source==='wallet')
  const all=[
    ...combined.filter(x=>!suppressMovement(x)),
    ...collapsedAttempts,
    ...leadRows
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))

  return{all,wallet,lead:leadRows}
}
