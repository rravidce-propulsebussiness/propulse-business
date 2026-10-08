/**
 * Open the existing central homeowner consultation popup.
 * Extra context is descriptive only; the same validated lead-intake API is used.
 */
export function openLeadPopup(flowKey='',options={}) {
  const safe=options&&typeof options==='object'?options:{}
  window.dispatchEvent(new CustomEvent('propulse:open-lead-popup',{
    detail:{
      flowKey,
      intent:safe.intent==='callback'?'callback':'requirement',
      projectTitle:String(safe.projectTitle||'').slice(0,130),
      packageName:String(safe.packageName||'').slice(0,130),
    },
  }))
}
