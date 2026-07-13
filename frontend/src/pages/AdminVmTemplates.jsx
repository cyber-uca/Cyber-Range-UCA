import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`
const emptyForm = { name: '', description: '', zone: '', proxmox_template_id: '', default_tools: '' }

export default function AdminVmTemplates() {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)   // null = adding new, string = editing existing
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const refresh = () => api.adminListVmTemplates().then(setTemplates).catch(() => {})
  useEffect(() => { refresh() }, [])

  const update = k => e => setForm({ ...form, [k]: e.target.value })

  const startEdit = t => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      description: t.description ?? '',
      zone: t.zone,
      proxmox_template_id: String(t.proxmox_template_id),
      default_tools: t.default_tools ?? '',
    })
    setError(''); setSuccess('')
    // scroll to form
    setTimeout(() => document.getElementById('vm-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(''); setSuccess('') }

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    const payload = { ...form, proxmox_template_id: Number(form.proxmox_template_id) }
    try {
      if (editingId) {
        await api.adminUpdateVmTemplate(editingId, payload)
        setSuccess('Template updated.')
      } else {
        await api.adminCreateVmTemplate(payload)
        setSuccess('Template added.')
      }
      setForm(emptyForm); setEditingId(null); refresh()
    } catch (err) { setError(err.message) }
  }

  const remove = async id => {
    if (!confirm('Delete this VM template? This will fail if it is used by any challenge.')) return
    try { await api.adminDeleteVmTemplate(id); refresh() }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="page">
      <style>{ANIM}</style>

      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--warning)', fontWeight: 700 }}>Admin · Infrastructure</span>
        </div>
        <h1>VM Templates</h1>
        <p className="subtitle">Golden images cloned per learner session on Proxmox. Edit the Proxmox VMID here to match your actual template IDs.</p>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {/* Templates table */}
      <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', backdropFilter: 'blur(12px)', marginBottom: 20, animation: 'fadeUp .4s .05s ease both' }}>
        {templates.length === 0
          ? <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: .3 }}>🖥️</div>
              No VM templates yet. Add one below.
            </div>
          : <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Zone</th>
                  <th>Proxmox VMID</th>
                  <th>Default tools</th>
                  <th style={{ textAlign: 'right', paddingRight: 16 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ background: editingId === t.id ? 'rgba(0,194,230,0.04)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(245,166,35,0.1)',
                          border: `1px solid ${editingId === t.id ? 'rgba(0,194,230,0.4)' : 'rgba(245,166,35,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🖥️</div>
                        <div>
                          <span style={{ fontWeight: 600 }}>{t.name}</span>
                          {t.description && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{t.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--surface-2)',
                        padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        {t.zone}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                        {t.proxmox_template_id ?? '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.default_tools || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '5px 12px',
                            borderColor: editingId === t.id ? 'rgba(0,194,230,0.4)' : undefined,
                            color: editingId === t.id ? 'var(--accent)' : undefined }}
                          onClick={() => editingId === t.id ? cancelEdit() : startEdit(t)}>
                          {editingId === t.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button className="btn-danger" style={{ fontSize: 11, padding: '5px 12px' }}
                          onClick={() => remove(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Add / Edit form */}
      <div id="vm-form" className="form-section" style={{ animation: 'fadeUp .4s .1s ease both',
        borderColor: editingId ? 'rgba(0,194,230,0.3)' : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{editingId ? '✏️ Edit VM template' : 'Add a VM template'}</h2>
          {editingId && (
            <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={cancelEdit}>
              Cancel edit
            </button>
          )}
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-row"><label>Name</label><input value={form.name} onChange={update('name')} required placeholder="e.g. icsimrisk" /></div>
            <div className="form-row"><label>Zone</label><input value={form.zone} onChange={update('zone')} placeholder="CAN_Net" required /></div>
            <div className="form-row">
              <label>Proxmox template VMID</label>
              <input type="number" value={form.proxmox_template_id} onChange={update('proxmox_template_id')} required placeholder="e.g. 104" />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                Must match the VMID of a stopped VM or template in Proxmox
              </div>
            </div>
            <div className="form-row"><label>Default tools</label><input value={form.default_tools} onChange={update('default_tools')} placeholder="nmap, wireshark" /></div>
          </div>
          <div className="form-row"><label>Description</label><textarea rows={2} value={form.description} onChange={update('description')} placeholder="Brief description of this VM…" /></div>
          <button className="btn-primary" type="submit" style={{ padding: '10px 24px' }}>
            {editingId ? 'Save changes' : 'Add template'}
          </button>
        </form>
      </div>
    </div>
  )
}
