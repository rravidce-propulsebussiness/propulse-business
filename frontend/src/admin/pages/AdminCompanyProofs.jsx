import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../utils/api';
import { authRequest, getToken } from '../../utils/auth';
import './AdminCompanyProofs.css';

const dateTime = value => value ? new Date(value).toLocaleString() : '—';
const bytes = value => {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AdminCompanyProofs() {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('pending');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [reasonFor, setReasonFor] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ status, page: String(page), pageSize: '25' });
      const response = await authRequest(`/admin/company-proofs?${query}`);
      setDocuments(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
      setPagination(response?.pagination || null);
    } catch (e) {
      setError(e.message || 'Failed to load company proofs');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function review(documentId, nextStatus, reviewReason = '') {
    try {
      setSavingId(documentId);
      setError('');
      await authRequest(`/admin/company-proofs/${documentId}/${nextStatus === 'verified' ? 'verify' : 'reject'}`, {
        method: 'PATCH',
        body: JSON.stringify(nextStatus === 'rejected' ? { reason: reviewReason } : {}),
      });
      setReasonFor(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update company proof');
    } finally {
      setSavingId(null);
    }
  }

  async function openDocument(documentId) {
    try {
      setError('');
      const response = await fetch(`${API_BASE_URL}/auth/company-proofs/${documentId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to open document');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.message || 'Failed to open document');
    }
  }

  function requestReject(documentId) {
    setReasonFor(documentId);
    setReason('');
  }

  return (
    <section className="admin-company-proofs-page">
      <div className="company-proofs-heading">
        <div>
          <h1>Company Proof Review</h1>
          <p>Review business documents submitted during signup and profile updates.</p>
        </div>
        <div className="company-proof-tabs">
          {['pending', 'verified', 'rejected'].map(item => (
            <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="company-proofs-error">{error}</div>}

      <div className="company-proofs-panel">
        {loading ? <div className="company-proofs-empty">Loading company proofs…</div> : !documents.length ? (
          <div className="company-proofs-empty">No {status} company proof documents.</div>
        ) : (
          <div className="company-proofs-list">
            {documents.map(document => (
              <article className="company-proof-card" key={document.id}>
                <div className="company-proof-main">
                  <div className="company-proof-file">
                    <span>{document.mime_type === 'application/pdf' ? 'PDF' : 'IMG'}</span>
                    <div>
                      <strong>{document.original_name}</strong>
                      <small>{bytes(document.file_size)} · Uploaded {dateTime(document.created_at)}</small>
                    </div>
                  </div>
                  <div className="company-proof-business">
                    <strong>{document.business_name || document.user_name || 'User'}</strong>
                    <small>#{document.user_id} · {document.user_email || '—'}</small>
                  </div>
                  <div className="company-proof-status">
                    <span className={`proof-status ${document.status}`}>{document.status}</span>
                    {document.reviewed_at && <small>Reviewed {dateTime(document.reviewed_at)}</small>}
                  </div>
                </div>

                <div className="company-proof-actions">
                  <button onClick={() => openDocument(document.id)}>View document</button>
                  {document.status === 'pending' && (
                    <>
                      <button className="verify" disabled={savingId === document.id} onClick={() => review(document.id, 'verified')}>
                        {savingId === document.id ? 'Saving…' : 'Verify'}
                      </button>
                      <button className="reject" disabled={savingId === document.id} onClick={() => requestReject(document.id)}>
                        Reject
                      </button>
                    </>
                  )}
                </div>

                {document.status === 'rejected' && document.review_reason && (
                  <div className="company-proof-reason"><b>Rejection reason:</b> {document.review_reason}</div>
                )}

                {reasonFor === document.id && (
                  <div className="company-proof-reject-box">
                    <label>Rejection reason<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} placeholder="Explain why this document was rejected." /></label>
                    <div>
                      <button onClick={() => { setReasonFor(null); setReason(''); }}>Cancel</button>
                      <button className="reject" disabled={!reason.trim() || savingId === document.id} onClick={() => review(document.id, 'rejected', reason.trim())}>Confirm rejection</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="company-proofs-pagination">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} documents</span>
          <div>
            <button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button>
            <button disabled={page >= pagination.totalPages || loading} onClick={() => setPage(value => value + 1)}>Next</button>
          </div>
        </div>
      )}
    </section>
  );
}
