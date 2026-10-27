import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {useLocation,useNavigate} from 'react-router-dom'
import {authRequest,getUser} from '../utils/auth'
import './ProfessionalOfferExperience.css'

function OfferArt({offer}){
  if(offer.image_url)return <img className="po-offer-art" src={offer.image_url} alt="" loading="lazy"/>
  return <div className="po-offer-illustration" aria-hidden="true">
    <svg viewBox="0 0 180 144" fill="none"><circle cx="88" cy="67" r="54" fill="#FFF5E9"/>
      <path d="M47 62h83v58H47z" fill="#E5974F"/><path d="M43 50h91v21H43z" fill="#F2B878"/>
      <path d="M82 50h13v70H82z" fill="#234665"/><path d="M43 62h91" stroke="#CF7C3A" strokeWidth="3"/>
      <path d="M89 49C71 20 52 33 64 44c6 6 25 5 25 5Zm0 0c19-29 38-16 26-5-6 6-26 5-26 5Z" fill="#F5C59C" stroke="#D48745" strokeWidth="3"/>
      <path d="m39 30 6 2m87 4 6-3m-18-14 3-5M50 106l-7 4m100-3 6 4" stroke="#E7954A" strokeWidth="3" strokeLinecap="round"/>
      <path d="m113 127 5 8 5-8-5-8z" fill="#ECC177"/>
    </svg>
  </div>
}
function OfferCard({offer,large=false,onGo,onDismiss}){
  return <article className={'po-offer-card'+(large?' large':'')}>
    <div className="po-offer-art-wrap"><OfferArt offer={offer}/></div>
    <div className="po-offer-copy">
      <span className="po-offer-kicker">{offer.eyebrow||'PROPULSE OFFERS'}</span>
      <h2>{offer.title}</h2>
      {offer.description&&<p>{offer.description}</p>}
      <div className="po-offer-cta-row">
        <button className="po-offer-cta" type="button" onClick={()=>onGo(offer)}>{offer.cta_label||'View offer'} <span aria-hidden="true">→</span></button>
        {onDismiss&&<button className="po-offer-later" type="button" onClick={()=>onDismiss(offer)}>Maybe later</button>}
      </div>
      {offer.expires_at&&<small className="po-offer-expiry">Available until {new Date(offer.expires_at).toLocaleDateString('en-IN')}</small>}
    </div>
  </article>
}
export default function ProfessionalOfferExperience(){
  const {pathname,search}=useLocation()
  const navigate=useNavigate()
  const user=getUser()
  const enabled=user?.role==='business'&&pathname==='/professionals'
  const manualOpen=new URLSearchParams(search).get('offers')==='1'
  const [offers,setOffers]=useState([])
  const [popup,setPopup]=useState(null)
  const [panel,setPanel]=useState(false)
  const [offerError,setOfferError]=useState('')
  const panelCloseRef=useRef(null)
  const prompted=useRef(false)
  const openedPopupIds=useRef(new Set())
  const userId=user?.id
  useEffect(()=>{
    if(!enabled)return undefined
    let active=true
    authRequest('/professional-offers').then(response=>{
      setOfferError('')
      if(!active)return
      const list=Array.isArray(response?.offers)?response.offers:[]
      setOffers(list)
      if(manualOpen){
        prompted.current=true
        setPopup(null)
        setPanel(true)
      }else if(!prompted.current){
        const next=list.find(o=>o.show_popup&&!openedPopupIds.current.has(o.id))
        prompted.current=true
        if(next){openedPopupIds.current.add(next.id);setPopup(next)}
      }
    }).catch(()=>{if(active){setOffers([]);setOfferError('Offers are temporarily unavailable. Please try again.');if(manualOpen){prompted.current=true;setPopup(null);setPanel(true)}}})
    return()=>{active=false}
  },[enabled,userId,manualOpen])
  useEffect(()=>{
    if(!popup)return undefined
    const key=e=>{if(e.key==='Escape')dismiss(popup)}
    window.addEventListener('keydown',key)
    return()=>window.removeEventListener('keydown',key)
  },[popup])
  useEffect(()=>{
    if(!popup)return
    // Record the impression when the popup is actually displayed.
    authRequest('/professional-offers/'+popup.id+'/seen',{method:'POST'}).catch(()=>{})
  },[popup?.id])
  useEffect(()=>{
    if(!panel)return undefined
    const previousFocus=document.activeElement
    const frame=requestAnimationFrame(()=>panelCloseRef.current?.focus())
    const onEscape=e=>{if(e.key==='Escape')closePanel()}
    window.addEventListener('keydown',onEscape)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',onEscape);previousFocus?.focus?.()}
  },[panel])
  useEffect(()=>{
    if(!panel&&!popup)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return()=>{document.body.style.overflow=previous}
  },[panel,popup])
  function closePanel(){setPanel(false);if(manualOpen)navigate('/professionals',{replace:true,preventScrollReset:true})}
  function dismiss(item){
    setPopup(null)
    authRequest('/professional-offers/'+item.id+'/dismiss',{method:'POST'}).catch(()=>{})
  }
  function go(item){
    setPopup(null);closePanel()
    authRequest('/professional-offers/'+item.id+'/click',{method:'POST'}).catch(()=>{})
    navigate(item.cta_path)
  }
  if(!enabled)return null
  const banner=offers.find(item=>item.display_mode!=='popup')
  return <>
    {banner&&(!popup||popup.id!==banner.id)&&<div className="po-dashboard-banner" role="complementary" aria-label="Professional offer">
      <span className="po-banner-symbol" aria-hidden="true">✦</span>
      <div><strong>{banner.title}</strong><span>{banner.description}</span></div>
      <button type="button" onClick={()=>go(banner)}>{banner.cta_label} <span aria-hidden="true">→</span></button>
      <button type="button" className="po-banner-all" onClick={()=>setPanel(true)}>All offers</button>
    </div>}
    {popup&&createPortal(<div className="po-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)dismiss(popup)}}>
      <section className="po-modal" role="dialog" aria-modal="true" aria-label="Professional special offer">
        <button className="po-modal-close" type="button" aria-label="Close offer" onClick={()=>dismiss(popup)}>×</button>
        <OfferCard offer={popup} large onGo={go} onDismiss={dismiss}/>
      </section>
    </div>,document.body)}
    {panel&&createPortal(<div className="po-modal-backdrop po-panel-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closePanel()}}>
      <section className={'po-offer-drawer'+(offers.length===0?' is-empty':'')} role="dialog" aria-modal="true" aria-labelledby="po-offer-panel-title">
        <div className="po-drawer-header">
          <div><small>YOUR PROPULSE BENEFITS</small>
            <h2 id="po-offer-panel-title">Offers & announcements</h2>
            <p>Exclusive opportunities for your professional account.</p>
          </div>
          <button ref={panelCloseRef} type="button" onClick={closePanel} aria-label="Close offers and return to dashboard">×</button>
        </div>
        {offerError?<div className="po-drawer-empty" role="status"><div className="po-empty-symbol" aria-hidden="true">!</div>
            <strong>Unable to load offers</strong><p>{offerError}</p>
            <button type="button" onClick={closePanel}>Back to dashboard</button>
          </div>:offers.length?<div className="po-drawer-list">{offers.map(offer=><OfferCard key={offer.id} offer={offer} onGo={go}/>)}</div>
          :<div className="po-drawer-empty" role="status">
            <div className="po-empty-symbol" aria-hidden="true">✦</div>
            <strong>You're all caught up!</strong>
            <p>No active offers for your account right now. New promotions will appear here when available.</p>
            <button type="button" onClick={closePanel}>Back to dashboard</button>
          </div>}
      </section>
    </div>,document.body)}
  </>
}
