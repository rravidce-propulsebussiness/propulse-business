import {useEffect,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {categoryLabel,normalizeProject} from './Projects'
import {formatPublishedPackagePrice} from '../utils/packagePricing'
import RequirementWizard from './RequirementWizard'
import './Solutions.css'
import './ProjectQuote.css'

const flowForIndustry={construction:'build',design:'design',property:'property'}
const flowClassForIndustry={construction:'construction',design:'interiors',property:'property'}
const validPackages=(profile,industry)=>Array.isArray(profile?.service_plans)
  ?profile.service_plans.filter(plan=>plan?.title&&plan.industry===industry):[]

export default function ProjectQuote(){
  const {projectId}=useParams()
  const id=/^project-([1-9]\d*)$/.exec(projectId||'')?.[1]
  const [project,setProject]=useState(null)
  const [packages,setPackages]=useState([])
  const [preferredPackage,setPreferredPackage]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [pricingMessage,setPricingMessage]=useState('')
  const [submitted,setSubmitted]=useState(null)

  useEffect(()=>{
    if(!id){
      setLoading(false)
      setLoadError('This project link is invalid.')
      return undefined
    }
    let active=true
    const controller=new AbortController()
    setProject(null)
    setPackages([])
    setPreferredPackage('')
    setSubmitted(null)
    setLoadError('')
    setPricingMessage('')
    setLoading(true)

    const load=async()=>{
      try{
        const raw=await publicRequest('/experts/projects/'+id,{signal:controller.signal})
        if(!active)return
        const item=normalizeProject(raw)
        setProject(item)
        document.title='Get a quote for '+item.title+' | ProPulse'
        if(!item.businessProfileId){
          setPricingMessage('This project does not have a linked professional profile.')
          return
        }
        try{
          const profile=await publicRequest('/experts/'+item.businessProfileId,{signal:controller.signal})
          if(!active)return
          const matching=validPackages(profile,item.category)
          setPackages(matching)
          const linked=matching.find(plan=>plan.title.trim().toLowerCase()===item.packageName.trim().toLowerCase())
          setPreferredPackage(linked?.title||'')
          if(!matching.length){
            setPricingMessage('No '+categoryLabel(item.category).toLowerCase()+' packages are published yet. You can still submit your requirements and request a custom quotation from this professional.')
          }
        }catch(error){
          if(active&&!controller.signal.aborted)setPricingMessage('Unable to load this professional’s packages. Please try again later.')
        }
      }catch(error){
        if(active&&!controller.signal.aborted)setLoadError(error?.status===404?'This project is not currently available.':error?.message||'Unable to load the project.')
      }finally{
        if(active)setLoading(false)
      }
    }
    void load()
    return()=>{active=false;controller.abort();document.title='ProPulse'}
  },[id])

  const industry=project?.category
  const flowKey=flowForIndustry[industry]||'build'
  const quoteIndustryLabel=project?categoryLabel(industry):'Project'
  const picked=packages.find(plan=>plan.title===preferredPackage)

  return <main className="quote-page professional-project-quote">
    <PublicHeader/>
    <nav className="pq-breadcrumb pq-wrap" aria-label="Breadcrumb">
      <Link to="/projects">Projects</Link><span>/</span>
      <Link to={'/projects/'+projectId}>Project details</Link><span>/</span><span>Get Quote</span>
    </nav>

    {loading?<div className="pq-loading pq-wrap" role="status">Loading project and professional packages…</div>:
    loadError||!project?<section className="pq-status pq-wrap" role="alert">
      <h1>Quotation not available</h1>
      <p>{loadError||'Project information is unavailable.'}</p>
      <Link to="/projects">Browse projects →</Link>
    </section>:
    submitted?<section className="pq-success" role="status">
      <span className="pq-success-icon" aria-hidden="true">✓</span>
      <span className="pq-eyebrow">PROFESSIONAL QUOTATION</span>
      <h1>{submitted.duplicate?'We already received your request':'Quotation request received'}</h1>
      <p>Your {quoteIndustryLabel.toLowerCase()} enquiry about <strong>{project.title}</strong> has been recorded for <strong>{project.businessName||'the selected professional'}</strong>. ProPulse coordinates your enquiry and protects your contact details.</p>
      {submitted.requestId&&<strong className="pq-request-id">Reference #{submitted.requestId}</strong>}
      <div className="pq-success-actions"><Link to={'/projects/'+projectId}>Back to project</Link><Link to="/projects">View other projects</Link></div>
    </section>:<>
      {pricingMessage&&<div className="pq-project-warning" role="status">{pricingMessage}</div>}
      {flowKey!=='design'&&packages.length>0&&<section className="pq-panel pq-wrap" aria-labelledby="professional-quote-package-title">
          <div className="pq-section-header">
            <div><span className="pq-eyebrow">PUBLISHED PROFESSIONAL PRICING</span>
              <h2 id="professional-quote-package-title">Choose your {quoteIndustryLabel.toLowerCase()} package</h2>
              <p>Choose a published package, or let the professional propose a custom quote after reviewing your requirements.</p>
            </div>
          </div>
          <div className="pq-package-list" role="radiogroup" aria-label="Preferred professional package">
            <label className={'pq-package-choice'+(!preferredPackage?' selected':'')}><input type="radio" name="preferredProfessionalPackage" value="" checked={!preferredPackage} onChange={()=>setPreferredPackage('')}/><span className="pq-choice-mark" aria-hidden="true"/><span className="pq-choice-content"><strong>Custom quotation</strong><small className="pq-package-description">Share your project details. The professional will prepare a quote after reviewing your requirements.</small></span></label>
            {packages.map(plan=><label key={plan.id||plan.title} className={'pq-package-choice'+(preferredPackage===plan.title?' selected':'')}>
              <input type="radio" name="preferredProfessionalPackage" value={plan.title} checked={preferredPackage===plan.title} onChange={()=>setPreferredPackage(plan.title)}/>
              <span className="pq-choice-mark" aria-hidden="true"/>
              <span className="pq-choice-content">
                <strong>{plan.title}</strong>
                {plan.description&&<small className="pq-package-description">{plan.description}</small>}
                {Array.isArray(plan.inclusions)&&plan.inclusions.length>0&&<span className="pq-inclusions">{plan.inclusions.slice(0,3).map((detail,index)=><small key={index}>✓ {detail}</small>)}</span>}
                {plan.brochure_url&&<a className="pq-document" href={plan.brochure_url} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>View package specifications ↗</a>}
              </span>
              <span className="pq-price-box"><strong>{formatPublishedPackagePrice(plan.price_from,plan.price_unit)}</strong><small>Published starting rate</small></span>
            </label>)}
          </div>
          {project.cost&&<p className="pq-price-disclaimer">Completed project’s reported budget: {project.cost}. Your quote is calculated separately from your own project details.</p>}
        </section>}
        <section className={'quote-flow quote-flow-'+flowClassForIndustry[industry]}>
          <RequirementWizard key={'professional-'+id+'-'+flowKey} flowKey={flowKey} embedded projectQuote={{
            project,packages,preferredPackage,
            setPreferredPackage,
            onSubmitted:setSubmitted,
          }}/>
        </section>
    </>}
    <PublicFooter/>
  </main>
}
