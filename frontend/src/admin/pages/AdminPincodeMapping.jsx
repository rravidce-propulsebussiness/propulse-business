import { useEffect, useState } from 'react';
import { authRequest } from '../../utils/auth';
import './AdminPincodeMapping.css';

const list = value => Array.isArray(value) ? value : (Array.isArray(value?.data) ? value.data : []);

export default function AdminPincodeMapping() {
  const [pins, setPins] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState({});

  async function load() {
    try {
      setLoading(true); setError('');
      const [unmapped, cityRows] = await Promise.all([authRequest('/pincodes/unmapped'), authRequest('/cities')]);
      setPins(list(unmapped)); setCities(list(cityRows));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)load()}); return()=>{active=false}; }, []);

  async function detect(pin) {
    try {
      setBusy(pin); setError('');
      await authRequest('/pincodes/detect', { method: 'POST', body: JSON.stringify({ pincode: pin }) });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  async function save(pin) {
    const cityId = selected[pin];
    if (!cityId) return setError('Select a Propulse City first.');
    try {
      setBusy(pin); setError('');
      const result = await authRequest(`/pincodes/${pin}/map-city`, { method: 'POST', body: JSON.stringify({ cityId: Number(cityId) }) });
      await load();
      window.alert(`${pin} mapped to ${result?.city?.name || 'city'}. ${result?.updatedLeadCount || 0} existing leads were updated.`);
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  const citiesFor = pin => cities.filter(c => !pin.state_name || String(c.state_name || '').toLowerCase() === String(pin.state_name || '').toLowerCase());

  return <main className="pin-map-page">
    <section className="pin-map-hero"><div><span>POSTAL DIRECTORY</span><h1>PIN → City Mapping</h1><p>New PINs are enriched from India Post and mapped only when the city match is safe.</p></div><button onClick={load} disabled={loading}>↻ Refresh</button></section>
    {error && <div className="pin-map-error">{error}</div>}
    {loading ? <div className="pin-map-empty">Loading detected PINs…</div> : !pins.length ? <div className="pin-map-empty"><strong>All detected PINs are mapped.</strong><span>Future lead syncs will reuse the saved mapping automatically.</span></div> :
      <div className="pin-map-list">{pins.map(pin => <article className="pin-card" key={pin.pincode}>
        <div className="pin-card-top"><div><span className="pin-label">NEW PIN DETECTED — MAP TO CITY</span><h2>{pin.pincode}</h2><p>{pin.state_name || 'State unavailable'}{pin.district_name ? ` · ${pin.district_name}` : ''}</p></div><button onClick={() => detect(pin.pincode)} disabled={busy===pin.pincode}>{busy===pin.pincode?'Working…':'Refresh India Post'}</button></div>
        <div className="postal-areas"><span>Postal Areas</span><div>{(pin.postal_areas || []).map(area => <b key={area}>{area}</b>)}</div></div>
        <div className="pin-map-form"><label>Propulse City<select value={selected[pin.pincode] || ''} onChange={e => setSelected(x => ({...x,[pin.pincode]:e.target.value}))}><option value="">Select City</option>{citiesFor(pin).map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label><button className="save-pin" onClick={() => save(pin.pincode)} disabled={busy===pin.pincode || !selected[pin.pincode]}>{busy===pin.pincode?'Saving…':'Save PIN Mapping'}</button></div>
      </article>)}</div>}
  </main>;
}
