import {useState} from 'react'
import './ProfessionalPackageSpecEditor.css'

const UNIT_OPTIONS = [
  ['none','As specified'],['sqft','Per sq ft'],['running_ft','Per running ft'],
  ['piece','Per piece'],['bathroom','Per bathroom'],['door','Per door'],
  ['point','Per point'],['kg','Per kg'],['bag','Per bag'],['lumpsum','Lump sum'],
]
const TREATMENTS = [
  ['included','Included in package'],['allowance','Allowance included'],
  ['extra','Chargeable extra'],['excluded','Excluded'],
]
const emptySpec = (title='',description='') => ({
  title,description,brand:'',grade:'',unit:'none',pricingTreatment:'included',allowanceValue:'',
})
export default function ProfessionalPackageSpecEditor({industry,sections=[],onChange}){
  const items=Array.isArray(sections)?sections:[]
  const [expanded,setExpanded]=useState(null)
  const edit=(index,field,value)=>onChange(items.map((item,i)=>i===index?{...item,[field]:value}:item))
  const add=()=>{
    if(items.length>=24)return
    onChange([...items,emptySpec()])
    setExpanded(items.length)
  }
  const remove=index=>{
    onChange(items.filter((_,i)=>i!==index))
    setExpanded(current=>current===index?null:current>index?current-1:current)
  }
  return <section className="pps-spec-studio" aria-label="Detailed package specifications">
    <div className="pps-spec-head">
      <div><h4>Materials, works &amp; specifications</h4><p>Your package includes editable material and work items. Tap any item to change its brand, grade, allowance, inclusion or scope. No separate template or brochure is needed.</p></div>
      <span className="pps-spec-count">{items.length} items</span>
    </div>
    {items.length===0&&<p className="pps-spec-empty">No material items in this package. Add a work item and describe the exact scope, or attach an optional supporting brochure.</p>}
    <div className="pps-spec-rows">{items.map((item,index)=>{
      const isOpen=expanded===index
      return <article className={'pps-spec-row'+(isOpen?' is-open':'')} key={index}>
        <button type="button" className="pps-spec-row-toggle" aria-expanded={isOpen} aria-controls={'package-spec-fields-'+index} onClick={()=>setExpanded(isOpen?null:index)}>
          <span className="pps-spec-number">{String(index+1).padStart(2,'0')}</span>
          <span className="pps-spec-row-label"><strong>{item.title||'New work item'}</strong><small>{[item.brand,item.grade,item.pricingTreatment==='allowance'?'Included allowance':item.pricingTreatment==='extra'?'Chargeable extra':item.pricingTreatment==='excluded'?'Excluded':'Included'].filter(Boolean).join(' · ')}</small></span>
          <span aria-hidden="true">{isOpen?'−':'+'}</span>
        </button>
        {isOpen&&<div id={'package-spec-fields-'+index} className="pps-spec-row-body">
          <div className="pps-spec-grid">
            <label>Item / work name <input maxLength="120" value={item.title||''} onChange={e=>edit(index,'title',e.target.value)} placeholder="Steel / TMT" /></label>
            <label>Brand / manufacturer <input maxLength="120" value={item.brand||''} onChange={e=>edit(index,'brand',e.target.value)} placeholder="e.g. Tata / JSW" /></label>
            <label>Grade / size / finish <input maxLength="120" value={item.grade||''} onChange={e=>edit(index,'grade',e.target.value)} placeholder="Fe 550D, 18 mm, matte…" /></label>
            <label>Pricing / scope <select value={item.pricingTreatment||'included'} onChange={e=>edit(index,'pricingTreatment',e.target.value)}>{TREATMENTS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            <label>Measurement unit <select value={item.unit||'none'} onChange={e=>edit(index,'unit',e.target.value)}>{UNIT_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            {(item.pricingTreatment==='allowance'||item.pricingTreatment==='extra')&&item.unit!=='none'&&<label>{item.pricingTreatment==='extra'?'Extra rate':'Included allowance'} (₹ per unit)<input type="number" min="0" max="100000000" step=".01" value={item.allowanceValue??''} onChange={e=>edit(index,'allowanceValue',e.target.value)} placeholder="Set company amount" /></label>}
            <label className="pps-spec-description">Clear specification and scope <textarea rows="3" maxLength="700" value={item.description||''} onChange={e=>edit(index,'description',e.target.value)} placeholder="Thickness, supply, installation, brand and other terms…" /></label>
          </div>
          <div className="pps-spec-row-actions"><small>{item.pricingTreatment==='allowance'?'Allowance is already included in the base package rate.':item.pricingTreatment==='extra'?'Extra charges are not included in the base package quote.':'Edit the work and materials to match your company.'}</small><button type="button" onClick={()=>remove(index)}>Remove item</button></div>
        </div>}
      </article>
    })}</div>
    <div className="pps-spec-footer">
      <small>Allowances form part of the published package price; extras are not added automatically.</small>
      <button type="button" onClick={add} disabled={items.length>=24}>+ Add work item</button>
    </div>
  </section>
}
