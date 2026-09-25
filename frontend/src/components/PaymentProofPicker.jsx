import './PaymentProofPicker.css'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])

const fileSize = bytes => {
  const size = Number(bytes || 0)
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

const fileKind = file => {
  if (file?.type === 'application/pdf') return 'PDF'
  if (file?.type === 'image/png') return 'PNG'
  return 'JPG'
}

export function paymentProofError(file) {
  if (!file) return 'Choose a payment proof first.'
  if (!ALLOWED_TYPES.has(String(file.type || '').toLowerCase())) return 'Payment proof must be a JPG, PNG or PDF file.'
  if (Number(file.size || 0) > MAX_BYTES) return 'Payment proof must be 5 MB or smaller.'
  return ''
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to preview payment proof'))
    reader.readAsDataURL(file)
  })
}

export default function PaymentProofPicker({ id = 'payment-proof', value, onChange, onError }) {
  const choose = async event => {
    const file = event.target.files?.[0] || null
    const validation = paymentProofError(file)
    if (validation) {
      event.target.value = ''
      onError?.(validation)
      return
    }

    try {
      const dataUrl = await readDataUrl(file)
      onChange?.({ file, dataUrl })
      onError?.('')
    } catch (error) {
      event.target.value = ''
      onError?.(error.message || 'Unable to preview payment proof')
    }
  }

  const remove = () => {
    onChange?.(null)
    onError?.('')
  }

  const selected = value?.file
  const imagePreview = selected && String(selected.type || '').startsWith('image/') && value?.dataUrl

  return <div className={`payment-proof-picker${selected ? ' selected' : ''}`}>
    <input
      id={id}
      className="payment-proof-input"
      type="file"
      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
      onClick={event => { event.currentTarget.value = '' }}
      onChange={choose}
    />
    {!selected ? <label className="payment-proof-empty" htmlFor={id}>
      <span className="payment-proof-icon">⌁</span>
      <span className="payment-proof-copy"><b>Upload payment proof</b><small>JPG, PNG or PDF · Max 5 MB</small></span>
      <span className="payment-proof-choose">Choose file</span>
    </label> : <div className="payment-proof-selected" aria-live="polite">
      <div className="payment-proof-preview">
        {imagePreview ? <img src={value.dataUrl} alt="Selected payment proof preview" /> : <span>PDF</span>}
      </div>
      <div className="payment-proof-meta">
        <b><span>✓</span> Selected — ready to submit</b>
        <strong title={selected.name}>{selected.name}</strong>
        <small>{fileKind(selected)} · {fileSize(selected.size)}</small>
      </div>
      <div className="payment-proof-actions">
        <label htmlFor={id}>Change</label>
        <button type="button" onClick={remove}>Remove</button>
      </div>
    </div>}
  </div>
}
