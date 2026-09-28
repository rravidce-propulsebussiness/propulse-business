import './SheetImportPreview.css';

const groups=fields=>fields.reduce((out,field)=>{(out[field.group]??=[]).push(field);return out},{});
const rowLabel=row=>row?.key||('Row '+row?.row);

export default function SheetImportPreview({preview,mappings={},onMappingsChange,stale=false,disabled=false}){
  if(!preview)return null;
  const summary=preview.summary||{};
  const fields=Array.isArray(preview.mappingFields)?preview.mappingFields:[];
  const headers=Array.isArray(preview.headers)?preview.headers:[];
  const rows=Array.isArray(preview.rows)?preview.rows:[];
  const grouped=groups(fields);
  const change=(id,value)=>{
    const next={...mappings};
    next[id]=value||null;
    onMappingsChange?.(next);
  };
  const mappedCount=Object.values(mappings||{}).filter(Boolean).length;
  return <section className={'sheet-preview '+(stale?'stale':'')}>
    <header className="sheet-preview-head">
      <div>
        <span>VALIDATION PREVIEW</span>
        <h3>{summary.total||0} rows analyzed before activation</h3>
        <p>{stale?'Mapping or defaults changed. Re-analyze before activation.':'No leads are written by this preview. Activation is allowed only when invalid rows are zero.'}</p>
      </div>
      <b className={stale?'stale':Number(summary.invalid||0)>0?'bad':'good'}>{stale?'RE-ANALYZE':Number(summary.invalid||0)>0?'NEEDS FIX':'READY'}</b>
    </header>

    <div className="sheet-preview-stats">
      <article><span>Total</span><strong>{summary.total||0}</strong><small>Rows detected</small></article>
      <article className="good"><span>Valid</span><strong>{summary.valid||0}</strong><small>Ready as-is</small></article>
      <article className="warn"><span>Warnings</span><strong>{summary.warning||0}</strong><small>Can activate after review</small></article>
      <article className="bad"><span>Invalid</span><strong>{summary.invalid||0}</strong><small>Must be fixed</small></article>
      <article><span>Duplicates</span><strong>{summary.duplicates||0}</strong><small>Skipped or likely duplicate</small></article>
      <article><span>Planned</span><strong>{Number(summary.creates||0)+Number(summary.updates||0)}</strong><small>{summary.updates?(String(summary.creates||0)+' create · '+String(summary.updates||0)+' update'):(String(summary.creates||0)+' create')}</small></article>
    </div>

    {Array.isArray(preview.mappingWarnings)&&preview.mappingWarnings.length>0&&<div className="sheet-preview-notice warn">
      <strong>Mapping review</strong>
      <span>{preview.mappingWarnings.slice(0,4).join(' · ')}</span>
    </div>}

    <div className="sheet-preview-mapping">
      <div className="sheet-preview-section-title"><div><span>COLUMN MAPPING</span><h4>Confirm how source columns enter ProPulse</h4></div><small>{mappedCount} mapped</small></div>
      <div className="sheet-preview-groups">
        {Object.entries(grouped).map(([group,items])=><section key={group}>
          <h5>{group}</h5>
          <div className="sheet-preview-map-grid">
            {items.map(field=><label key={field.id}>
              <span>{field.label}</span>
              <select value={mappings?.[field.id]||''} disabled={disabled} onChange={e=>change(field.id,e.target.value)}>
                <option value="">Not mapped</option>
                {headers.map(header=><option key={header} value={header}>{header}</option>)}
              </select>
            </label>)}
          </div>
        </section>)}
      </div>
    </div>

    <div className="sheet-preview-rows">
      <div className="sheet-preview-section-title"><div><span>ROW DIAGNOSTICS</span><h4>Sample validation results</h4></div><small>Up to {Math.min(60,rows.length)} shown</small></div>
      {!rows.length?<div className="sheet-preview-empty">No row diagnostics were returned.</div>:<div className="sheet-preview-row-list">
        {rows.map((row,index)=><article key={String(row.row)+'-'+String(index)} className={row.status||'valid'}>
          <span className="sheet-preview-row-number">#{row.row}</span>
          <span className={'sheet-preview-row-state '+(row.status||'valid')}>{row.status||'valid'}</span>
          <div><strong>{rowLabel(row)}</strong><small>{Array.isArray(row.messages)&&row.messages.length?row.messages.join(' · '):(row.action==='update'?'Existing lead will be updated':row.action==='skip'?'Row will be skipped':'Ready to create')}</small></div>
          <b>{row.action||'create'}</b>
        </article>)}
      </div>}
    </div>
  </section>;
}
