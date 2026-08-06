import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../App.jsx'

// ── Inline SVG icons — no dependency ─────────────────────────────────────
const Icon = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    {Array.isArray(d)
      ? d.map((p, i) => p.startsWith('C') || p.startsWith('c')
          ? <circle key={i} {...parseCircle(p)} />
          : <path key={i} d={p} />)
      : <path d={d} />}
  </svg>
)

function parseCircle(s) {
  // format: "C cx cy r"
  const [, cx, cy, r] = s.split(' ')
  return { cx, cy, r }
}

const ICONS = {
  dashboard:    'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  roadmap:      'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  leaderboard:  'M18 20V10 M12 20V4 M6 20v-6',
  docs:         'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  challenges:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10',
  analytics:    'M18 20V10 M12 20V4 M6 20v-6',
  creator:      'M12 20h9 M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  overview:     ['M3 3h18v18H3z', 'M3 9h18', 'M9 21V9'],
  content:      'M4 6h16M4 10h16M4 14h16M4 18h16',
  users:        'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z',
  infra:        'M22 12H2 M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z M6 16h.01 M10 16h.01',
  categories:   'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  settings:     'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
}

const NAV_ALL = [
  { to: '/dashboard',   label: 'Dashboard',    icon: 'dashboard',   end: true },
  { to: '/roadmap',     label: 'Roadmap',      icon: 'roadmap'               },
  { to: '/leaderboard', label: 'Leaderboard',  icon: 'leaderboard'           },
  { to: '/docs',        label: 'Docs',         icon: 'docs'                  },
]
const NAV_LEARNER = [
  { to: '/challenges',  label: 'Challenges',   icon: 'challenges'  },
  { to: '/analytics',   label: 'Analytics',    icon: 'analytics'   },
]
const TUTOR_NAV = [
  { to: '/creator',     label: 'Creator',      icon: 'creator'     },
]
const ADMIN_NAV = [
  { to: '/admin',              label: 'Overview',      icon: 'overview',    end: true },
  { to: '/admin/content',      label: 'Content',       icon: 'content'               },
  { to: '/admin/domains',      label: 'Domains',       icon: 'roadmap'               },
  { to: '/admin/users',        label: 'Users',         icon: 'users'                 },
  { to: '/admin/vm-templates', label: 'Infrastructure',icon: 'infra'                 },
  { to: '/admin/taxonomy',     label: 'Categories',    icon: 'categories'            },
  { to: '/admin/settings',     label: 'Settings',      icon: 'settings'              },
]

function NavItem({ to, label, icon, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
      <Icon d={ICONS[icon] || ICONS.dashboard} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (!user) return null

  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const isLearner = user.role === 'learner'

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
        {open ? '✕' : '☰'}
      </button>

      <div className={`sidebar-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <div className={`sidebar${open ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <img src="/logo.jpeg" alt="CyberForge" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <div className="brand-name">CyberForge</div>
            <div className="brand-sub">Cyber Range</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ALL.map(n => <NavItem key={n.to} {...n} />)}

          {isLearner && NAV_LEARNER.map(n => <NavItem key={n.to} {...n} />)}

          {(user.role === 'tutor' || user.role === 'admin') && (
            <>
              <div className="sidebar-section">Teaching</div>
              {TUTOR_NAV.map(n => <NavItem key={n.to} {...n} />)}
            </>
          )}

          {user.role === 'admin' && (
            <>
              <div className="sidebar-section">Admin</div>
              {ADMIN_NAV.map(n => <NavItem key={n.to} {...n} />)}
            </>
          )}
        </nav>

        {/* Footer */}
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
