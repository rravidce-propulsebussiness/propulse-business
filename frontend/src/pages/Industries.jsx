import { useEffect, useMemo, useState } from 'react'
import './Industries.css'

const API_URL = 'http://localhost:5000/api/industries'

function Industries() {
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [editingId, setEditingId] = useState(null)

  async function loadIndustries() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(API_URL)
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.error || 'Failed to fetch industries')
      setIndustries(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIndustries()
  }, [])

  const filteredIndustries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return industries

    return industries.filter((industry) =>
      [industry.name, industry.slug, industry.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [industries, search])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setSuccess('')
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
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim(),
    }

    if (!payload.name || !payload.slug) {
      setError('Industry name and slug are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 500 && data.error === 'Failed to create industry') {
          throw new Error('This industry may already exist. Check the name or slug and try again.')
        }
        throw new Error(data.error || 'Failed to save industry')
      }

      resetForm()
      setSuccess(editingId ? 'Industry updated successfully.' : 'Industry added successfully.')
      await loadIndustries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id) {
    const industry = industries.find((item) => item.id === id)
    if (!industry) return

    if (!window.confirm(`Deactivate “${industry.name}”?`)) return

    try {
      setError('')
      setSuccess('')
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate industry')

      if (editingId === id) resetForm()
      setSuccess('Industry deactivated successfully.')
      await loadIndustries()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="industries-page">
      <div className="industry-page-header">
        <div>
          <div className="eyebrow">MASTER DATA</div>
          <h1>Industries</h1>
          <p>Manage the industries that power your services, subservices and lead marketplace.</p>
        </div>
        <button
          type="button"
          className="primary-header-button"
          onClick={() => {
            resetForm()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span>+</span> Add Industry
        </button>
      </div>

      <div className="master-data-tabs" aria-label="Master data sections">
        <div className="master-data-tab active">Industries</div>
        <div className="master-data-tab disabled">Services <span>Next</span></div>
        <div className="master-data-tab disabled">Subservices <span>Next</span></div>
      </div>

      {error && <div className="industry-alert error-alert">{error}</div>}
      {success && <div className="industry-alert success-alert">{success}</div>}

      <div className="industry-stats">
        <div className="stat-card">
          <span className="stat-label">Active industries</span>
          <strong>{industries.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Search results</span>
          <strong>{filteredIndustries.length}</strong>
        </div>
        <div className="stat-card stat-info">
          <span className="stat-label">Hierarchy</span>
          <strong>Industry → Service → Subservice</strong>
        </div>
      </div>

      <div className="industry-workspace">
        <section className="industry-card form-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">INDUSTRY MASTER</span>
              <h2>{editingId ? 'Edit Industry' : 'Add Industry'}</h2>
              <p>{editingId ? 'Update the selected industry details.' : 'Create a top-level industry for your marketplace.'}</p>
            </div>
            {editingId && <span className="editing-badge">Editing</span>}
          </div>

          <form onSubmit={handleSubmit} className="industry-form">
            <label>
              Industry Name <span>*</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Interior Design"
                autoComplete="off"
                required
              />
            </label>

            <label>
              Slug <span>*</span>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="e.g. interior-design"
                autoComplete="off"
                required
              />
              <small>Use lowercase letters, numbers and hyphens.</small>
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Briefly describe this industry"
                rows="5"
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="save-button" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Industry' : 'Add Industry'}
              </button>
              {editingId && (
                <button type="button" className="secondary-button" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="industry-card list-card">
          <div className="section-heading list-heading">
            <div>
              <span className="section-kicker">DIRECTORY</span>
              <h2>Industry List</h2>
              <p>Active industries currently available in Propulse Business.</p>
            </div>
            <div className="count-badge">{industries.length}</div>
          </div>

          <div className="industry-search">
            <span className="search-icon">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by industry name, slug or description..."
              aria-label="Search industries"
            />
            {search && (
              <button type="button" className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty-state loading-state">Loading industries...</div>
          ) : filteredIndustries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⌂</div>
              <h3>{search ? 'No matching industries' : 'No industries yet'}</h3>
              <p>{search ? 'Try a different search term.' : 'Add your first industry using the form.'}</p>
            </div>
          ) : (
            <div className="industry-list">
              {filteredIndustries.map((industry) => (
                <article className="industry-row" key={industry.id}>
                  <div className="industry-main">
                    <div className="industry-icon">{industry.name.charAt(0).toUpperCase()}</div>
                    <div className="industry-details">
                      <div className="industry-title-line">
                        <h3>{industry.name}</h3>
                        <span className="active-badge">Active</span>
                      </div>
                      <p className="industry-slug">/{industry.slug}</p>
                      {industry.description && <p className="industry-description">{industry.description}</p>}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="edit-button" onClick={() => startEdit(industry)}>
                      Edit
                    </button>
                    <button type="button" className="danger-button" onClick={() => handleDeactivate(industry.id)}>
                      Deactivate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Industries
