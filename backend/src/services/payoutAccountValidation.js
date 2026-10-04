function clean(value){ return value == null ? null : String(value).trim() || null }

function invalid(message,errorCode){
  throw Object.assign(new Error(message), { code:errorCode })
}

function validateBank(input,errorCode){
  const accountHolderName = clean(input.accountHolderName)
  const accountNumber = clean(input.accountNumber)
  const ifscCode = clean(input.ifscCode)?.toUpperCase()
  const bankName = clean(input.bankName)
  if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
    invalid('Complete bank account details are required',errorCode)
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    invalid('Enter a valid IFSC code',errorCode)
  }
  if (!/^[0-9]{6,30}$/.test(accountNumber)) {
    invalid('Enter a valid bank account number',errorCode)
  }
  return { method:'bank', accountHolderName, accountNumber, ifscCode, bankName }
}

function validateUpi(input,errorCode){
  const upiId = clean(input.upiId)?.toLowerCase()
  if (!upiId || !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(upiId)) {
    invalid('Enter a valid UPI ID',errorCode)
  }
  return { method:'upi', upiId }
}

module.exports={validateBank,validateUpi}
