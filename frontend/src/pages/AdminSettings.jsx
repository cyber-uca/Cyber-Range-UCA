import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {})
  }, [])

  const update = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked
      : e.target.type === 'number' ? Number(e.target.value)
      : e.target.value
    setSettings({ ...settings, [k]: value })
  }

  const save = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const updated = await api.updateSettings(settings)
      setSettings(updated)
      setMessage('Settings saved.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  if (!settings) return <div className="page">Loading…</div>

  return (
    <div className="page">
      <h1>Platform Settings</h1>
      <p className="subtitle">
        Centralized configuration — scoring defaults and platform-wide options live here instead of
        being scattered constants in the code.
      </p>
      {message && <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 16 }}>{message}</p>}

      <form onSubmit={save} className="form-section" style={{ maxWidth: 480 }}>
        <div className="form-row">
          <label>Platform name</label>
          <input value={settings.platform_name} onChange={update('platform_name')} />
        </div>
        <div className="form-row">
          <label>Default points for new challenges</label>
          <input type="number" value={settings.default_points} onChange={update('default_points')} />
        </div>
        <div className="form-row">
          <label>Default time limit (minutes)</label>
          <input type="number" value={settings.default_time_limit_minutes} onChange={update('default_time_limit_minutes')} />
        </div>
        <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={settings.hint_penalties_enabled} onChange={update('hint_penalties_enabled')} />
          <label style={{ margin: 0 }}>Hint point penalties enabled</label>
        </div>
        <div className="form-row">
          <label>Provisioning backend (informational — set via PROVISIONING_BACKEND env var)</label>
          <input value={settings.provisioning_backend} disabled />
        </div>
        <button className="btn-primary" type="submit">Save settings</button>
      </form>
    </div>
  )
}
