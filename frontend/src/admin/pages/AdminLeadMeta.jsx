import { useCallback, useState } from 'react'
import MetaLeadAdsPanel from '../../components/MetaLeadAdsPanel'
import LeadClassificationRulesPanel from '../../components/LeadClassificationRulesPanel'
import './AdminLeadsV9.css'
import './AdminLeadMeta.css'

export default function AdminLeadMeta(){
  const [metaStatus, setMetaStatus] = useState(null)
  const [rulesStatus, setRulesStatus] = useState(null)
  const reportMetaStatus = useCallback(status => setMetaStatus(status), [])
  const reportRulesStatus = useCallback(status => setRulesStatus(status), [])

  const metaConnected = Boolean(metaStatus?.pageCount)
  const formsCount = metaStatus?.formCount ?? 0

  return <main className="v9-leads mla-meta-page">
    <header className="mla-page-head">
      <div className="mla-page-title">
        <span>LEAD SOURCES / META</span>
        <h1>Meta Lead Ads</h1>
        <p>Connect forms and classify incoming leads by value.</p>
      </div>
      <div className="mla-page-status" aria-label="Meta lead status">
        <div className={'mla-status-chip ' + (metaConnected ? 'is-ready' : 'is-muted')}>
          <span className="mla-status-symbol" aria-hidden="true">{metaConnected ? '✓' : '○'}</span>
          <span><strong>{metaConnected ? 'Meta connected' : 'Meta not connected'}</strong><small>{metaStatus ? metaStatus.pageCount + ' Pages shared' : 'Checking connection'}</small></span>
        </div>
        <div className={'mla-status-chip ' + (rulesStatus?.enabled ? 'is-ready' : 'is-muted')}>
          <span className="mla-status-symbol" aria-hidden="true">{rulesStatus?.enabled ? '✓' : '⚙'}</span>
          <span><strong>Auto-classification {rulesStatus ? (rulesStatus.enabled ? 'on' : 'off') : 'checking'}</strong><small>New imports</small></span>
        </div>
        <div className="mla-status-chip is-ready">
          <span className="mla-status-symbol" aria-hidden="true">▤</span>
          <span><strong>Forms synced&nbsp; {formsCount}</strong><small>Connected lead forms</small></span>
        </div>
      </div>
    </header>
    <LeadClassificationRulesPanel onStatusChange={reportRulesStatus}/>
    <MetaLeadAdsPanel scope="admin" onStatusChange={reportMetaStatus}/>
  </main>;
}
