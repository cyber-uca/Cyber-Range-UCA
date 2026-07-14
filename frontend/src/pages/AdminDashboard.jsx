import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

const LINKS = [
  { to:'/admin/users',        label:'Users',             desc:'Assign roles, activate or deactivate accounts' },
  { to:'/admin/vm-templates', label:'Infrastructure',    desc:'VM templates cloned per learner session on Proxmox' },
  { to:'/admin/taxonomy',     label:'Categories',        desc:'Data-driven categories and difficulty levels' },
  { to:'/admin/settings',     label:'Platform Settings', desc:'Scoring defaults, platform name, hint penalties' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => { api.adminStats().then(setStats).catch(() => {}) }, [])

  if (!stats) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page fade-up">
      <div className="page-header">
        <h1>Admin Overview</h1>
        <p className="lead" style={{ marginTop:6 }}>Platform health at a glance.</p>
      </div>

      <h3 style={{ marginBottom:12, color:'var(--text-muted)', fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Users</h3>
      <div className="stat-row" style={{ marginBottom:28 }}>
        {[
          { val:stats.total_users,         lbl:'Total users',          color:'var(--accent)' },
          { val:stats.learners,            lbl:'Learners',             color:'var(--blue)'   },
          { val:stats.tutors,              lbl:'Tutors',               color:'var(--purple)' },
          { val:stats.active_environments, lbl:'Active environments',  color:'var(--green)'  },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="val" style={{ color:s.color }}>{s.val}</div>
            <div className="lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom:12, color:'var(--text-muted)', fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Content</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:36 }}>
        {[
          { val:stats.total_challenges,    lbl:'Total challenges' },
          { val:stats.published_challenges,lbl:'Published',       color:'var(--green)' },
          { val:stats.vm_templates,        lbl:'VM templates',    color:'var(--amber)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="val" style={{ color:s.color ?? 'var(--accent)' }}>{s.val}</div>
            <div className="lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom:14 }}>Management</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} style={{ textDecoration:'none' }}>
            <div className="card card-hover" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{l.label}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{l.desc}</div>
              </div>
              <span style={{ color:'var(--text-dim)', fontSize:18, marginLeft:12 }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
