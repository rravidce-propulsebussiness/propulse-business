import './PaymentMethodSelector.css'

export default function PaymentMethodSelector({options,value,onChange,disabled=false,compact=false}){
  const settings=options||{}
  const onlineVisible=settings.onlineDisplayMode!=='hidden'
  const onlineLive=settings.onlineEnabled===true&&settings.onlineDisplayMode==='live'&&settings.gatewayConfigured!==false
  const offlineLive=settings.offlineEnabled!==false
  return <div className={`payment-method-selector ${compact?'compact':''}`}>
    <div className="payment-method-selector-head"><span>PAYMENT METHOD</span><small>Choose how you want to pay the remaining amount.</small></div>
    <div className="payment-method-selector-grid">
      {onlineVisible&&<button type="button" disabled={disabled||!onlineLive} className={`${value==='online'?'selected':''} ${!onlineLive?'coming-soon':''}`} onClick={()=>onlineLive&&onChange?.('online')}>
        <span className="payment-method-icon">⚡</span><div><strong>{settings.onlineLabel||'Pay Online'}</strong><small>{onlineLive?'UPI, cards, netbanking & supported methods':settings.onlineEnabled&&settings.gatewayConfigured===false?'Online payment setup is not ready yet.':settings.onlineComingSoonMessage||'Online payment is coming soon.'}</small></div>{!onlineLive&&<b>COMING SOON</b>}
      </button>}
      {offlineLive&&<button type="button" disabled={disabled} className={value==='offline'?'selected':''} onClick={()=>onChange?.('offline')}>
        <span className="payment-method-icon">₹</span><div><strong>{settings.offlineLabel||'UPI / Bank Transfer'}</strong><small>Pay manually and submit UTR / proof for verification.</small></div>
      </button>}
    </div>
    {!onlineVisible&&!offlineLive&&<div className="payment-method-unavailable">Payments are temporarily unavailable. Please contact ProPulse support.</div>}
  </div>
}
