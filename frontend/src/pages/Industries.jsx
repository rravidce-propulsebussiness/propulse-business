import { useEffect, useState } from 'react'
import './Industries.css'

const API_URL = 'http://localhost:5000/api/industries'

function Industries() {
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [editingId, setEditingId] = useState(null)

  async function loadIndustries() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error('Failed to fetch industries')
      setIndustries(await response.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIndustries()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetForm() {
    setForm({ name: '', slug: '', description: '' })
    setEditingId(null)
  }

  function startEdit(industry) {
    setEditingId(industry.id)
    setForm({
      name: industry.name,
      slug: industry.slug,
      description: industry.description || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save industry')
      resetForm()
      await loadIndustries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('Deactivate this industry?')) return
    try {
      setError('')
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate industry')
      await loadIndustries()
      if (editingId === id) resetForm()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="industries-page">
      <div className="page-header">
        <div>
          <h1>Industries</h1>
          <p>Manage the industry master data used across Propulse Business.</p>
        </div>
      </div>

      {error && <div className="industry-error">{error}</div>}

      <div className="industry-grid">
        <section className="industry-card">
          <div className="card-heading">
            <h2>{editingId ? 'Edit Industry' : 'Add Industry'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="industry-form">
            <label>
              Industry Name
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Interior Design" required />
            </label>
            <label>
              Slug
              <input name="slug" value={form.slug} onChange={handleChange} placeholder="e.g. interior-design" required />
            </label>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Optional description" rows="4" />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Industry' : 'Add Industry'}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="industry-card">
          <div className="card-heading">
            <h2>Industry List</h2>
            <span>{industries.length}</span>
          </div>
          {loading ? (
            <p className="empty-state">Loading industries...</p>
          ) : industries.length === 0 ? (
            <p className="empty-state">No active industries found.</p>
          ) : (
            <div className="industry-list">
              {industries.map((industry) => (
                <div className="industry-row" key={industry.id}>
                  <div>
                    <h3>{industry.name}</h3>
                    <p>{industry.slug}</p>
                    {industry.description && <small>{industry.description}</small>}
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => startEdit(industry)}>Edit</button>
                    <button type="button" className="danger-button" onClick={() => handleDeactivate(industry.id)}>Deactivate</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Industries
