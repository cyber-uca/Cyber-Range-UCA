import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [message,  setMessage]  = useState('')
  const [msgType,  setMsgType]  = useState('success')

  useEffect(() => { api.getSettings().then(setSettings).catch(() => {}) }, [])

  const upd = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked
      : e.target.type === 'number' ? Number(e.target.value)
      : e.target.value
    setSettings(s => ({ ...s, [k]: val }))
  }

  const save = async e => {
    e.preventDefault(); setMessage('')
    try {
      const updated = await api.updateSettings(settings)
      setSettings(updated); setMessage('Settings saved.'); setMsgType('success')
    } catch(err) { setMessage(err.message); setMsgType('error') }
  }

  if (!settings) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page fade-up">
      <div className="page-header">
        <h1>Platform Settings</h1>
        <p className="lead" style={{ marginTop:6 }}>Centralized configuration — scoring defaults and platform-wide options.</p>
      </div>

      {message && <div className={msgType === 'success' ? 'alert-success' : 'alert-error'}>{message}</div>}

      <form onSubmit={save} style={{ maxWidth:520 }}>
        <div className="form-section">
          <h3>General</h3>
          <div className="form-row">
            <label>Platform name</label>
            <input value={settings.platform_name} onChange={upd('platform_name')} />
          </div>
        </div>

        <div className="form-section">
          <h3>Scoring</h3>
          <div className="form-grid">
            <div className="form-row">
              <label>Default points</label>
              <input type="number" value={settings.default_points} onChange={upd('default_points')} />
            </div>
            <div className="form-row">
              <label>Default time limit (min)</label>
              <input type="number" value={settings.default_time_limit_minutes} onChange={upd('default_time_limit_minutes')} />
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)', marginTop:8 }}>
            <div style={{ position:'relative', width:36, height:20, cursor:'pointer', flexShrink:0 }}
              onClick={() => setSettings(s => ({ ...s, hint_penalties_enabled: !s.hint_penalties_enabled }))}>
              <div style={{ width:'100%', height:'100%', borderRadius:999, transition:'background .2s',
                background: settings.hint_penalties_enabled ? 'var(--accent)' : 'var(--surface-3)',
                border:'1px solid var(--border)' }} />
              <div style={{ position:'absolute', top:2, width:14, height:14, borderRadius:'50%', background:'#fff',
                transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,0.4)',
                left: settings.hint_penalties_enabled ? 18 : 2 }} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Hint point penalties</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Deduct points when learners unlock hints</div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Infrastructure</h3>
          <div className="form-row">
            <label>Provisioning backend <span style={{ fontSize:10, color:'var(--text-dim)', fontWeight:400 }}>(read-only — set via env)</span></label>
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface-2)',
              border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'9px 12px' }}>
              <div style={{ width:7, height:7, borderRadius:'50%',
                background: settings.provisioning_backend === 'proxmox' ? 'var(--green)' : 'var(--amber)',
                boxShadow: `0 0 5px ${settings.provisioning_backend === 'proxmox' ? 'var(--green)' : 'var(--amber)'}` }} />
              <span style={{ fontFamily:'var(--mono)', fontSize:13 }}>{settings.provisioning_backend}</span>
            </div>
          </div>
        </div>

        <button className="btn-primary" type="submit" style={{ padding:'11px 28px', fontSize:14 }}>
          Save settings
        </button>
      </form>
    </div>
  )
}
