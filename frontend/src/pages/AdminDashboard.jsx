import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`

const AdminLink = ({ to, icon, label, desc, color = 'var(--accent)' }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <div style={{
      background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '20px 22px', backdropFilter: 'blur(12px)', cursor: 'pointer',
      transition: 'border-color .2s, box-shadow .2s, transform .15s',
      display: 'flex', alignItems: 'center', gap: 16,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color + '55'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.25)` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      <div style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 16 }}>→</div>
    </div>
  </Link>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => { api.adminStats().then(setStats).catch(() => {}) }, [])

  if (!stats) return (
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
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--offensive)', boxShadow: '0 0 8px var(--offensive)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--offensive)', fontWeight: 700 }}>Admin</span>
        </div>
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Platform health at a glance.</p>
      </div>

      {/* User stats */}
      <div style={{ marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, animation: 'fadeUp .4s .04s ease both' }}>Users</div>
      <div className="stat-grid" style={{ animation: 'fadeUp .4s .06s ease both' }}>
        <div className="stat-card"><div className="value">{stats.total_users}</div><div className="label">Total users</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--defensive)' }}>{stats.learners}</div><div className="label">Learners</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--combined)' }}>{stats.tutors}</div><div className="label">Tutors</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--mitigation)' }}>{stats.active_environments}</div><div className="label">Active environments</div></div>
      </div>

      {/* Challenge stats */}
      <div style={{ marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, animation: 'fadeUp .4s .08s ease both' }}>Content</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28, animation: 'fadeUp .4s .1s ease both' }}>
        <div className="stat-card"><div className="value">{stats.total_challenges}</div><div className="label">Total challenges</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--mitigation)' }}>{stats.published_challenges}</div><div className="label">Published</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--warning)' }}>{stats.vm_templates}</div><div className="label">VM templates</div></div>
      </div>

      {/* Quick links */}
      <div style={{ marginBottom: 14, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, animation: 'fadeUp .4s .12s ease both' }}>Management</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, animation: 'fadeUp .4s .14s ease both' }}>
        <AdminLink to="/admin/users" icon="👥" label="Manage Users" desc="Assign roles, activate or deactivate accounts" color="var(--defensive)" />
        <AdminLink to="/admin/vm-templates" icon="🖥️" label="Infrastructure" desc="VM templates cloned per learner session" color="var(--warning)" />
        <AdminLink to="/admin/taxonomy" icon="🏷️" label="Categories & Difficulties" desc="Data-driven taxonomy — no code changes needed" color="var(--mitigation)" />
        <AdminLink to="/admin/settings" icon="⚙️" label="Platform Settings" desc="Scoring defaults, platform name, hint penalties" color="var(--combined)" />
      </div>
    </div>
  )
}
