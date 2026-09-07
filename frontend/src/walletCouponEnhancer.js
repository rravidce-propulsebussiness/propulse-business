function enhanceWalletCoupon(modal){
  if(!modal||modal.dataset.walletCouponReady==='true')return
  const form=modal.querySelector('form')
  if(!form)return
  modal.dataset.walletCouponReady='true'
  const label=document.createElement('label')
  label.className='wallet-coupon-field'
  label.innerHTML='<span>Coupon code <small>Optional</small></span><input id="wallet-coupon-code" type="text" maxlength="50" autocomplete="off" placeholder="Enter coupon code"><small>Coupon reduces what you pay; the full top-up amount is credited after approval.</small>'
  const amountInput=form.querySelector('input[type="number"]')
  const amountLabel=amountInput?.closest('label')
  if(amountLabel)amountLabel.after(label)
  else form.prepend(label)
}

function patchWalletTopupRequest(){
  if(window.__propulseWalletCouponFetchPatched)return
  window.__propulseWalletCouponFetchPatched=true
  const originalFetch=window.fetch.bind(window)
  window.fetch=(input,init={})=>{
    try{
      const url=typeof input==='string'?input:(input?.url||'')
      if(/\/api\/wallet\/topups(?:\?|$)/.test(url)&&init?.body){
        const coupon=String(document.querySelector('#wallet-coupon-code')?.value||'').trim()
        if(coupon){const body=JSON.parse(init.body);if(body&&!body.couponCode){body.couponCode=coupon;init={...init,body:JSON.stringify(body)}}}
      }
    }catch{}
    return originalFetch(input,init)
  }
}

function scan(){
  document.querySelectorAll('.wallet-add-modal').forEach(enhanceWalletCoupon)
  patchWalletTopupRequest()
}

const style=document.createElement('style')
style.textContent='.wallet-coupon-field{display:flex;flex-direction:column;gap:5px}.wallet-coupon-field span{font-size:11px;font-weight:800;color:#173b70}.wallet-coupon-field span small{font-weight:500;color:#7b8ba0}.wallet-coupon-field input{height:42px;border:1px solid #d6e0eb;border-radius:9px;padding:0 11px;color:#173b70;font-size:12px;font-weight:800;text-transform:uppercase;outline:0}.wallet-coupon-field>small{font-size:9px;color:#7b8ba0;line-height:1.4}'
document.head.appendChild(style)

const observer=new MutationObserver(scan)
observer.observe(document.body,{childList:true,subtree:true})
scan()
