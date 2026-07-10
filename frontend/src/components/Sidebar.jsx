import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import {
  IconDashboard, IconChallenges, IconRankings, IconCreator,
  IconAdmin, IconSettings, IconLogout, IconUsers, IconServer,
} from './Icons.jsx'

const IconRoadmap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

export default function Sidebar() {
  const { user, logout } = useAuth()
  if (!user) return null

  const linkClass = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark">AR</div>
        <div>
          <div className="name">AutoRange</div>
          <div className="tagline">Cyber Range</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <NavLink to="/" end className={linkClass}><span className="icon"><IconDashboard /></span>Dashboard</NavLink>
        <NavLink to="/roadmap" className={linkClass}><span className="icon"><IconRoadmap /></span>Roadmap</NavLink>
        <NavLink to="/challenges" className={linkClass}><span className="icon"><IconChallenges /></span>Challenges</NavLink>
        <NavLink to="/leaderboard" className={linkClass}><span className="icon"><IconRankings /></span>Leaderboard</NavLink>

        {(user.role === 'tutor' || user.role === 'admin') && (
          <>
            <div className="sidebar-section-label">Teaching</div>
            <NavLink to="/creator" className={linkClass}><span className="icon"><IconCreator /></span>Creator</NavLink>
          </>
        )}

        {user.role === 'admin' && (
          <>
            <div className="sidebar-section-label">Admin</div>
            <NavLink to="/admin" end className={linkClass}><span className="icon"><IconAdmin /></span>Overview</NavLink>
            <NavLink to="/admin/users" className={linkClass}><span className="icon"><IconUsers /></span>Users</NavLink>
            <NavLink to="/admin/vm-templates" className={linkClass}><span className="icon"><IconServer /></span>Infrastructure</NavLink>
            <NavLink to="/admin/taxonomy" className={linkClass}><span className="icon"><IconSettings /></span>Categories</NavLink>
            <NavLink to="/admin/settings" className={linkClass}><span className="icon"><IconSettings /></span>Settings</NavLink>
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="avatar-chip">{initials}</div>
        <div style={{ flex: 1 }}>
          <div className="who">{user.name}</div>
          <div className="role">{user.role[0].toUpperCase() + user.role.slice(1)}</div>
        </div>
        <button className="btn-secondary" style={{ padding: '6px 8px' }} onClick={logout} title="Log out">
          <IconLogout />
        </button>
      </div>
    </div>
  )
}
