import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../App.jsx'

const NAV_ALL = [
  { to: '/dashboard', label: 'Dashboard',  end: true },
  { to: '/roadmap',   label: 'Roadmap'              },
  { to: '/leaderboard',label: 'Leaderboard'          },
]
const NAV_LEARNER = [
  { to: '/challenges',  label: 'Challenges'  },
  { to: '/analytics',   label: 'Analytics'   },
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
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (!user) return null

  const cls = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '')
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const isLearner = user.role === 'learner'

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Overlay — closes sidebar when tapped */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="mark">AR</div>
          <div>
            <div className="brand-name">AutoRange</div>
            <div className="brand-sub">Cyber Range</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ALL.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} className={cls}>{n.label}</NavLink>
          ))}

          {isLearner && NAV_LEARNER.map(n => (
            <NavLink key={n.to} to={n.to} className={cls}>{n.label}</NavLink>
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
    </>
  )
}
