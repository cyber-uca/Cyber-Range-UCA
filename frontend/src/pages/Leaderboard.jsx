import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const MEDAL_COLOR = ['#F59E0B', '#94A3B8', '#B07A40']
const MEDAL_BG    = ['rgba(245,158,11,0.08)', 'rgba(148,163,184,0.06)', 'rgba(176,122,64,0.06)']
const MEDAL_BORDER= ['rgba(245,158,11,0.25)', 'rgba(148,163,184,0.15)', 'rgba(176,122,64,0.2)']
const RANK_LABEL  = ['1st', '2nd', '3rd']

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])

  useEffect(() => { api.leaderboard().then(setEntries).catch(() => {}) }, [])

  const myIdx = entries.findIndex(e => e.name === user?.name)
  const top3  = entries.slice(0, 3)
  const rest  = entries.slice(3)
  // Podium order: 2nd left, 1st center, 3rd right
  const podiumOrder = [1, 0, 2]

  return (
    <div className="page lb-page" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div className="lb-header">
        <div className="lb-header-bg" />
        <div>
          <div className="lb-eyebrow">Global Rankings</div>
          <h1 className="lb-title">Leaderboard</h1>
          <p className="lb-subtitle">Rankings update as challenges are solved.</p>
        </div>
      </div>

      {/* Your position banner */}
      {myIdx >= 0 && (
        <div className="lb-me fade-up">
          <div>
            <div className="lb-me-label">Your position</div>
            <div className="lb-me-name">{user?.name}</div>
          </div>
          <div className="lb-me-stats">
            <div className="lb-me-stat">
              <div className="lb-me-val" style={{ color: 'var(--cyan)' }}>#{myIdx + 1}</div>
              <div className="lb-me-lbl">rank</div>
            </div>
            <div className="lb-me-stat">
              <div className="lb-me-val" style={{ color: 'var(--amber)' }}>{entries[myIdx]?.points}</div>
              <div className="lb-me-lbl">XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="lb-podium fade-up-1">
          {podiumOrder.map(pos => {
            const entry = top3[pos]
            const isFirst = pos === 0
            return (
              <div
                key={pos}
                className={`lb-podium-card${isFirst ? ' first' : ''}`}
                style={{
                  '--medal-color': MEDAL_COLOR[pos],
                  '--medal-bg': MEDAL_BG[pos],
                  '--medal-border': MEDAL_BORDER[pos],
                }}
              >
                <div className="lb-podium-rank">{RANK_LABEL[pos]}</div>
                <div className="lb-podium-avatar">
                  {entry.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="lb-podium-pts">{entry.points}</div>
                <div className="lb-podium-name">{entry.name}</div>
                {entry.institution && <div className="lb-podium-inst">{entry.institution}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div className="lb-table-wrap fade-up-2">
        <table className="data-table lb-table">
          <thead>
            <tr>
              <th style={{ width: 56 }}>#</th>
              <th>Learner</th>
              <th>Institution</th>
              <th style={{ textAlign: 'right', paddingRight: 24 }}>XP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr
                key={i}
                className={`lb-row${e.name === user?.name ? ' me' : ''}${i < 3 ? ' top' : ''}`}
              >
                <td>
                  <span
                    className="lb-rank-num"
                    style={{ color: i < 3 ? MEDAL_COLOR[i] : 'var(--text-4)', fontWeight: i < 3 ? 800 : 400 }}
                  >
                    {i + 1}
                  </span>
                </td>
                <td>
                  <div className="lb-name-cell">
                    <div className="lb-row-avatar">
                      {e.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <span style={{ fontWeight: e.name === user?.name ? 700 : 400 }}>{e.name}</span>
                  </div>
                </td>
                <td className="lb-institution">{e.institution || '—'}</td>
                <td className="lb-xp-cell">{e.points}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="lb-empty-cell">No scores yet — be the first.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
