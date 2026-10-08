// Package pricing comes from the professional's published profile.
// Never treat starting rates as a site-specific or binding total.
export const PACKAGE_PRICE_UNITS = [
  {value:'unspecified',label:'Not specified'},
  {value:'sqft',label:'Per sq ft'},
  {value:'sqyd',label:'Per sq yd'},
  {value:'project',label:'Per project'},
  {value:'room',label:'Per room'},
  {value:'running_ft',label:'Per running ft'},
  {value:'unit',label:'Per item / unit'},
]

export function packagePriceUnit(unit){
  return {
    sqft:'/ sq ft',
    sqyd:'/ sq yd',
    project:'/ project',
    room:'/ room',
    running_ft:'/ running ft',
    unit:'/ unit',
  }[unit]||''
}

export function formatPublishedPackagePrice(price,unit){
  if(price==null||price===''||!Number.isFinite(Number(price))||Number(price)<=0)return 'Pricing on request'
  const rupees=Number(price).toLocaleString('en-IN',{maximumFractionDigits:2})
  return '₹'+rupees+(packagePriceUnit(unit)?' '+packagePriceUnit(unit):'')
}
