export function openLeadPopup(flowKey='') {
  window.dispatchEvent(new CustomEvent('propulse:open-lead-popup', { detail: { flowKey } }))
}
