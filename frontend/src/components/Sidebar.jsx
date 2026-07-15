import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../App.jsx'

const NAV = [
  { to: '/',          label: 'Dashboard',        end: true  },
  { to: '/roadmap',   label: 'Roadmap'                      },
  { to: '/challenges',label: 'Challenges'                   },
  { to: '/leaderboard',label: 'Leaderboard'                 },
]
const TUTOR_NAV = [{ to: '/creator', label: 'Creator Studio' }]
const ADMIN_NAV = [
  { to: '/admin',              label: 'Overview',       end: true },
  { to: '/admin/content',      label: 'Content'                  },
  { to: '/admin/users',        label: 'Users'                    },
  { to: '/admin/vm-templates', label: 'Infrastructure'           },
  { to: '/admin/taxonomy',     label: 'Categories'               },
  { to: '/admin/settings',     label: 'Settings'                 },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  if (!user) return null
  const cls = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '')
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="mark">AR</div>
        <div>
          <div className="brand-name">AutoRange</div>
          <div className="brand-sub">Cyber Range</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} className={cls}>{n.label}</NavLink>
        ))}

        {(user.role === 'tutor' || user.role === 'admin') && (
          <>
            <div className="sidebar-section">Teaching</div>
            {TUTOR_NAV.map(n => <NavLink key={n.to} to={n.to} className={cls}>{n.label}</NavLink>)}
          </>
        )}

        {user.role === 'admin' && (
          <>
            <div className="sidebar-section">Admin</div>
            {ADMIN_NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={cls}>{n.label}</NavLink>)}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name truncate">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
        <button className="btn-ghost btn-sm" onClick={logout}
          style={{ padding: '5px 9px', fontSize: 11 }}>
          Out
        </button>
      </div>
    </div>
  )
}
