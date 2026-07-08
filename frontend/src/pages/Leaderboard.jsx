import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])

  useEffect(() => {
    api.leaderboard().then(setEntries).catch(() => {})
  }, [])

  return (
    <div className="page">
      <h1>Leaderboard</h1>
      <p className="subtitle">Global ranking across all learners.</p>

      <table className="challenge-table">
        <thead>
          <tr><th>Rank</th><th>Learner</th><th>Institution</th><th>Points</th></tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} style={e.name === user?.name ? { background: 'var(--accent-dim)' } : undefined}>
              <td className="mono">#{i + 1}</td>
              <td><strong>{e.name}</strong></td>
              <td style={{ color: 'var(--text-muted)' }}>{e.institution || '—'}</td>
              <td className="mono" style={{ color: 'var(--accent)' }}>{e.points}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No scores yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
