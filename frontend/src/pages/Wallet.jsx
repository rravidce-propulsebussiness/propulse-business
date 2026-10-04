import { useEffect, useMemo, useState } from 'react'
import UserHeader from '../components/UserHeader'
import MembershipPayments from '../components/MembershipPayments'
import PaymentMethodSelector from '../components/PaymentMethodSelector'
import { loadPaymentOptions, runRazorpayCheckout } from '../utils/paymentGateway'
import { authRequest } from '../utils/auth'
import { downloadCsv } from '../utils/csv'
import { buildWalletHistory, leadPaymentSplit, transactionTitle } from '../utils/walletHistory'
import './WalletV2.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const date=v=>new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})
const statusLabel=x=>x.status==='pending'?'Pending approval':x.status==='paid'?'Approved':x.status==='rejected'?'Rejected':x.status==='failed'?'Failed':x.status==='cancelled'?'Cancelled':x.status==='refunded'?'Refunded':x.status||'Completed'
const statusClass=x=>x.status==='pending'?'pending':x.status==='rejected'||x.status==='failed'||x.status==='cancelled'?'rejected':x.status==='refunded'?'refunded':'approved'
const isActualDebit=x=>x.type==='debit'
const amountPrefix=x=>isActualDebit(x)?'−':x.type==='credit'||x.type==='refund'?'+':''
const amountClass=x=>isActualDebit(x)?'debit':x.type==='credit'||x.type==='refund'?'credit':'neutral'

const offerTitle=offer=>{
  if(offer?.benefit_type==='wallet_bonus'){
    return offer.reward_value_type==='percent'
      ?`${Number(offer.reward_value||0)}% extra wallet balance`
      :`${money(offer.reward_value)} bonus wallet balance`
  }
  if(offer?.benefit_type==='lead_bonus'){
    const qty=Number(offer.bonus_lead_quantity||0)
    return `+${qty} ${offer.bonus_lead_type==='premium'?'Premium':'Basic'} lead${qty===1?'':'s'}`
  }
  return offer?.discount_type==='percent'
    ?`${Number(offer?.discount_value||0)}% off`
    :`${money(offer?.discount_value)} off`
}

const walletOfferPreview=offer=>{
  const minimum=Math.max(0,Number(offer?.min_order_amount||0))
  if(offer?.benefit_type==='wallet_bonus'){
    const reward=offer.reward_value_type==='percent'
      ?minimum*Number(offer.reward_value||0)/100
      :Number(offer.reward_value||0)
    return minimum>0?`Add ${money(minimum)} → receive ${money(minimum+reward)}`:offerTitle(offer)
  }
  return minimum>0?`Minimum top-up ${money(minimum)}`:'Available on wallet top-up'
}

export default function Wallet(){
  const [wallet,setWallet]=useState(null)
  const [history,setHistory]=useState({combined:[],leadPurchases:[]})
  const [historyPage,setHistoryPage]=useState(1)
  const [historyHasMore,setHistoryHasMore]=useState(false)
  const [historyLoadingMore,setHistoryLoadingMore]=useState(false)
  const [pendingTopupCount,setPendingTopupCount]=useState(0)
  const [receiving,setReceiving]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [amount,setAmount]=useState('')
  const [reference,setReference]=useState('')
  const [proof,setProof]=useState(null)
  const [submitting,setSubmitting]=useState(false)
  const [message,setMessage]=useState('')
  const [showAdd,setShowAdd]=useState(()=>new URLSearchParams(window.location.search).get('add')==='1')
  const [selected,setSelected]=useState(null)
  const [tab,setTab]=useState(()=>new URLSearchParams(window.location.search).get('tab')||'all')
  const [publicOffers,setPublicOffers]=useState([])
  const [offersLoading,setOffersLoading]=useState(false)
  const [couponCode,setCouponCode]=useState('')
  const [couponStatus,setCouponStatus]=useState({type:'',text:''})
  const [appliedCoupon,setAppliedCoupon]=useState(null)
  const [couponChecking,setCouponChecking]=useState(false)
  const [paymentOptions,setPaymentOptions]=useState({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon'})
  const [paymentMode,setPaymentMode]=useState('offline')

  const load=async({silent=false}={})=>{
    if(!silent)setLoading(true)
    setError('')
    try{
      const [w,h,t,r,options]=await Promise.all([
        authRequest('/wallet?summary=1'),
        authRequest('/wallet/history?page=1&limit=50'),
        authRequest('/wallet/topups/history?summary=1'),
        authRequest('/payment-receiving-details'),
        loadPaymentOptions().catch(()=>({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon'}))
      ])
      setWallet(w)
      setHistory({combined:Array.isArray(h?.combined)?h.combined:[],leadPurchases:Array.isArray(h?.leadPurchases)?h.leadPurchases:[]})
      setHistoryPage(Number(h?.page||1))
      setHistoryHasMore(Boolean(h?.has_more))
      setPendingTopupCount(Number(t?.pending_count||0))
      setReceiving(Array.isArray(r)?r:[])
      setPaymentOptions(options||{})
      setPaymentMode(current=>current||(options?.onlineEnabled&&options?.onlineDisplayMode==='live'?'online':options?.offlineEnabled!==false?'offline':''))
    }catch(e){
      if(!silent)setError(e.message||'Failed to load wallet')
    }finally{
      if(!silent)setLoading(false)
    }
  }

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')load({silent:true})}
    const timer=setInterval(refresh,60000)
    document.addEventListener('visibilitychange',refresh)
    window.addEventListener('focus',refresh)
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh)}
  },[])

  useEffect(()=>{
    if(!showAdd)return
    let active=true
    queueMicrotask(()=>{
      if(!active)return
      setOffersLoading(true)
      authRequest('/coupons/offers?purchaseType=wallet_topup')
        .then(data=>{if(active)setPublicOffers(Array.isArray(data)?data:[])})
        .catch(()=>{if(active)setPublicOffers([])})
        .finally(()=>{if(active)setOffersLoading(false)})
    })
    return()=>{active=false}
  },[showAdd])

  const numericAmount=Number(amount)
  const validAmount=Number.isFinite(numericAmount)&&numericAmount>0
  const discount=appliedCoupon&&validAmount?Math.min(Number(appliedCoupon.discountAmount)||0,numericAmount):0
  const bonus=appliedCoupon?.reward?.type==='wallet_bonus'&&validAmount?Math.max(0,Number(appliedCoupon.reward.amount)||0):0
  const payable=appliedCoupon&&validAmount?Math.max(0,Number(appliedCoupon.finalAmount??numericAmount-discount)||0):(validAmount?numericAmount:0)
  const walletCredit=validAmount?numericAmount+bonus:0
  const fullyDiscounted=Boolean(appliedCoupon&&validAmount&&payable===0)

  const resetAppliedCoupon=()=>{
    setAppliedCoupon(null)
    setCouponStatus({type:'',text:''})
  }

  const applyCoupon=async(codeOverride=couponCode)=>{
    const code=String(codeOverride||'').trim().toUpperCase()
    if(!validAmount){
      setCouponStatus({type:'error',text:'Enter the wallet amount first.'})
      return
    }
    if(!code){
      resetAppliedCoupon()
      setCouponStatus({type:'error',text:'Enter or select a promotion code first.'})
      return
    }
    setCouponChecking(true)
    setCouponStatus({type:'',text:''})
    try{
      const data=await authRequest('/coupons/validate',{
        method:'POST',
        body:JSON.stringify({code,subtotal:numericAmount,purchaseType:'wallet_topup'})
      })
      const next={
        code,
        discountAmount:Number(data.discountAmount)||0,
        finalAmount:Number(data.finalAmount)||0,
        reward:data.reward||null,
        benefit:data.benefit||null
      }
      setAppliedCoupon(next)
      setCouponCode(code)
      const nextBonus=next.reward?.type==='wallet_bonus'?Number(next.reward.amount||0):0
      setCouponStatus({
        type:'success',
        text:nextBonus>0
          ?`${code} applied — pay ${money(next.finalAmount)} and receive ${money(numericAmount+nextBonus)} in your wallet after approval.`
          :next.finalAmount===0
            ?`${code} applied — 100% off. Pay ₹0.00 and receive ${money(numericAmount)} immediately.`
            :`${code} applied — ${money(next.discountAmount)} off. Pay ${money(next.finalAmount)} and receive ${money(numericAmount)} after approval.`
      })
    }catch(e){
      setAppliedCoupon(null)
      setCouponStatus({type:'error',text:e?.message||'Promotion could not be applied.'})
    }finally{
      setCouponChecking(false)
    }
  }

  const chooseOffer=offer=>{
    const code=String(offer?.code||'').toUpperCase()
    const minimum=Math.max(0,Number(offer?.min_order_amount||0))
    setCouponCode(code)
    setAppliedCoupon(null)
    if(minimum>0&&(!validAmount||numericAmount<minimum)){
      setCouponStatus({type:'',text:`Enter at least ${money(minimum)}, then apply ${code}.`})
      return
    }
    setCouponStatus({type:'',text:`${code} selected. Checking eligibility…`})
    applyCoupon(code)
  }

  const loadMoreHistory=async()=>{
    if(historyLoadingMore||!historyHasMore)return
    setHistoryLoadingMore(true)
    setError('')
    try{
      const next=historyPage+1
      const h=await authRequest(`/wallet/history?page=${next}&limit=50`)
      setHistory(prev=>({
        combined:[...prev.combined,...(Array.isArray(h?.combined)?h.combined:[])],
        leadPurchases:[...prev.leadPurchases,...(Array.isArray(h?.leadPurchases)?h.leadPurchases:[])]
      }))
      setHistoryPage(Number(h?.page||next))
      setHistoryHasMore(Boolean(h?.has_more))
    }catch(e){
      setError(e.message||'Failed to load more wallet history')
    }finally{
      setHistoryLoadingMore(false)
    }
  }

  const submit=async e=>{
    e.preventDefault()
    setError('')
    setMessage('')
    if(!validAmount)return setError('Enter a valid top-up amount.')
    const code=String(couponCode||'').trim()
    if(!fullyDiscounted&&paymentMode==='offline'&&!reference.trim())return setError('Enter your payment reference / UTR.')
    if(!fullyDiscounted&&!paymentMode)return setError('No payment method is currently available.')
    if(paymentMode==='offline'&&proof&&proof.size>5*1024*1024)return setError('Payment proof must be 5 MB or smaller.')
    try{
      setSubmitting(true)
      let proofUrl=null
      if(paymentMode==='offline'&&proof)proofUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader()
        reader.onload=()=>resolve(String(reader.result))
        reader.onerror=()=>reject(new Error('Unable to read proof'))
        reader.readAsDataURL(proof)
      })
      const result=paymentMode==='online'&&!fullyDiscounted
        ?await authRequest('/wallet/topups/gateway',{method:'POST',idempotency:true,body:JSON.stringify({amount:numericAmount,...(code?{couponCode:code}:{})})})
        :await authRequest('/wallet/topups',{
          method:'POST',
          idempotency:true,
          body:JSON.stringify({
            amount:numericAmount,
            reference:reference.trim()||null,
            proof_url:proofUrl,
            ...(code?{couponCode:code}:{})
          })
        })
      if(paymentMode==='online'&&result?.checkout){
        await runRazorpayCheckout({paymentId:result.payment_id,checkout:result.checkout,description:'ProPulse wallet top-up'})
      }
      setAmount('')
      setReference('')
      setProof(null)
      setCouponCode('')
      setAppliedCoupon(null)
      setCouponStatus({type:'',text:''})
      const input=document.getElementById('wallet-proof')
      if(input)input.value=''
      setShowAdd(false)
      const reward=result?.coupon?.reward
      const rewardMessage=reward?.type==='wallet_bonus'? ` After approval, your wallet will also receive a ${money(reward.amount)} promotional bonus.`:''
      setMessage(fullyDiscounted?'100% coupon applied. Wallet balance was credited immediately.':paymentMode==='online'?`Online payment completed. ${money(walletCredit)} was added to your wallet.`:`Balance request submitted. Your wallet will update after approval.${rewardMessage}`)
      await load()
    }catch(e){
      setError(e.message||'Failed to submit top-up')
    }finally{
      setSubmitting(false)
    }
  }

  const closeAdd=()=>{
    if(submitting)return
    setShowAdd(false)
    if(window.location.search)window.history.replaceState({},'',window.location.pathname)
  }

  const pendingTopups=Array.from({length:pendingTopupCount})
  const historyViews=useMemo(()=>buildWalletHistory(history),[history])
  const visible=tab==='membership'?[]:(historyViews[tab]||historyViews.all)
  const downloadHistory=()=>{
    const rows=visible.map(x=>[
      x.historyKind||x.source,
      x.displayTitle||transactionTitle(x),
      x.lead_id?`Lead #${x.lead_id}`:x.purchase_type==='lead'&&x.purchase_id?`Lead #${x.purchase_id}`:'',
      date(x.created_at),
      `${amountPrefix(x)}${money(x.amount)}`,
      x.status||'',
      x.balance_after==null?'':money(x.balance_after),
      x.wallet_amount?money(x.wallet_amount):'',
      x.external_amount?money(x.external_amount):'',
      x.manual_reference||'',
      x.attemptCount||''
    ])
    downloadCsv(`propulse-wallet-${tab}-history.csv`,[['Category','Transaction','Lead','Date','Amount','Status','Balance After','Wallet Portion','Direct Portion','Reference','Attempts'],...rows])
  }
  const tabLabel={all:'All Transactions',wallet:'Wallet Transactions',lead:'Lead Purchase History',membership:'Membership Activity'}[tab]

  return <div className="wallet-page">
    <UserHeader/>
    <main className="wallet-main">
      {error&&<div className="wallet-alert error">{error}</div>}
      {message&&<div className="wallet-alert success">{message}</div>}
      {loading?<div className="wallet-state">Loading wallet…</div>:<>
        <section className="wallet-summary-grid">
          <article className="wallet-summary-card balance"><div className="wallet-summary-icon">▣</div><div><small>AVAILABLE BALANCE</small><strong>{money(wallet?.balance)}</strong></div></article>
          <article className="wallet-summary-card add"><div className="wallet-summary-icon">+</div><div><small>ADD BALANCE</small><strong>Fund your wallet</strong><p>Top up your wallet to buy leads.</p><button className="wallet-add-button" onClick={()=>setShowAdd(true)}>Add Balance</button></div></article>
          <article className="wallet-summary-card pending"><div className="wallet-summary-icon">◷</div><div><small>PENDING REQUESTS</small><strong>{pendingTopups.length}</strong><p>Top-up requests awaiting approval</p></div></article>
        </section>

        <section className="wallet-tabs" aria-label="Wallet history filters">
          <button className={tab==='all'?'active':''} onClick={()=>setTab('all')}><span>▦</span><div><strong>ALL</strong><small>Wallet + Lead Purchase</small></div></button>
          <button className={tab==='wallet'?'active':''} onClick={()=>setTab('wallet')}><span>▣</span><div><strong>WALLET</strong><small>Credits, Debits, Refunds</small></div></button>
          <button className={tab==='lead'?'active':''} onClick={()=>setTab('lead')}><span>🛒</span><div><strong>LEAD PURCHASE</strong><small>All lead purchases</small></div></button>
          <button className={tab==='membership'?'active':''} onClick={()=>setTab('membership')}><span>◆</span><div><strong>MEMBERSHIP</strong><small>Plans & payments</small></div></button>
        </section>

        {tab==='membership'?<MembershipPayments/>:<section className="wallet-history-premium">
          <div className="wallet-history-heading"><div><span>TRANSACTION HISTORY</span><h2>{tabLabel}</h2><p>{tab==='all'?'View all your wallet and lead purchase transactions':tab==='wallet'?'View wallet credits, debits and refunds':'View every lead purchase and its payment split'}</p></div><button className="wallet-download" onClick={downloadHistory}>⇩ Download History</button></div>
          {!visible.length?<div className="wallet-empty wallet-empty-premium"><div className="wallet-empty-icon">▤</div><strong>No transactions yet</strong><p>Your {tab==='lead'?'lead purchase':'transaction'} history will appear here once you add balance or purchase leads.</p><button onClick={()=>setShowAdd(true)}>▣ Add Balance Now</button></div>:<div className="wallet-history-list">{visible.map((x,index)=><button type="button" className="wallet-history-item" key={`${x.id}-${index}`} onClick={()=>setSelected(x)}><div className={`wallet-history-icon ${x.source==='direct'?'direct':x.type==='debit'?'debit':x.type==='refund'?'refund':'credit'}`}>{x.source==='direct'?'↗':x.type==='debit'?'−':x.type==='refund'?'↩':'+'}</div><div className="wallet-history-copy"><b>{x.displayTitle||transactionTitle(x)}</b><small>{date(x.created_at)} · {x.historyKind||x.source}</small>{x.attemptCount>1&&<small>{x.attemptCount} payment attempts · latest {statusLabel(x).toLowerCase()}</small>}{x.source==='direct'&&x.manual_reference&&<small>UTR: {x.manual_reference}</small>}{x.source==='lead'&&x.leadContext&&<small>{x.leadContext}</small>}{x.source==='lead'&&leadPaymentSplit(x,money)&&<small>{leadPaymentSplit(x,money)}</small>}</div><div className="wallet-history-amount"><strong className={amountClass(x)}>{amountPrefix(x)}{money(x.amount)}</strong>{x.source==='direct'&&<em className={`topup-pill ${statusClass(x)}`}>{statusLabel(x)}</em>}{x.balance_after!=null&&<small>Bal. {money(x.balance_after)}</small>}</div></button>)}</div>}
          {historyHasMore&&<div className="wallet-history-more"><button type="button" onClick={loadMoreHistory} disabled={historyLoadingMore}>{historyLoadingMore?'Loading…':'Load older transactions'}</button></div>}
        </section>}
      </>}
    </main>

    {showAdd&&<div className="wallet-modal-backdrop" onClick={closeAdd}><section className="wallet-detail-modal wallet-add-modal" onClick={e=>e.stopPropagation()}>
      <button className="wallet-modal-close" onClick={closeAdd}>×</button>
      <span className="wallet-modal-kicker">ADD BALANCE</span>
      <h2>Fund your Propulse wallet</h2>
      <p className="wallet-modal-subtitle">Choose an available payment method. Online payments credit automatically after verification; manual payments use UTR review.</p>

      <section className="wallet-public-offers">
        <div className="wallet-public-offers-head"><div><span>AVAILABLE OFFERS</span><strong>Get more from your top-up</strong></div><small>Eligible offers for your account</small></div>
        <div className="wallet-public-offer-list">
          {offersLoading?<span className="wallet-offer-loading">Checking offers…</span>:!publicOffers.length?<span className="wallet-offer-empty">No public wallet offers are active for your account right now.</span>:publicOffers.map(offer=>{
            const minimum=Math.max(0,Number(offer.min_order_amount||0))
            return <button type="button" className={`wallet-public-offer-card ${couponCode===String(offer.code||'').toUpperCase()?'selected':''}`} key={offer.id||offer.code} onClick={()=>chooseOffer(offer)}>
              <span className="wallet-public-offer-icon">{offer.benefit_type==='wallet_bonus'?'₹+':'%'}</span>
              <span className="wallet-public-offer-copy"><b>{walletOfferPreview(offer)}</b><small>{offer.description||offerTitle(offer)}</small>{minimum>0&&<em>Minimum {money(minimum)}</em>}</span>
              <strong>Use offer</strong>
            </button>
          })}
        </div>
      </section>

      {!fullyDiscounted&&<PaymentMethodSelector options={paymentOptions} value={paymentMode} onChange={setPaymentMode} disabled={submitting}/>}\n      {paymentMode==='offline'&&receiving.length>0?<div className="wallet-receiving-list">{receiving.map(x=><div className="wallet-receiving-card" key={x.id}><div className="wallet-receiving-head"><b>{x.label}</b><span>{x.method_type==='both'?'UPI + BANK':x.method_type.toUpperCase()}</span></div><div className="wallet-receiving-grid">{x.account_name&&<div><small>ACCOUNT NAME</small><strong>{x.account_name}</strong></div>}{x.upi_id&&<div><small>UPI ID</small><strong>{x.upi_id}</strong></div>}{x.bank_name&&<div><small>BANK</small><strong>{x.bank_name}</strong></div>}{x.account_number&&<div><small>ACCOUNT NUMBER</small><strong>{x.account_number}</strong></div>}{x.ifsc_code&&<div><small>IFSC</small><strong>{x.ifsc_code}</strong></div>}{x.branch_name&&<div><small>BRANCH</small><strong>{x.branch_name}</strong></div>}</div>{x.qr_code&&<img className="wallet-receiving-qr" src={x.qr_code} alt="Payment QR code"/>}{x.instructions&&<p>{x.instructions}</p>}</div>)}</div>:paymentMode==='offline'?<div className="wallet-method"><b>UPI / BANK TRANSFER</b><span>Payment details are not configured yet. Please contact Propulse support.</span></div>:null}

      <form onSubmit={submit}>
        <label>Amount<input type="number" min="1" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);resetAppliedCoupon()}} placeholder="e.g. 1000" autoFocus/></label>
        <label className="wallet-coupon-field"><span>Promotion / coupon code <small>Optional</small></span><div className="wallet-coupon-input-row"><input type="text" maxLength={50} autoComplete="off" value={couponCode} onChange={e=>{setCouponCode(e.target.value.toUpperCase());resetAppliedCoupon()}} placeholder="Enter offer code"/><button type="button" className="wallet-coupon-apply" disabled={couponChecking} onClick={()=>applyCoupon()}>{couponChecking?'Checking…':'Apply'}</button></div><small>Public offers can be selected above. Private codes can still be entered here.</small>{couponStatus.text&&<span className={`wallet-coupon-status ${couponStatus.type}`} aria-live="polite">{couponStatus.text}</span>}</label>

        <div className="wallet-coupon-summary">
          <div><span>Wallet credit</span><strong>{money(walletCredit)}</strong></div>
          <div><span>Promotion benefit</span><strong>{bonus>0?`+${money(bonus)} bonus`:discount>0?`−${money(discount)} discount`:'₹0.00'}</strong></div>
          <div className="wallet-coupon-pay-row"><span>AMOUNT TO PAY NOW</span><strong className="wallet-coupon-pay">{money(payable)}</strong></div>
          <small>{fullyDiscounted?`100% discount applied. ${money(walletCredit)} will be credited immediately; no UTR or proof is required.`:bonus>0?`Pay ${money(payable)}. After approval, ${money(walletCredit)} will be credited including ${money(bonus)} promotional balance.`:'After approval, the wallet amount shown above will be credited to your balance.'}</small>
        </div>

        {!fullyDiscounted&&paymentMode==='offline'&&<label>Payment reference / UTR<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Enter transaction ID / UTR"/></label>}
        {!fullyDiscounted&&paymentMode==='offline'&&<label>Payment proof <small>Optional, max 5 MB</small><input id="wallet-proof" type="file" accept="image/*,.pdf" onChange={e=>setProof(e.target.files?.[0]||null)}/></label>}
        <button className="wallet-primary" disabled={submitting||(!fullyDiscounted&&!paymentMode)}>{submitting?'Processing…':fullyDiscounted?'Add to wallet for ₹0':paymentMode==='online'?`Pay ${money(payable)} Online`:'Submit balance request'} <span>→</span></button>
      </form>
    </section></div>}

    {selected&&<div className="wallet-modal-backdrop" onClick={()=>setSelected(null)}><section className="wallet-detail-modal" onClick={e=>e.stopPropagation()}><button className="wallet-modal-close" onClick={()=>setSelected(null)}>×</button><span className="wallet-modal-kicker">{selected.source==='direct'?'DIRECT PAYMENT':selected.source==='lead'?'LEAD PURCHASE':'WALLET TRANSACTION'}</span><h2>{selected.displayTitle||transactionTitle(selected)}</h2><div className="wallet-detail-status"><span className={`topup-pill ${statusClass(selected)}`}>{selected.source==='wallet'?(selected.type||'Completed'):statusLabel(selected)}</span><strong className={amountClass(selected)}>{amountPrefix(selected)}{money(selected.amount)}</strong></div><div className="wallet-detail-grid"><div><small>DATE</small><b>{date(selected.created_at)}</b></div>{selected.payment_id&&<div><small>PAYMENT</small><b>#{selected.payment_id}</b></div>}{selected.manual_reference&&<div><small>UTR / REFERENCE</small><b>{selected.manual_reference}</b></div>}{selected.attemptCount>1&&<div><small>PAYMENT ATTEMPTS</small><b>{selected.attemptCount}</b></div>}{selected.leadContext&&<div><small>LEAD DETAILS</small><b>{selected.leadContext}</b></div>}{selected.purchase_type&&<div><small>PURCHASE TYPE</small><b>{selected.purchase_type}</b></div>}{selected.reference_type&&<div><small>TYPE</small><b>{selected.reference_type}</b></div>}{selected.wallet_amount!==undefined&&<div><small>WALLET PORTION</small><b>{money(selected.wallet_amount)}</b></div>}{selected.external_amount!==undefined&&<div><small>DIRECT PORTION</small><b>{money(selected.external_amount)}</b></div>}{selected.balance_after!==undefined&&<div><small>BALANCE AFTER</small><b>{money(selected.balance_after)}</b></div>}{selected.status&&<div><small>STATUS</small><b>{statusLabel(selected)}</b></div>}</div><button className="wallet-modal-action" onClick={()=>setSelected(null)}>Done</button></section></div>}
  </div>
}
