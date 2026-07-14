import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])

  useEffect(() => { api.leaderboard().then(setEntries).catch(() => {}) }, [])

  const myIdx = entries.findIndex(e => e.name === user?.name)

  const podiumOrder = [1, 0, 2]
  const podiumColors = [
    { color: '#C0C8D8', label: '2nd' },
    { color: 'var(--amber)', label: '1st' },
    { color: '#B07A40', label: '3rd' },
  ]

  return (
    <div className="page fade-up">
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p className="lead" style={{ marginTop: 6 }}>See how everyone stacks up. Rankings update in real time.</p>
      </div>

      {/* Your position banner */}
      {myIdx >= 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--accent-dim)', border: '1px solid rgba(56,189,248,0.25)',
          borderRadius: 'var(--r-lg)', padding: '16px 22px', marginBottom: 28,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Your position</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900, color: 'var(--accent)' }}>#{myIdx + 1}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>rank</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900, color: 'var(--amber)' }}>{entries[myIdx]?.points}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Podium */}
      {entries.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
          {podiumOrder.map((pos, i) => {
            const entry = entries[pos]
            const style = podiumColors[i]
            return (
              <div key={pos} className="card" style={{
                textAlign: 'center', padding: '24px 16px',
                borderColor: pos === 0 ? 'rgba(245,158,11,0.3)' : 'var(--border)',
                background: pos === 0 ? 'rgba(245,158,11,0.05)' : 'var(--surface)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: style.color, marginBottom: 6 }}>{style.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 900, color: style.color }}>{entry.points}</div>
                <div style={{ fontWeight: 600, marginTop: 6, fontSize: 14 }}>{entry.name}</div>
                {entry.institution && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{entry.institution}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 56 }}>Rank</th>
              <th>Name</th>
              <th>Institution</th>
              <th style={{ textAlign: 'right', paddingRight: 20 }}>XP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} style={e.name === user?.name ? { background: 'var(--accent-dim)' } : {}}>
                <td>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: i < 3 ? 'var(--amber)' : 'var(--text-dim)', fontWeight: i < 3 ? 800 : 400 }}>
                    #{i + 1}
                  </span>
                </td>
                <td style={{ fontWeight: e.name === user?.name ? 700 : 500 }}>{e.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.institution || '—'}</td>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--amber)', textAlign: 'right', paddingRight: 20 }}>{e.points}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No scores yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
