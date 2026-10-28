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
const CONSTRUCTION_STARTERS = [
  ['Architectural plans','Floor plans, structure, elevation and approval scope'],
  ['Steel / TMT','Brand, steel grade and approved structural drawings'],
  ['Cement','Brands and grades for RCC, masonry and plaster'],
  ['Sand and aggregates','Manufactured/river sand, 20 mm and 40 mm aggregates'],
  ['Bricks / blocks','Type, size and masonry thickness'],
  ['Flooring tiles','Tile size, brand, finish and allowance'],
  ['Bathrooms and sanitary','CP fittings, sanitary brands and allowances'],
  ['Main and internal doors','Shutters, frames, locks and hardware'],
  ['Windows','UPVC or aluminium profiles, glass and hardware'],
  ['Kitchen','Platform, sink, backsplash and allowance'],
  ['Electrical','Wire, switches, distribution board and points'],
  ['Plumbing','Pipes, fittings, drainage and testing'],
  ['Painting','Putty, primer, paint brands and coats'],
  ['Staircase, gates and railings','Steel, handrails and finish'],
  ['Water tanks and sump','Underground/overhead storage and waterproofing'],
  ['Warranty and exclusions','Defect-liability period and excluded works'],
]
const INTERIOR_STARTERS = [
  ['Design and drawings','Layouts, elevations, 3D views and revisions'],
  ['Kitchen cabinetry','Carcass, shutter, laminate and edge banding'],
  ['Kitchen hardware','Hinges, channels, baskets and brand'],
  ['Wardrobes','Plywood grade, finish and hardware'],
  ['TV unit and furniture','Units, sizes and materials'],
  ['False ceiling','Gypsum brand, frame and paint'],
  ['Electrical and lighting','Light points, fixtures and accessories'],
  ['Painting and polishing','Paint system and finishes'],
  ['Countertop','Quartz, granite or other surface allowance'],
  ['Delivery and installation','Carriage, fixing, cleaning and handover'],
  ['Warranty and exclusions','Hardware, workmanship and excluded works'],
]
const emptySpec = (title='',description='') => ({
  title,description,brand:'',grade:'',unit:'none',pricingTreatment:'included',allowanceValue:'',
})
export default function ProfessionalPackageSpecEditor({industry,sections=[],onChange}){
  const items=Array.isArray(sections)?sections:[]
  const edit=(index,field,value)=>onChange(items.map((item,i)=>i===index?{...item,[field]:value}:item))
  const add=(title='',description='')=>{
    if(items.length>=24)return
    onChange([...items,emptySpec(title,description)])
  }
  const addStarters=()=>{
    const templates=industry==='design'?INTERIOR_STARTERS:CONSTRUCTION_STARTERS
    const existing=new Set(items.map(item=>String(item.title||'').trim().toLowerCase()))
    const additions=templates.filter(([title])=>!existing.has(title.toLowerCase())).slice(0,Math.max(0,24-items.length))
      .map(([title,description])=>emptySpec(title,description))
    if(additions.length)onChange([...items,...additions])
  }
  return <section className="pps-spec-studio" aria-label="Detailed package specifications">
    <div className="pps-spec-head">
      <div><h4>Materials, works &amp; specifications</h4><p>Describe each material, brand, grade, inclusion and any allowance. These details appear in customer quotation PDFs.</p></div>
      <div className="pps-spec-buttons"><button type="button" onClick={()=>addStarters()} disabled={items.length>=24}>+ Add {industry==='design'?'interior':'construction'} template</button><button type="button" onClick={()=>add()} disabled={items.length>=24}>+ Custom item</button></div>
    </div>
    {items.length===0&&<p className="pps-spec-empty">No detailed specifications added. Use a template and edit every row to match your actual package. Uploaded brochures are optional supporting documents.</p>}
    <div className="pps-spec-rows">{items.map((item,index)=><div className="pps-spec-row" key={index}>
      <div className="pps-spec-row-head"><strong>{String(index+1).padStart(2,'0')} · {item.title||'New specification'}</strong><button type="button" aria-label={'Remove specification '+(index+1)} onClick={()=>onChange(items.filter((_,i)=>i!==index))}>Remove</button></div>
      <div className="pps-spec-grid">
        <label>Item / work name <input maxLength="120" value={item.title||''} onChange={e=>edit(index,'title',e.target.value)} placeholder="Steel / TMT" /></label>
        <label>Brand / manufacturer <input maxLength="120" value={item.brand||''} onChange={e=>edit(index,'brand',e.target.value)} placeholder="e.g. Tata / JSW" /></label>
        <label>Grade / model <input maxLength="120" value={item.grade||''} onChange={e=>edit(index,'grade',e.target.value)} placeholder="Fe 550 D, ISI grade…" /></label>
        <label>Pricing / scope <select value={item.pricingTreatment||'included'} onChange={e=>edit(index,'pricingTreatment',e.target.value)}>{TREATMENTS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Measurement unit <select value={item.unit||'none'} onChange={e=>edit(index,'unit',e.target.value)}>{UNIT_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Allowance (₹, if applicable) <input type="number" min="0" max="100000000" step=".01" value={item.allowanceValue??''} onChange={e=>edit(index,'allowanceValue',e.target.value)} placeholder="Optional" /></label>
        <label className="pps-spec-description">Clear specification and scope <textarea rows="2" maxLength="700" value={item.description||''} onChange={e=>edit(index,'description',e.target.value)} placeholder="Thickness, work scope, specifications, supply and installation conditions…" /></label>
      </div>
    </div>)}</div>
    <small>{items.length}/24 specifications · An allowance describes a provision within the package; extras are not automatically added to the quoted total.</small>
  </section>
}
