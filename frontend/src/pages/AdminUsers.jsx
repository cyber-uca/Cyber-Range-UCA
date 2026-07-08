import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  const refresh = () => api.adminListUsers().then(setUsers).catch(() => {})
  useEffect(() => { refresh() }, [])

  const changeRole = async (id, role) => {
    try { await api.adminUpdateUserRole(id, role); refresh() }
    catch (err) { setError(err.message) }
  }

  const toggleActive = async (id, current) => {
    try { await api.adminUpdateUserActive(id, !current); refresh() }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="page">
      <h1>User Management</h1>
      <p className="subtitle">Assign roles and manage account status.</p>
      {error && <div className="error-msg">{error}</div>}

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Institution</th><th>Role</th><th>Points</th><th>Status</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.institution || '—'}</td>
              <td>
                <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                  <option value="learner">Learner</option>
                  <option value="tutor">Tutor</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>{u.points}</td>
              <td>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  disabled={u.id === currentUser.id}
                  onClick={() => toggleActive(u.id, u.is_active)}
                >
                  {u.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
