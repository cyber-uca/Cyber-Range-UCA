import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`

const roleBadge = role => {
  const map = { admin: { bg: 'var(--offensive-dim)', color: 'var(--offensive)', border: 'rgba(240,82,74,0.25)' }, tutor: { bg: 'var(--defensive-dim)', color: 'var(--defensive)', border: 'rgba(74,144,240,0.25)' }, learner: { bg: 'rgba(126,143,163,0.12)', color: 'var(--text-muted)', border: 'rgba(126,143,163,0.2)' } }
  const s = map[role] || map.learner
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, letterSpacing: '.04em', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{role}</span>
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const refresh = () => api.adminListUsers().then(setUsers).catch(() => {})
  useEffect(() => { refresh() }, [])

  const changeRole = async (id, role) => { try { await api.adminUpdateUserRole(id, role); refresh() } catch (err) { setError(err.message) } }
  const toggleActive = async (id, current) => { try { await api.adminUpdateUserActive(id, !current); refresh() } catch (err) { setError(err.message) } }

  const visible = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <style>{ANIM}</style>

      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--defensive)', boxShadow: '0 0 8px var(--defensive)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--defensive)', fontWeight: 700 }}>Admin · Users</span>
        </div>
        <h1>User Management</h1>
        <p className="subtitle">Assign roles and manage account status.</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, animation: 'fadeUp .4s .05s ease both' }}>
        <div style={{ position: 'relative', width: 280 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: .4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28 }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{visible.length} user{visible.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(12px)', animation: 'fadeUp .4s .08s ease both' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Institution</th>
              <th>Role</th>
              <th style={{ textAlign: 'right' }}>Points</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--combined-dim)', color: 'var(--combined)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, border: '1px solid rgba(155,124,240,0.2)' }}>
                      {u.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.institution || '—'}</td>
                <td>
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                    <option value="learner">Learner</option>
                    <option value="tutor">Tutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 12 }}>{u.points}</td>
                <td>
                  <button
                    className={u.is_active ? 'btn-danger' : 'btn-secondary'}
                    style={{ fontSize: 11, padding: '5px 12px' }}
                    disabled={u.id === currentUser.id}
                    onClick={() => toggleActive(u.id, u.is_active)}>
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
