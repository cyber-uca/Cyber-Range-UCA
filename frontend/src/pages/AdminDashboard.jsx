import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const MGMT = [
  { to:'/admin/content',      label:'Content',        desc:'Paths, modules, rooms, tasks, questions', color:'var(--cyan)',   icon:'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { to:'/admin/users',        label:'Users',          desc:'Manage roles and account status',          color:'var(--violet)', icon:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { to:'/admin/vm-templates', label:'Infrastructure', desc:'VM templates for Proxmox cloning',         color:'var(--amber)',  icon:'M22 12H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11zM6 16h.01M10 16h.01' },
  { to:'/admin/taxonomy',     label:'Categories',     desc:'Data-driven taxonomy and difficulty',      color:'var(--teal)',   icon:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
  { to:'/admin/settings',     label:'Settings',       desc:'Platform defaults and scoring',             color:'var(--blue)',   icon:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
]

function StatCard({ val, label, color }) {
  return (
    <div className="ad-stat-card" style={{ '--sc': color }}>
      <div className="ad-stat-glow" />
      <div className="ad-stat-val">{val ?? 0}</div>
      <div className="ad-stat-lbl">{label}</div>
    </div>
  )
}

function MgmtCard({ to, label, desc, color, icon }) {
  const navigate = useNavigate()
  return (
    <div className="ad-mgmt-card" onClick={() => navigate(to)} style={{ '--mc': color }}>
      <div className="ad-mgmt-icon-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="ad-mgmt-body">
        <div className="ad-mgmt-label">{label}</div>
        <div className="ad-mgmt-desc">{desc}</div>
      </div>
      <span className="ad-mgmt-arrow">›</span>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => { api.adminStats().then(setStats).catch(() => {}) }, [])

  if (!stats) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page ad-page fade-up" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div className="ad-header">
        <div className="ad-header-bg" />
        <div>
          <div className="ad-eyebrow">Admin Panel</div>
          <h1 className="ad-title">Platform Overview</h1>
          <p className="ad-subtitle">Health and content at a glance.</p>
        </div>
      </div>

      {/* User stats */}
      <div className="ad-stat-section">
        <div className="ad-section-label">Users</div>
        <div className="ad-stats-grid">
          <StatCard val={stats.total_users}         label="Total users"    color="var(--cyan)"   />
          <StatCard val={stats.learners}            label="Learners"       color="var(--blue)"   />
          <StatCard val={stats.tutors}              label="Tutors"         color="var(--violet)" />
          <StatCard val={stats.active_environments} label="Active labs"    color="var(--green)"  />
        </div>
      </div>

      {/* Content stats */}
      <div className="ad-stat-section">
        <div className="ad-section-label">Content</div>
        <div className="ad-stats-grid">
          <StatCard val={stats.total_paths}  label="Paths"        color="var(--cyan)"   />
          <StatCard val={stats.total_rooms}  label="Rooms"        color="var(--teal)"   />
          <StatCard val={stats.total_tasks}  label="Tasks"        color="var(--blue)"   />
          <StatCard val={stats.vm_templates} label="VM Templates" color="var(--amber)"  />
        </div>
      </div>

      {/* Management links */}
      <div className="ad-section-label" style={{ marginBottom: 14 }}>Management</div>
      <div className="ad-mgmt-grid">
        {MGMT.map((m, i) => (
          <MgmtCard key={m.to} {...m} />
        ))}
      </div>
    </div>
  )
}
