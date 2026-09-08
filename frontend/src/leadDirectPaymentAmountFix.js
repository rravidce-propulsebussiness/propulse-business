const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function refreshAmountToPay(modal) {
  if (!modal) return

  const directSource = Array.from(modal.querySelectorAll('*')).find(node => {
    const text = String(node.textContent || '').trim().replace(/\s+/g, ' ')
    return /^DIRECT PAYMENT\s*₹?[\d,]+(?:\.\d+)?$/i.test(text)
  })
  if (!directSource) return

  const match = String(directSource.textContent || '').match(/₹?\s*([\d,]+(?:\.\d+)?)/)
  if (!match) return
  const directAmount = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(directAmount)) return

  const amountLabel = Array.from(modal.querySelectorAll('*')).find(node => {
    const text = String(node.textContent || '').trim().replace(/\s+/g, ' ')
    return /^AMOUNT TO PAY NOW/i.test(text)
  })
  if (amountLabel) {
    const candidates = amountLabel.querySelectorAll('strong,b,span')
    let valueNode = null
    for (const node of candidates) {
      if (/₹?\s*[\d,]+(?:\.\d+)?/.test(String(node.textContent || ''))) {
        valueNode = node
        break
      }
    }
    if (valueNode) valueNode.textContent = money(directAmount)
  }

  const submit = modal.querySelector('.lv2-payment-submit .lv2-more')
  if (submit) {
    submit.textContent = `Submit ${money(directAmount)} payment`
  }
}

function run() {
  document.querySelectorAll('.lv2-payment-modal').forEach(refreshAmountToPay)
}

const observer = new MutationObserver(run)
observer.observe(document.body, { childList: true, subtree: true, characterData: true })
run()
