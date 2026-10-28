// Instant *indicative* quote from a published, server-verified professional
// package. Never silently substitute global ProPulse catalogue rates.
export function calculateProfessionalPackageQuote({packageRecord,industry,areaSqft,professionalName='',projectTitle='',referenceId=null,issuedAt=null}={}){
  if(!packageRecord)return null
  const rate=Number(packageRecord.price_from)
  const unit=String(packageRecord.price_unit||'unspecified')
  if(!Number.isFinite(rate)||rate<=0||rate>1e9)return null
  const area=Number(areaSqft)
  let quantity=1
  let unitLabel='project'
  if(unit==='sqft'||unit==='sqyd'){
    if(!Number.isFinite(area)||area<1||area>1000000)return null
    quantity=unit==='sqyd'?area/9:area
    unitLabel=unit==='sqyd'?'sq yard':'sq ft'
  }else if(unit!=='project')return null
  const amount=Math.round(quantity*rate)
  if(!Number.isFinite(amount)||amount<=0||amount>1e12)return null
  const specs=Array.isArray(packageRecord.spec_sections)?packageRecord.spec_sections:[]
  const referenceDate=issuedAt&&Number.isFinite(new Date(issuedAt).getTime())?new Date(issuedAt):new Date()
  return{
    kind:'professional-package',
    packageName:String(packageRecord.title||'Published package'),
    industry:String(industry||packageRecord.industry||'construction'),
    professionalName:String(professionalName||'Selected professional'),
    projectTitle:String(projectTitle||''),
    referenceId,
    generatedAt:referenceDate.toISOString(),
    validUntil:new Date(referenceDate.getTime()+30*24*60*60*1000).toISOString(),
    rate,quantity,unitLabel,areaSqft:unit==='project'?null:area,
    amount,amountText:new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount),
    priceUnit:unit,
    duration:String(packageRecord.duration_label||''),
    description:String(packageRecord.description||''),
    inclusions:Array.isArray(packageRecord.inclusions)?packageRecord.inclusions:[],
    specifications:specs,
    disclaimer:'Indicative package-rate quotation only. This is not a final offer or contract. The professional must confirm drawings, actual measurements, scope, brands, allowance quantities, additions, taxes and site conditions. Chargeable extras are not included in the calculated amount.'
  }
}
