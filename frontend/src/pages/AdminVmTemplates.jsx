import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const empty = { name:'', description:'', zone:'', proxmox_template_id:'', default_tools:'' }

export default function AdminVmTemplates() {
  const [templates, setTemplates] = useState([])
  const [form, setForm]           = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const refresh = () => api.adminListVmTemplates().then(setTemplates).catch(() => {})
  useEffect(() => { refresh() }, [])

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const startEdit = t => {
    setEditingId(t.id)
    setForm({ name:t.name, description:t.description??'', zone:t.zone,
      proxmox_template_id:String(t.proxmox_template_id), default_tools:t.default_tools??'' })
    setError(''); setSuccess('')
    setTimeout(() => document.getElementById('vm-form')?.scrollIntoView({ behavior:'smooth', block:'start' }), 60)
  }
  const cancelEdit = () => { setEditingId(null); setForm(empty); setError(''); setSuccess('') }

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    const payload = { ...form, proxmox_template_id:Number(form.proxmox_template_id) }
    try {
      if (editingId) { await api.adminUpdateVmTemplate(editingId,payload); setSuccess('Template updated.') }
      else           { await api.adminCreateVmTemplate(payload);           setSuccess('Template added.')   }
      setForm(empty); setEditingId(null); refresh()
    } catch(err) { setError(err.message) }
  }

  const remove = async id => {
    if (!confirm('Delete this VM template?')) return
    try { await api.adminDeleteVmTemplate(id); refresh() }
    catch(err) { setError(err.message) }
  }

  return (
    <div className="page fade-up">
      <div style={{ marginBottom:32 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>Admin</p>
        <h1 style={{ fontSize:28, marginBottom:8 }}>VM Templates</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>Golden images cloned per learner session on Proxmox.</p>
      </div>

      {error   && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="card fade-up-1" style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
        {templates.length === 0
          ? <div style={{ padding:'40px', textAlign:'center', color:'var(--text-4)' }}>No VM templates yet. Add one below.</div>
          : <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Zone</th>
                  <th>Proxmox VMID</th>
                  <th>Tools</th>
                  <th style={{ textAlign:'right', paddingRight:16 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ background:editingId===t.id?'rgba(34,211,238,0.02)':'transparent' }}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--text-2)' }}>{t.name}</div>
                      {t.description && <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>{t.description}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--surface-3)',
                        padding:'2px 8px', borderRadius:'var(--r-xs)', color:'var(--text-4)' }}>
                        {t.zone}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:800, color:'var(--cyan)' }}>
                        {t.proxmox_template_id ?? '—'}
                      </span>
                    </td>
                    <td style={{ color:'var(--text-4)', fontSize:12 }}>{t.default_tools||'—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="btn-secondary btn-sm"
                          style={{ color:editingId===t.id?'var(--cyan)':undefined }}
                          onClick={() => editingId===t.id ? cancelEdit() : startEdit(t)}>
                          {editingId===t.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => remove(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <div id="vm-form" className="form-section fade-up-2"
        style={{ borderColor:editingId?'rgba(34,211,238,0.2)':'var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ margin:0, color:'var(--text-2)' }}>{editingId ? 'Edit template' : 'Add a VM template'}</h3>
          {editingId && <button className="btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>}
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-row"><label>Name</label><input value={form.name} onChange={upd('name')} required placeholder="e.g. icsimrisk" /></div>
            <div className="form-row"><label>Zone</label><input value={form.zone} onChange={upd('zone')} placeholder="CAN_Net" required /></div>
            <div className="form-row">
              <label>Proxmox VMID</label>
              <input type="number" value={form.proxmox_template_id} onChange={upd('proxmox_template_id')} required placeholder="e.g. 104" />
            </div>
            <div className="form-row"><label>Default tools</label><input value={form.default_tools} onChange={upd('default_tools')} placeholder="nmap, wireshark" /></div>
          </div>
          <div className="form-row"><label>Description</label><textarea rows={2} value={form.description} onChange={upd('description')} placeholder="Brief description…" /></div>
          <button className="btn-primary" type="submit">{editingId ? 'Save changes' : 'Add template'}</button>
        </form>
      </div>
    </div>
  )
}
