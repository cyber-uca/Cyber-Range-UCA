import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../App.jsx'

export default function Sidebar() {
  const { user, logout } = useAuth()
  if (!user) return null

  const link = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`
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
        <NavLink to="/" end className={link}>Dashboard</NavLink>
        <NavLink to="/roadmap" className={link}>Learning Roadmap</NavLink>
        <NavLink to="/challenges" className={link}>All Challenges</NavLink>
        <NavLink to="/leaderboard" className={link}>Leaderboard</NavLink>

        {(user.role === 'tutor' || user.role === 'admin') && (
          <>
            <div className="sidebar-section">Teaching</div>
            <NavLink to="/creator" className={link}>Challenge Creator</NavLink>
          </>
        )}

        {user.role === 'admin' && (
          <>
            <div className="sidebar-section">Admin</div>
            <NavLink to="/admin" end className={link}>Overview</NavLink>
            <NavLink to="/admin/users" className={link}>Users</NavLink>
            <NavLink to="/admin/vm-templates" className={link}>Infrastructure</NavLink>
            <NavLink to="/admin/taxonomy" className={link}>Categories</NavLink>
            <NavLink to="/admin/settings" className={link}>Settings</NavLink>
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
          style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
          Out
        </button>
      </div>
    </div>
  )
}
