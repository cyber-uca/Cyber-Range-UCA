import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

const LINKS = [
  { to:'/admin/content',       label:'Content',          desc:'Paths, modules, rooms, tasks, questions' },
  { to:'/admin/users',         label:'Users',            desc:'Manage roles and account status' },
  { to:'/admin/vm-templates',  label:'Infrastructure',   desc:'VM templates for Proxmox cloning' },
  { to:'/admin/taxonomy',      label:'Categories',       desc:'Data-driven taxonomy' },
  { to:'/admin/settings',      label:'Settings',         desc:'Platform defaults and scoring' },
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
      <div style={{ marginBottom:36 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>
          Admin
        </p>
        <h1 style={{ fontSize:28, marginBottom:8 }}>Platform Overview</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>Health and content at a glance.</p>
      </div>

      <div className="stat-row fade-up-1">
        {[
          { val:stats.total_users,         lbl:'Total users',         color:'var(--cyan)'   },
          { val:stats.learners,            lbl:'Learners',            color:'var(--blue)'   },
          { val:stats.tutors,              lbl:'Tutors',              color:'var(--violet)' },
          { val:stats.active_environments, lbl:'Active labs',         color:'var(--green)'  },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="val" style={{ color:s.color }}>{s.val}</div>
            <div className="lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:36 }}>
        {[
          { val:stats.total_paths,     lbl:'Paths',      color:'var(--cyan)'   },
          { val:stats.total_rooms,     lbl:'Rooms',      color:'var(--teal)'   },
          { val:stats.total_tasks,     lbl:'Tasks',      color:'var(--blue)'   },
          { val:stats.vm_templates,    lbl:'VM templates',color:'var(--amber)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card fade-up-2">
            <div className="val" style={{ color:s.color }}>{s.val ?? 0}</div>
            <div className="lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize:16, marginBottom:16, color:'var(--text-3)' }}>Management</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
        {LINKS.map((l,i) => (
          <Link key={l.to} to={l.to} style={{ textDecoration:'none' }}>
            <div className="card card-hover fade-up"
              style={{ animationDelay:`${i*.05}s`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4, color:'var(--text)' }}>{l.label}</div>
                <div style={{ fontSize:12, color:'var(--text-4)' }}>{l.desc}</div>
              </div>
              <span style={{ color:'var(--text-4)', fontSize:18 }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
