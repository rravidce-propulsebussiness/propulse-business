export const MAX_PAYOUT_PROOF_BYTES = 6 * 1024 * 1024
export const PAYOUT_PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function payoutProofError(file,{typeMessage='Payment proof must be a PNG, JPG, or WebP image.',sizeMessage='Payment proof must be 6 MB or smaller.'}={}) {
  if (!file) return ''
  if (!PAYOUT_PROOF_TYPES.includes(file.type)) return typeMessage
  if (file.size > MAX_PAYOUT_PROOF_BYTES) return sizeMessage
  return ''
}

export function readPayoutProofDataUrl(file,errorMessage='Unable to read the payment proof image.') {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>resolve(String(reader.result||''))
    reader.onerror=()=>reject(new Error(errorMessage))
    reader.readAsDataURL(file)
  })
}
