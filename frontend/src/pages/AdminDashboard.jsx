import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {})
  }, [])

  if (!stats) return <div className="page">Loading…</div>

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      <p className="subtitle">Platform health at a glance.</p>

      <div className="stat-grid">
        <div className="stat-card"><div className="value">{stats.total_users}</div><div className="label">Total users</div></div>
        <div className="stat-card"><div className="value">{stats.learners}</div><div className="label">Learners</div></div>
        <div className="stat-card"><div className="value">{stats.tutors}</div><div className="label">Tutors</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--mitigation)' }}>{stats.active_environments}</div><div className="label">Active environments</div></div>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="value">{stats.total_challenges}</div><div className="label">Total challenges</div></div>
        <div className="stat-card"><div className="value">{stats.published_challenges}</div><div className="label">Published challenges</div></div>
        <div className="stat-card"><div className="value">{stats.vm_templates}</div><div className="label">VM templates</div></div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link to="/admin/users" className="btn-secondary" style={{ textDecoration: 'none' }}>Manage users →</Link>
        <Link to="/admin/vm-templates" className="btn-secondary" style={{ textDecoration: 'none' }}>Manage VM templates →</Link>
        <Link to="/admin/taxonomy" className="btn-secondary" style={{ textDecoration: 'none' }}>Categories & difficulties →</Link>
        <Link to="/admin/settings" className="btn-secondary" style={{ textDecoration: 'none' }}>Platform settings →</Link>
      </div>
    </div>
  )
}
