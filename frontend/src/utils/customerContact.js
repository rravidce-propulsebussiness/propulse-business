export function normalizeIndianMobileInput(value){
  const digits=String(value||'').replace(/\D/g,'')
  if(digits.length>10&&digits.startsWith('91'))return digits.slice(2,12)
  return digits.slice(0,10)
}

export function isValidIndianMobile(value){
  return /^[6-9]\d{9}$/.test(String(value||'').trim())
}
