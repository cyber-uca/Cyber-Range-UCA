import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const empty = { slug: '', title: '', description: '', color: '#22D3EE', sort_order: 0, is_active: true }

export default function AdminDomains() {
  const [domains, setDomains]     = useState([])
  const [paths, setPaths]         = useState([])
  const [form, setForm]           = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const refresh = () => {
    api.adminListDomains().then(setDomains).catch(() => {})
    api.listPaths().then(setPaths).catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  const upd = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked
      : e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const startEdit = d => {
    setEditingId(d.id)
    setForm({ slug: d.slug, title: d.title, description: d.description ?? '', color: d.color, sort_order: d.sort_order, is_active: d.is_active })
    setError(''); setSuccess('')
  }
  const cancelEdit = () => { setEditingId(null); setForm(empty); setError(''); setSuccess('') }

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      if (editingId) {
        await api.adminUpdateDomain(editingId, form)
        setSuccess('Domain updated.')
      } else {
        await api.adminCreateDomain(form)
        setSuccess('Domain created.')
      }
      setForm(empty); setEditingId(null); refresh()
    } catch (err) { setError(err.message) }
  }

  const remove = async id => {
    if (!confirm('Delete this domain? Paths assigned to it will become unassigned.')) return
    try { await api.adminDeleteDomain(id); refresh() }
    catch (err) { setError(err.message) }
  }

  const assignPath = async (pathId, domainId) => {
    try {
      await api.adminUpdatePath(pathId, { domain_id: domainId || null })
      refresh()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="page fade-up" style={{ paddingTop: 0 }}>

      <div className="ad-header">
        <div className="ad-header-bg" />
        <div>
          <div className="ad-eyebrow">Admin · Domains</div>
          <h1 className="ad-title">Domain Management</h1>
          <p className="ad-subtitle">Group learning paths by domain — Automotive, Smart Grid, Banking, and more.</p>
        </div>
      </div>

      {error   && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* Domain list */}
      <div className="card fade-up-1" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        {domains.length === 0
          ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-4)' }}>
              No domains yet. Create one below.
            </div>
          : <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Slug</th>
                  <th>Color</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Paths</th>
                  <th style={{ textAlign: 'right', paddingRight: 16 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map(d => {
                  const assigned = paths.filter(p => p.domain_id === d.id)
                  return (
                    <tr key={d.id} style={{ background: editingId === d.id ? 'rgba(34,211,238,0.02)' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{d.title}</div>
                            {d.description && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{d.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-4)' }}>{d.slug}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 4, background: d.color, border: '1px solid var(--border)' }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{d.color}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-3)' }}>{d.sort_order}</td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                          padding: '2px 8px', borderRadius: 3,
                          color: d.is_active ? 'var(--green)' : 'var(--text-4)',
                          background: d.is_active ? 'var(--green-dim)' : 'var(--surface-3)',
                          border: `1px solid ${d.is_active ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
                        }}>
                          {d.is_active ? 'Active' : 'Coming Soon'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-4)' }}>
                        {assigned.length > 0
                          ? assigned.map(p => p.title).join(', ')
                          : <span style={{ color: 'var(--text-4)', fontStyle: 'italic' }}>None</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn-secondary btn-sm"
                            style={{ color: editingId === d.id ? 'var(--cyan)' : undefined }}
                            onClick={() => editingId === d.id ? cancelEdit() : startEdit(d)}>
                            {editingId === d.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => remove(d.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        }
      </div>

      {/* Assign paths to domains */}
      {domains.length > 0 && paths.length > 0 && (
        <div className="card fade-up-2" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>
            Assign paths to domains
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Current Domain</th>
                <th>Change Domain</th>
              </tr>
            </thead>
            <tbody>
              {paths.map(p => {
                const currentDomain = domains.find(d => d.id === p.domain_id)
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-2)' }}>{p.title}</td>
                    <td>
                      {currentDomain
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: currentDomain.color }} />
                            <span style={{ fontSize: 12 }}>{currentDomain.title}</span>
                          </div>
                        : <span style={{ color: 'var(--text-4)', fontSize: 12, fontStyle: 'italic' }}>Unassigned</span>
                      }
                    </td>
                    <td>
                      <select
                        value={p.domain_id ?? ''}
                        onChange={e => assignPath(p.id, e.target.value)}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      >
                        <option value="">— Unassigned —</option>
                        {domains.map(d => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit form */}
      <div className="form-section fade-up-3"
        style={{ borderColor: editingId ? 'rgba(34,211,238,0.2)' : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: 'var(--text-2)' }}>{editingId ? 'Edit domain' : 'Add a domain'}</h3>
          {editingId && <button className="btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>}
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-row">
              <label>Title</label>
              <input value={form.title} onChange={upd('title')} required placeholder="e.g. Automotive" />
            </div>
            <div className="form-row">
              <label>Slug</label>
              <input value={form.slug} onChange={upd('slug')} required placeholder="e.g. automotive"
                style={{ fontFamily: 'var(--mono)' }} />
            </div>
            <div className="form-row">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color} onChange={upd('color')}
                  style={{ width: 48, height: 36, padding: 2, cursor: 'pointer' }} />
                <input value={form.color} onChange={upd('color')} placeholder="#22D3EE"
                  style={{ fontFamily: 'var(--mono)', flex: 1 }} />
              </div>
            </div>
            <div className="form-row">
              <label>Sort order</label>
              <input type="number" value={form.sort_order} onChange={upd('sort_order')} />
            </div>
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea rows={2} value={form.description} onChange={upd('description')}
              placeholder="Short description shown on the Roadmap tab" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 38, height: 21, cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              <div style={{ width: '100%', height: '100%', borderRadius: 999, transition: 'background .2s',
                background: form.is_active ? 'var(--cyan)' : 'var(--surface-4)',
                border: '1px solid var(--border-md)' }} />
              <div style={{ position: 'absolute', top: 2, width: 15, height: 15, borderRadius: '50%', background: '#fff',
                transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                left: form.is_active ? 20 : 2 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Active domain</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                Inactive domains show as "Coming Soon" on the Roadmap
              </div>
            </div>
          </div>
          <button className="btn-primary" type="submit">
            {editingId ? 'Save changes' : 'Create domain'}
          </button>
        </form>
      </div>
    </div>
  )
}
