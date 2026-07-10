import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('success')

  useEffect(() => { api.getSettings().then(setSettings).catch(() => {}) }, [])

  const update = k => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked
      : e.target.type === 'number' ? Number(e.target.value)
      : e.target.value
    setSettings({ ...settings, [k]: value })
  }

  const save = async e => {
    e.preventDefault(); setMessage('')
    try {
      const updated = await api.updateSettings(settings)
      setSettings(updated); setMessage('Settings saved.'); setMsgType('success')
    } catch (err) { setMessage(err.message); setMsgType('error') }
  }

  if (!settings) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
      </div>
    </div>
  )

  return (
    <div className="page">
      <style>{ANIM}</style>

      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--combined)', boxShadow: '0 0 8px var(--combined)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--combined)', fontWeight: 700 }}>Admin · Settings</span>
        </div>
        <h1>Platform Settings</h1>
        <p className="subtitle">Centralized configuration — scoring defaults and platform-wide options.</p>
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20,
          background: msgType === 'success' ? 'var(--mitigation-dim)' : 'var(--offensive-dim)',
          color: msgType === 'success' ? 'var(--mitigation)' : 'var(--offensive)',
          border: `1px solid ${msgType === 'success' ? 'rgba(20,201,168,0.3)' : 'rgba(240,82,74,0.3)'}`,
          animation: 'fadeUp .3s ease both',
        }}>{message}</div>
      )}

      <form onSubmit={save} style={{ maxWidth: 520, animation: 'fadeUp .4s .05s ease both' }}>
        <div className="form-section">
          <h2>General</h2>
          <div className="form-row">
            <label>Platform name</label>
            <input value={settings.platform_name} onChange={update('platform_name')} />
          </div>
        </div>

        <div className="form-section">
          <h2>Scoring defaults</h2>
          <div className="form-grid">
            <div className="form-row">
              <label>Default points for new challenges</label>
              <input type="number" value={settings.default_points} onChange={update('default_points')} />
            </div>
            <div className="form-row">
              <label>Default time limit (minutes)</label>
              <input type="number" value={settings.default_time_limit_minutes} onChange={update('default_time_limit_minutes')} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <div style={{ position: 'relative', width: 36, height: 20, cursor: 'pointer', flexShrink: 0 }} onClick={() => setSettings({ ...settings, hint_penalties_enabled: !settings.hint_penalties_enabled })}>
              <div style={{ width: '100%', height: '100%', borderRadius: 999, background: settings.hint_penalties_enabled ? 'var(--accent)' : 'var(--surface-hover)', transition: 'background .2s', border: '1px solid var(--border)' }} />
              <div style={{ position: 'absolute', top: 2, left: settings.hint_penalties_enabled ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Hint point penalties</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Deduct points when learners unlock hints</div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Infrastructure</h2>
          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Provisioning backend
              <span style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 400 }}>read-only</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 13px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: settings.provisioning_backend === 'proxmox' ? 'var(--success)' : 'var(--warning)', boxShadow: `0 0 6px ${settings.provisioning_backend === 'proxmox' ? 'var(--success)' : 'var(--warning)'}` }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)' }}>{settings.provisioning_backend}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>— set via PROVISIONING_BACKEND env var</span>
            </div>
          </div>
        </div>

        <button className="btn-primary" type="submit" style={{ padding: '11px 28px', fontSize: 14 }}>Save settings</button>
      </form>
    </div>
  )
}
