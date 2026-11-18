import { useCallback, useState } from 'react'
import MetaLeadAdsPanel from '../../components/MetaLeadAdsPanel'
import LeadClassificationRulesPanel from '../../components/LeadClassificationRulesPanel'
import './AdminLeadsV9.css'
import './AdminLeadMeta.css'

export default function AdminLeadMeta() {
  const [metaStatus, setMetaStatus] = useState(null)
  const [rulesStatus, setRulesStatus] = useState(null)
  const reportMetaStatus = useCallback(status => setMetaStatus(status), [])
  const reportRulesStatus = useCallback(status => setRulesStatus(status), [])

  const metaConnected = Boolean(metaStatus?.pageCount)

  return <main className="v9-leads mla-meta-page">
    <div className="mla-page-status" aria-label="Meta lead status">
      <div className={'mla-status-chip ' + (metaConnected ? 'is-ready' : 'is-muted')}>
        <span className="mla-status-symbol" aria-hidden="true">{metaConnected ? '✓' : '○'}</span>
        <span><strong>{metaConnected ? 'Meta connected' : 'Meta not connected'}</strong><small>{metaStatus ? metaStatus.pageCount + ' Pages' : 'Checking connection'}</small></span>
      </div>
      <div className={'mla-status-chip ' + (rulesStatus?.enabled ? 'is-ready' : 'is-muted')}>
        <span className="mla-status-symbol" aria-hidden="true">{rulesStatus?.enabled ? '✓' : '⚙'}</span>
        <span><strong>Auto-classification · {rulesStatus ? (rulesStatus.enabled ? 'On' : 'Off') : 'Checking'}</strong></span>
      </div>
      <div className="mla-status-chip is-ready">
        <span className="mla-status-symbol" aria-hidden="true">▤</span>
        <span><strong>Forms synced · {metaStatus?.formCount ?? 0}</strong></span>
      </div>
    </div>
    <MetaLeadAdsPanel scope="admin" onStatusChange={reportMetaStatus}/>
    <LeadClassificationRulesPanel onStatusChange={reportRulesStatus}/>
  </main>
}
