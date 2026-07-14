import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [message, setMessage]   = useState('')
  const [msgType, setMsgType]   = useState('success')

  useEffect(() => { api.getSettings().then(setSettings).catch(() => {}) }, [])

  const upd = k => e => {
    const val = e.target.type==='checkbox' ? e.target.checked
      : e.target.type==='number' ? Number(e.target.value) : e.target.value
    setSettings(s => ({ ...s, [k]:val }))
  }

  const save = async e => {
    e.preventDefault(); setMessage('')
    try { const u = await api.updateSettings(settings); setSettings(u); setMessage('Settings saved.'); setMsgType('success') }
    catch(err) { setMessage(err.message); setMsgType('error') }
  }

  if (!settings) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page fade-up">
      <div style={{ marginBottom:32 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>Admin</p>
        <h1 style={{ fontSize:28, marginBottom:8 }}>Platform Settings</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>Centralized configuration for the entire platform.</p>
      </div>

      {message && <div className={msgType==='success'?'alert-success':'alert-error'}>{message}</div>}

      <form onSubmit={save} style={{ maxWidth:540 }}>
        <div className="form-section fade-up-1">
          <h3 style={{ color:'var(--text-2)' }}>General</h3>
          <div className="form-row">
            <label>Platform name</label>
            <input value={settings.platform_name} onChange={upd('platform_name')} />
          </div>
        </div>

        <div className="form-section fade-up-2">
          <h3 style={{ color:'var(--text-2)' }}>Scoring</h3>
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

          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderTop:'1px solid var(--border)', marginTop:6 }}>
            <div style={{ position:'relative', width:38, height:21, cursor:'pointer', flexShrink:0 }}
              onClick={() => setSettings(s => ({ ...s, hint_penalties_enabled:!s.hint_penalties_enabled }))}>
              <div style={{ width:'100%', height:'100%', borderRadius:999, transition:'background .2s',
                background:settings.hint_penalties_enabled?'var(--cyan)':'var(--surface-4)',
                border:'1px solid var(--border-md)' }} />
              <div style={{ position:'absolute', top:2, width:15, height:15, borderRadius:'50%', background:'#fff',
                transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,0.4)',
                left:settings.hint_penalties_enabled?20:2 }} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-2)' }}>Hint point penalties</div>
              <div style={{ fontSize:12, color:'var(--text-4)' }}>Deduct points when learners unlock hints</div>
            </div>
          </div>
        </div>

        <div className="form-section fade-up-3">
          <h3 style={{ color:'var(--text-2)' }}>Infrastructure</h3>
          <div className="form-row">
            <label>Provisioning backend <span style={{ fontWeight:400, color:'var(--text-4)' }}>(set via env var)</span></label>
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface-3)',
              border:'1px solid var(--border-md)', borderRadius:'var(--r-sm)', padding:'9px 13px' }}>
              <div style={{ width:7, height:7, borderRadius:'50%',
                background:settings.provisioning_backend==='proxmox'?'var(--green)':'var(--amber)',
                boxShadow:`0 0 6px ${settings.provisioning_backend==='proxmox'?'var(--green)':'var(--amber)'}` }} />
              <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text-2)' }}>{settings.provisioning_backend}</span>
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
