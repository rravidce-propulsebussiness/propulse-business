import { useEffect, useState } from 'react';
import { getToken } from '../../utils/auth';
import './AdminLeadPricing.css';

const API = 'http://localhost:5000/api';
const initial = {
  normal: { oneShare: 0, threeShares: 0, fiveShares: 0 },
  pro: { oneShare: 0, threeShares: 0, fiveShares: 0 },
};

export default function AdminLeadPricing() {
  const [pricing, setPricing] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const request = async (path, options = {}) => {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  async function load() {
    try {
      setLoading(true);
      const data = await request('/leads/pricing');
      setPricing({
        normal: {
          oneShare: data?.normal_one_share ?? 0,
          threeShares: data?.normal_three_shares ?? 0,
          fiveShares: data?.normal_five_shares ?? 0,
        },
        pro: {
          oneShare: data?.pro_one_share ?? 0,
          threeShares: data?.pro_three_shares ?? 0,
          fiveShares: data?.pro_five_shares ?? 0,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function change(type, field, value) {
    setPricing((previous) => ({
      ...previous,
      [type]: { ...previous[type], [field]: value },
    }));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await request('/leads/pricing', { method: 'PUT', body: JSON.stringify(pricing) });
      setMessage('Lead pricing saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-pricing-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">MARKETPLACE SETTINGS</span>
          <h1>Lead Pricing</h1>
          <p>Manage the default 3 + 3 share prices used when uploading leads.</p>
        </div>
        <button className="admin-refresh-btn" onClick={load}>↻ Refresh</button>
      </div>

      {error && <div className="pricing-alert error">{error}</div>}
      {message && <div className="pricing-alert success">{message}</div>}

      {loading ? <div className="pricing-state">Loading pricing...</div> : (
        <>
          <div className="pricing-cards">
            {['normal', 'pro'].map((type) => (
              <section className="pricing-card" key={type}>
                <div className="pricing-card-heading">
                  <div><span>{type === 'normal' ? 'STANDARD' : 'PRO'}</span><h2>{type === 'normal' ? 'Normal User' : 'Pro User'}</h2></div>
                  <strong>₹</strong>
                </div>
                <div className="pricing-fields">
                  {[['oneShare', '1 Share'], ['threeShares', '3 Shares'], ['fiveShares', '5 Shares']].map(([field, label]) => (
                    <label key={field}><span>{label}</span><div><b>₹</b><input type="number" min="0" step="0.01" value={pricing[type][field]} onChange={(event) => change(type, field, event.target.value)} /></div></label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="pricing-help">
            <strong>How this works</strong>
            <p>These are the default prices shown in the upload preview. During every upload you can review or change the prices before importing the selected leads.</p>
          </div>

          <div className="pricing-actions"><button className="admin-primary-btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Pricing'}</button></div>
        </>
      )}
    </div>
  );
}
