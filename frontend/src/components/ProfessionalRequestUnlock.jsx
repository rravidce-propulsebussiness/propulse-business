import {useEffect,useState} from 'react'
import {authRequest} from '../utils/auth'
import PaymentMethodSelector from './PaymentMethodSelector'
import PaymentProofPicker from './PaymentProofPicker'
import {paymentProofError} from './paymentProofValidation'
import {loadPaymentOptions,runRazorpayCheckout} from '../utils/paymentGateway'
import './ProfessionalRequestUnlock.css'

const rupees=value=>`₹${Number(value||0).toLocaleString('en-IN')}`

export default function ProfessionalRequestUnlock({kind,item,onUnlocked}){
  const access=item?.access||{}
  const [options,setOptions]=useState(null)
  const [accounts,setAccounts]=useState([])
  const [mode,setMode]=useState('')
  const [busy,setBusy]=useState(false)
  const [checkout,setCheckout]=useState(null)
  const [reference,setReference]=useState('')
  const [proof,setProof]=useState(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  useEffect(()=>{
    if(access.unlocked||access.eligibleForFree||access.canPay===false)return
    let live=true
    Promise.allSettled([loadPaymentOptions(),authRequest('/payment-receiving-details')])
      .then(([settings,receivers])=>{
        if(!live)return
        if(settings.status==='fulfilled'){
          const data=settings.value||{}
          setOptions(data)
          setMode(data.onlineEnabled===true&&data.onlineDisplayMode==='live'&&data.gatewayConfigured!==false?'online':data.offlineEnabled!==false?'offline':'')
        }
        if(receivers.status==='fulfilled'){
          const list=receivers.value?.data||receivers.value?.items||receivers.value
          setAccounts(Array.isArray(list)?list:[])
        }
      }).catch(()=>{})
    return()=>{live=false}
  },[access.unlocked,access.eligibleForFree])
  if(access.unlocked)return <div className="pru-unlocked">✓ Accepted · Customer contact unlocked</div>
  if(!access.leadId||access.status==='review_required')return <div className="pru-pending">Lead pricing or verification is pending. Contact access will be offered when the enquiry is approved.</div>
  if(access.status==='members_only')return <div className="pru-pending">Only professionals with an active Pro membership can accept this enquiry. Please activate a membership to continue.</div>
  async function accept(){
    if(busy)return
    if(!access.eligibleForFree&&!mode)return setError('Choose an available payment method to continue.')
    setBusy(true);setError('');setMessage('')
    try{
      const result=await authRequest(`/profile/request-access/${encodeURIComponent(kind)}/${item.id}/accept`,{method:'POST',idempotency:true,body:JSON.stringify({})})
      if(result.status==='unlocked'){setCheckout(null);setMessage('Enquiry accepted. Contact details are available.');onUnlocked?.();return}
      if(result.status!=='pending_payment'||!result.payment?.id)throw new Error('Unable to initialize secure lead checkout')
      if(result.requiresExternalPayment!==true){onUnlocked?.();return}
      setCheckout(result)
      if(mode==='online'){
        await runRazorpayCheckout({paymentId:result.payment.id,description:`Professional ${kind} enquiry #${item.id}`})
        setCheckout(null);setMessage('Payment confirmed. Customer contact unlocked.');onUnlocked?.()
      }
    }catch(e){setError(e.message||'Unable to accept this enquiry.')}
    finally{setBusy(false)}
  }
  async function submitManual(){
    if(!checkout?.payment?.id||busy)return
    if(!reference.trim())return setError('Enter your UTR / transaction reference.')
    const problem=paymentProofError(proof?.file)
    if(problem)return setError(problem)
    setBusy(true);setError('')
    try{
      await authRequest(`/payments/${checkout.payment.id}/reference`,{
        method:'POST',body:JSON.stringify({manualReference:reference.trim(),proofUrl:proof.dataUrl,notes:`Professional ${kind} enquiry #${item.id} acceptance`})
      })
      setCheckout(null);setMessage('Payment proof submitted for verification. Customer contact will unlock only after payment approval.')
      onUnlocked?.()
    }catch(e){setError(e.message||'Unable to submit your payment reference.')}
    finally{setBusy(false)}
  }
  return <div className="pru-box">
    <div className="pru-info"><span>CONTACT ACCESS</span>
      <strong>{access.eligibleForFree?(access.accessMode==='free'?'Free enquiry':'Included with Pro membership'):access.price?rupees(access.price)+' · One-time lead acceptance':'Pricing unavailable'}</strong>
      <small>{access.eligibleForFree?'Accept this assigned request free of charge.':'The full number and email unlock only after confirmed payment.'}</small>
    </div>
    {!access.eligibleForFree&&access.price&&<PaymentMethodSelector options={options} value={mode} onChange={setMode} disabled={busy} compact/>}
    {error&&<p className="pru-error" role="alert">{error}</p>}
    {message&&<p className="pru-message" role="status">{message}</p>}
    {!checkout&&<button className="pru-accept" type="button" disabled={busy||(!access.eligibleForFree&&!access.price)} onClick={accept}>
      {busy?'Processing…':access.eligibleForFree?(access.accessMode==='free'?'Accept Free':'Accept Free · Membership'):access.status==='pending_payment'?'Resume lead payment':`Accept & Pay ${rupees(access.price)}`}
    </button>}
    {checkout&&mode==='offline'&&<div className="pru-manual">
      <b>Pay remaining {rupees(checkout.externalAmount)}</b>
      {accounts.length>0?<div className="pru-bank">{accounts.map(account=><p key={account.id||account.upi_id||account.upiId}><strong>{account.label}</strong>
        {account.upi_id||account.upiId?<span>UPI: {account.upi_id||account.upiId}</span>:null}
        {account.bank_name||account.bankName?<span>{account.bank_name||account.bankName}</span>:null}
        {account.account_number||account.accountNumber?<span>A/C: {account.account_number||account.accountNumber}</span>:null}
        {account.ifsc_code||account.ifscCode?<span>IFSC: {account.ifsc_code||account.ifscCode}</span>:null}
      </p>)}</div>:<p>Contact ProPulse support for the configured transfer details.</p>}
      <label>UTR / transaction reference<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={120} placeholder="Bank or UPI reference" /></label>
      <PaymentProofPicker id={`pru-proof-${kind}-${item.id}`} value={proof} onChange={setProof} onError={setError}/>
      <button className="pru-accept" type="button" disabled={busy} onClick={submitManual}>{busy?'Submitting…':'Submit payment proof'}</button>
    </div>}
  </div>
}
