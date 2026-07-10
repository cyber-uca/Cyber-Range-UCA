import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const medals = { 0: { color: '#F5A623', bg: 'rgba(245,166,35,0.12)', label: '🥇' }, 1: { color: '#A8B8C8', bg: 'rgba(168,184,200,0.12)', label: '🥈' }, 2: { color: '#CD7F32', bg: 'rgba(205,127,50,0.12)', label: '🥉' } }

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])

  useEffect(() => { api.leaderboard().then(setEntries).catch(() => {}) }, [])

  const myIdx = entries.findIndex(e => e.name === user?.name)

  return (
    <div className="page">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--warning)', fontWeight: 700 }}>Rankings</span>
        </div>
        <h1>Leaderboard</h1>
        <p className="subtitle">Global ranking across all learners.</p>
      </div>

      {/* My rank banner */}
      {myIdx >= 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--accent-dim)', border: '1px solid rgba(0,194,230,0.3)',
          borderRadius: 12, padding: '14px 20px', marginBottom: 20,
          animation: 'fadeUp .4s .05s ease both', boxShadow: '0 0 20px rgba(0,194,230,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>#{myIdx + 1}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Your position</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.name}</div>
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{entries[myIdx]?.points} XP</span>
        </div>
      )}

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20, animation: 'fadeUp .4s .08s ease both' }}>
          {[1, 0, 2].map(pos => {
            const entry = entries[pos]
            const m = medals[pos]
            return (
              <div key={pos} style={{
                background: `linear-gradient(145deg, ${m.bg}, rgba(13,24,38,0.8))`,
                border: `1px solid ${m.color}40`, borderRadius: 14, padding: '20px 16px',
                textAlign: 'center', backdropFilter: 'blur(12px)',
                transform: pos === 0 ? 'scale(1.03)' : 'scale(1)',
                boxShadow: pos === 0 ? `0 0 24px ${m.color}25` : 'none',
              }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: m.color }}>{entry.points}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{entry.name}</div>
                {entry.institution && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{entry.institution}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div style={{
        background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', backdropFilter: 'blur(12px)', animation: 'fadeUp .4s .1s ease both',
      }}>
        <table className="challenge-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Rank</th>
              <th>Learner</th>
              <th>Institution</th>
              <th style={{ textAlign: 'right', paddingRight: 20 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} style={e.name === user?.name ? { background: 'var(--accent-dim)' } : {}}>
                <td>
                  <span className="mono" style={{ color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: i < 3 ? 700 : 400 }}>#{i + 1}</span>
                </td>
                <td><strong style={{ fontWeight: e.name === user?.name ? 700 : 500 }}>{e.name}</strong></td>
                <td style={{ color: 'var(--text-muted)' }}>{e.institution || '—'}</td>
                <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700, textAlign: 'right', paddingRight: 20 }}>{e.points}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No scores yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
