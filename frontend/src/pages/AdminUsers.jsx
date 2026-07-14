import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers]   = useState([])
  const [search, setSearch] = useState('')
  const [error, setError]   = useState('')

  const refresh = () => api.adminListUsers().then(setUsers).catch(() => {})
  useEffect(() => { refresh() }, [])

  const changeRole   = async (id,role)    => { try { await api.adminUpdateUserRole(id,role);       refresh() } catch(e) { setError(e.message) } }
  const toggleActive = async (id,current) => { try { await api.adminUpdateUserActive(id,!current); refresh() } catch(e) { setError(e.message) } }

  const visible = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page fade-up">
      <div style={{ marginBottom:32 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>Admin</p>
        <h1 style={{ fontSize:28, marginBottom:8 }}>Users</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>Manage roles and account status.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12 }}>
        <div style={{ position:'relative', maxWidth:300 }}>
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36 }} />
          <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', opacity:.4 }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <span style={{ fontSize:13, color:'var(--text-4)', fontFamily:'var(--mono)' }}>{visible.length} users</span>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Institution</th>
              <th>Role</th>
              <th style={{ textAlign:'right' }}>XP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                      background:'var(--violet-dim)', color:'var(--violet)',
                      border:'1px solid rgba(167,139,250,0.2)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700 }}>
                      {u.name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                    <span style={{ fontWeight:600, color:'var(--text-2)' }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color:'var(--text-4)', fontSize:12 }}>{u.email}</td>
                <td style={{ color:'var(--text-4)', fontSize:12 }}>{u.institution||'—'}</td>
                <td>
                  <select value={u.role} onChange={e => changeRole(u.id,e.target.value)}
                    style={{ width:'auto', padding:'4px 8px', fontSize:12 }}>
                    <option value="learner">Learner</option>
                    <option value="tutor">Tutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--amber)', fontSize:12, fontWeight:700 }}>{u.points}</td>
                <td>
                  <button disabled={u.id===me.id}
                    className={u.is_active ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                    onClick={() => toggleActive(u.id,u.is_active)}>
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length===0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-4)' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
