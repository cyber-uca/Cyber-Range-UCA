import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const emptyForm = { name: '', description: '', zone: '', proxmox_template_id: '', default_tools: '' }

export default function AdminVmTemplates() {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const refresh = () => api.adminListVmTemplates().then(setTemplates).catch(() => {})
  useEffect(() => { refresh() }, [])

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.adminCreateVmTemplate({ ...form, proxmox_template_id: Number(form.proxmox_template_id) })
      setForm(emptyForm)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    try { await api.adminDeleteVmTemplate(id); refresh() }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="page">
      <h1>Infrastructure Management</h1>
      <p className="subtitle">VM templates — the golden images cloned per learner session on Proxmox.</p>
      {error && <div className="error-msg">{error}</div>}

      <table className="data-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr><th>Name</th><th>Zone</th><th>Proxmox VMID</th><th>Tools</th><th></th></tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td className="mono" style={{ fontSize: 12 }}>{t.zone}</td>
              <td className="mono" style={{ fontSize: 12 }}>{t.proxmox_template_id ?? '—'}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.default_tools}</td>
              <td><button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => remove(t.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="form-section">
        <h2>Add a VM template</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-row"><label>Name</label><input value={form.name} onChange={update('name')} required /></div>
            <div className="form-row"><label>Zone</label><input value={form.zone} onChange={update('zone')} placeholder="Attack_Net" required /></div>
            <div className="form-row"><label>Proxmox template VMID</label><input type="number" value={form.proxmox_template_id} onChange={update('proxmox_template_id')} required /></div>
            <div className="form-row"><label>Default tools</label><input value={form.default_tools} onChange={update('default_tools')} placeholder="nmap, metasploit" /></div>
          </div>
          <div className="form-row"><label>Description</label><textarea rows={2} value={form.description} onChange={update('description')} /></div>
          <button className="btn-primary" type="submit">Add template</button>
        </form>
      </div>
    </div>
  )
}
