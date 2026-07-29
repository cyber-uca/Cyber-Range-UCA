import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const ROLE_STYLE = {
  admin:   { color: 'var(--red)',    bg: 'rgba(248,113,113,0.1)',   border: 'rgba(248,113,113,0.25)'  },
  tutor:   { color: 'var(--violet)', bg: 'var(--violet-dim)',       border: 'rgba(167,139,250,0.25)'  },
  learner: { color: 'var(--cyan)',   bg: 'var(--cyan-dim)',         border: 'rgba(34,211,238,0.2)'    },
}

function RolePill({ role }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.learner
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.06em', padding: '2px 8px',
      borderRadius: 'var(--r-full)',
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      {role}
    </span>
  )
}

function UserAvatar({ name, role }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.learner
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800,
    }}>
      {initials}
    </div>
  )
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers]   = useState([])
  const [search, setSearch] = useState('')
  const [error, setError]   = useState('')

  const refresh = () => api.adminListUsers().then(setUsers).catch(() => {})
  useEffect(() => { refresh() }, [])

  const changeRole   = async (id, role)    => { try { await api.adminUpdateUserRole(id, role);       refresh() } catch (e) { setError(e.message) } }
  const toggleActive = async (id, current) => { try { await api.adminUpdateUserActive(id, !current); refresh() } catch (e) { setError(e.message) } }

  const visible = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:    users.length,
    learners: users.filter(u => u.role === 'learner').length,
    tutors:   users.filter(u => u.role === 'tutor').length,
    admins:   users.filter(u => u.role === 'admin').length,
    active:   users.filter(u => u.is_active).length,
  }

  return (
    <div className="page au-page fade-up" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div className="au-header">
        <div className="au-header-bg" />
        <div className="au-header-left">
          <div className="au-eyebrow">Admin · Users</div>
          <h1 className="au-title">User Management</h1>
          <p className="au-subtitle">Manage roles and account status.</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="au-stats">
        {[
          { val: stats.total,    lbl: 'Total',    color: 'var(--text-2)' },
          { val: stats.learners, lbl: 'Learners', color: 'var(--cyan)'   },
          { val: stats.tutors,   lbl: 'Tutors',   color: 'var(--violet)' },
          { val: stats.admins,   lbl: 'Admins',   color: 'var(--red)'    },
          { val: stats.active,   lbl: 'Active',   color: 'var(--green)'  },
        ].map(s => (
          <div key={s.lbl} className="au-stat">
            <span className="au-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="au-stat-lbl">{s.lbl}</span>
          </div>
        ))}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Search + count */}
      <div className="au-toolbar">
        <div className="au-search-wrap">
          <svg className="au-search-icon" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="au-search"
          />
        </div>
        <span className="au-count">{visible.length} users</span>
      </div>

      {/* Table */}
      <div className="card au-table-wrap" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table au-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Institution</th>
              <th>Role</th>
              <th style={{ textAlign: 'right' }}>XP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id} className={!u.is_active ? 'au-row-inactive' : ''}>
                <td>
                  <div className="au-user-cell">
                    <UserAvatar name={u.name} role={u.role} />
                    <div className="au-user-info">
                      <span className="au-user-name">{u.name}</span>
                      {!u.is_active && <span className="au-inactive-badge">Inactive</span>}
                    </div>
                  </div>
                </td>
                <td className="au-email">{u.email}</td>
                <td className="au-institution">{u.institution || '—'}</td>
                <td>
                  <div className="au-role-cell">
                    <RolePill role={u.role} />
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="au-role-select"
                      title="Change role"
                    >
                      <option value="learner">Learner</option>
                      <option value="tutor">Tutor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </td>
                <td className="au-xp">{u.points}</td>
                <td>
                  <button
                    disabled={u.id === me.id}
                    className={`btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'} au-status-btn`}
                    onClick={() => toggleActive(u.id, u.is_active)}
                  >
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="au-empty-row">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
