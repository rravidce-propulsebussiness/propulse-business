import BootLoader from '../components/BootLoader'
import {useEffect,useMemo,useState} from 'react'
import {Link,useParams,useSearchParams} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {formatPublishedPackagePrice} from '../utils/packagePricing'
import {calculateProfessionalPackageQuote} from '../utils/professionalPackageQuote'
import {downloadProfessionalPackageQuotePdf} from '../utils/requirementQuotePdf'
import ProfessionalCallbackRequirementForm,{emptyProfessionalCallback} from '../components/ProfessionalCallbackRequirementForm'
import './ProfessionalPackageQuote.css'

const supportedUnit=unit=>['sqft','sqyd','project'].includes(unit)

/** A package-specific estimate using only the chosen professional's published rate.
 * It intentionally does not reuse the generic marketplace price catalogue.
 */
export default function ProfessionalPackageQuote(){
  const {expertId}=useParams()
  const [searchParams]=useSearchParams()
  const chosenId=searchParams.get('package')||''
  const [profile,setProfile]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [area,setArea]=useState('')
  const [quotation,setQuotation]=useState(null)
  const [quoteError,setQuoteError]=useState('')
  const [downloadBusy,setDownloadBusy]=useState(false)
  const [callback,setCallback]=useState(emptyProfessionalCallback)
  const [callbackSending,setCallbackSending]=useState(false)
  const [callbackSuccess,setCallbackSuccess]=useState(false)
  const [callbackError,setCallbackError]=useState('')

  useEffect(()=>{
    let active=true
    const controller=new AbortController()
    setLoading(true)
    setError('')
    setProfile(null)
    publicRequest('/experts/'+encodeURIComponent(expertId),{signal:controller.signal,timeoutMs:12000})
      .then(data=>{if(active)setProfile(data)})
      .catch(err=>{if(active)setError(err?.message||'This professional is unavailable.')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false;controller.abort()}
  },[expertId])

  const plans=useMemo(()=>Array.isArray(profile?.service_plans)
    ?profile.service_plans.filter(plan=>plan?.title&&supportedUnit(plan.price_unit)&&Number(plan.price_from)>0)
    :[],[profile])
  const plan=plans.find(item=>String(item.id)===chosenId)
    ||plans.find(item=>item.title.trim().toLowerCase()===chosenId.trim().toLowerCase())
    ||(!chosenId?plans[0]:null)
  const needsArea=plan?.price_unit==='sqft'||plan?.price_unit==='sqyd'
  const industry=plan?.industry||'construction'

  useEffect(()=>{
    setQuotation(null)
    setQuoteError('')
    setArea('')
    setCallback(emptyProfessionalCallback)
    setCallbackSuccess(false)
    setCallbackError('')
  },[chosenId,expertId])

  function calculate(event){
    event.preventDefault()
    const result=calculateProfessionalPackageQuote({
      packageRecord:plan,industry:plan?.industry,areaSqft:area,
      professionalName:profile?.business_name||'Published professional',
    })
    if(!result){
      setQuotation(null)
      setQuoteError('Enter a valid chargeable work area. The published package rate must be valid.')
      return
    }
    setQuoteError('')
    setQuotation(result)
  }

  async function download(){
    if(!quotation||downloadBusy)return
    setDownloadBusy(true)
    setQuoteError('')
    try{
      await downloadProfessionalPackageQuotePdf({
        quotation,
        customerName:callback.name||undefined,
        city:callback.cityName||undefined,
        phone:callback.phone||undefined,
        email:callback.email||undefined,
      })
    }catch(err){setQuoteError(err?.message||'Unable to generate the detailed quotation PDF.')}
    finally{setDownloadBusy(false)}
  }

  async function requestCallback(event){
    event.preventDefault()
    if(callbackSending||callbackSuccess||!plan)return
    setCallbackSending(true)
    setCallbackError('')
    try{
      const packageContext='Requested package: '+plan.title+(quotation?' · Indicative amount: '+quotation.amountText:'')
      await publicRequest('/experts/'+encodeURIComponent(expertId)+'/callback',{
        method:'POST',
        body:JSON.stringify({...callback,
          message:[packageContext,callback.message].filter(Boolean).join(' | '),
          marketplaceConsent:callback.consent,
        }),
      })
      setCallbackSuccess(true)
    }catch(err){setCallbackError(err?.message||'Unable to send callback request.')}
    finally{setCallbackSending(false)}
  }

  return <main className="ppq-page">
    <PublicHeader/>
    <div className="ppq-wrap">
      <nav className="ppq-breadcrumb" aria-label="Breadcrumb">
        <Link to="/experts">Professionals</Link><span>/</span>
        <Link to={'/experts/'+expertId}>{profile?.business_name||'Profile'}</Link><span>/</span>
        <span>Package quote</span>
      </nav>
      {loading?<BootLoader contained message="Loading published package prices"/>:
      error||!profile?<section className="ppq-empty" role="alert"><h1>Unable to load quotation</h1><p>{error||'Professional not found.'}</p><Link to="/experts">Browse professionals</Link></section>:
      !plans.length?<section className="ppq-empty"><h1>No packages published</h1><p>This professional has not published priced packages yet.</p><Link to={'/experts/'+expertId+'#callback'}>Request a custom quote</Link></section>:
      !plan?<section className="ppq-empty" role="alert"><h1>This package is no longer available</h1><p>Select another published package from the professional's profile.</p><Link to={'/experts/'+expertId+'#pricing'}>See published packages</Link></section>:
      <>
        <header className="ppq-hero">
          <span>PROPULSE · PROFESSIONAL PACKAGE QUOTATION</span>
          <h1>{plan.title} Quotation</h1>
          <p>{profile.business_name} · {industry==='design'?'Interior design':industry==='construction'?'Construction':'Property'} package</p>
          <strong>{formatPublishedPackagePrice(plan.price_from,plan.price_unit)}</strong>
        </header>
        <div className="ppq-layout">
          <div className="ppq-primary">
            <section className="ppq-panel" aria-labelledby="ppq-calculator-title">
              <span className="ppq-kicker">INSTANT ESTIMATE</span>
              <h2 id="ppq-calculator-title">Calculate your {plan.title} quote</h2>
              <p>{plan.description||'Estimate the cost using this professional\'s published package rate.'}</p>
              <form className="ppq-calculator" onSubmit={calculate}>
                {needsArea?<label htmlFor="ppq-area">Chargeable work area (sq ft)
                  <input id="ppq-area" type="number" inputMode="decimal" min="1" max="1000000" step=".01"
                    required value={area} onChange={event=>{setArea(event.target.value);setQuotation(null);setQuoteError('')}}
                    placeholder="e.g. 1500"/>
                </label>:<p>Published fixed-project package · no area input required.</p>}
                <button type="submit">Calculate Quotation →</button>
              </form>
              {quoteError&&<p className="ppq-error" role="alert">{quoteError}</p>}
              {quotation&&<div className="ppq-result" role="status">
                <small>INDICATIVE ESTIMATED AMOUNT</small>
                <strong>{quotation.amountText}</strong>
                <p>{quotation.packageName} · {quotation.quantity.toLocaleString('en-IN',{maximumFractionDigits:2})} {quotation.unitLabel} × ₹{quotation.rate.toLocaleString('en-IN')}</p>
                <button type="button" disabled={downloadBusy} onClick={download}>{downloadBusy?'Preparing PDF…':'↓ Download Detailed Quotation PDF'}</button>
                <a href="#request-quote">Request a confirmed quotation</a>
              </div>}
              <p className="ppq-disclaimer">Published package rates are indicative. Actual measurements, brands, site conditions, additional works, applicable taxes and the final scope require confirmation.</p>
            </section>

            <section className="ppq-panel">
              <span className="ppq-kicker">PACKAGE SPECIFICATIONS</span>
              <h2>What's included</h2>
              {Array.isArray(plan.inclusions)&&plan.inclusions.length>0
                ?<ul className="ppq-inclusions">{plan.inclusions.map((item,index)=><li key={index}>{item}</li>)}</ul>
                :<p>Request detailed inclusions from the professional.</p>}
              {Array.isArray(plan.spec_sections)&&plan.spec_sections.length>0&&<div className="ppq-specs">
                {plan.spec_sections.map((spec,index)=><div key={index}>
                  <strong>{spec.title}</strong>
                  {spec.description&&<p>{spec.description}</p>}
                  <small>{[spec.brand&&'Brand: '+spec.brand,spec.grade&&'Grade / model: '+spec.grade].filter(Boolean).join(' · ')}</small>
                  <small>{spec.pricingTreatment==='excluded'?'Not included':spec.pricingTreatment==='extra'?'Extra charge':spec.pricingTreatment==='allowance'?'Included allowance':'Included'}
                    {spec.allowanceValue!=null?' · ₹'+Number(spec.allowanceValue).toLocaleString('en-IN')+(spec.unit?' / '+spec.unit:''):''}</small>
                </div>)}
              </div>}
              {plan.brochure_url&&<a className="ppq-brochure" href={plan.brochure_url} target="_blank" rel="noopener noreferrer">View professional package brochure ↗</a>}
            </section>

            <section className="ppq-panel" id="request-quote">
              <span className="ppq-kicker">CONFIRM YOUR REQUIREMENT</span>
              <h2>Request a formal quotation</h2>
              <p>ProPulse will send your {plan.title} enquiry to {profile.business_name} and protect your contact information.</p>
              {callbackSuccess?<div className="ppq-success" role="status"><strong>Request received.</strong><p>ProPulse will coordinate your quotation enquiry.</p></div>:
                <ProfessionalCallbackRequirementForm value={callback} onChange={setCallback} onSubmit={requestCallback}
                  busy={callbackSending} error={callbackError} submitLabel="Request Formal Quote"/>}
            </section>
          </div>
          <aside className="ppq-sidebar">
            <div className="ppq-panel">
              <span className="ppq-kicker">OTHER PUBLISHED PACKAGES</span>
              <h2>Compare options</h2>
              <div className="ppq-options">{plans.map(item=><Link key={item.id||item.title}
                className={item===plan?'selected':''}
                to={'/experts/'+expertId+'/quote?package='+encodeURIComponent(String(item.id||item.title))}>
                <span><strong>{item.title}</strong><small>{formatPublishedPackagePrice(item.price_from,item.price_unit)}</small></span>
                <span aria-hidden="true">→</span>
              </Link>)}</div>
              <Link className="ppq-profile-link" to={'/experts/'+expertId+'#pricing'}>View professional profile</Link>
            </div>
          </aside>
        </div>
      </>}
    </div>
    <PublicFooter/>
  </main>
}
