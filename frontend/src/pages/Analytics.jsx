import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function Bar({ pct, color }) {
  return (
    <div className="an-bar-track">
      <div className="an-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: color ?? 'var(--cyan)' }} />
    </div>
  )
}

function Ring({ pct, color, size = 72, stroke = 6 }) {
  const r     = (size - stroke) / 2
  const circ  = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color ?? 'var(--cyan)'} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' }} />
    </svg>
  )
}

function BigStat({ val, label, color, sub }) {
  return (
    <div className="an-big-stat" style={{ '--sc': color ?? 'var(--cyan)' }}>
      <div className="an-big-stat-glow" />
      <div className="an-big-val">{val}</div>
      <div className="an-big-label">{label}</div>
      {sub && <div className="an-big-sub">{sub}</div>}
    </div>
  )
}

export default function Analytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMyAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="spinner" />
    </div>
  )

  if (!data) return (
    <div className="page">
      <p style={{ color: 'var(--text-4)' }}>Could not load analytics.</p>
    </div>
  )

  const {
    total_attempts, total_correct, success_rate, total_pts_earned,
    attempt_dist, rooms_started, rooms_completed, hints_used,
    rooms, paths,
  } = data

  const srColor = success_rate >= 70 ? 'var(--green)' : success_rate >= 40 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="page an-page fade-up" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div className="an-header">
        <div className="an-header-bg" />
        <div>
          <div className="an-eyebrow">Analytics</div>
          <h1 className="an-title">My Learning Stats</h1>
          <p className="an-subtitle">Progress across all paths, rooms and questions.</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="an-stats-row">
        <BigStat val={total_attempts}     label="Total Answers"   color="var(--cyan)"  />
        <BigStat val={`${success_rate}%`} label="Success Rate"    color={srColor}      />
        <BigStat val={total_pts_earned}   label="Points Earned"   color="var(--amber)" />
        <BigStat val={rooms_completed}    label="Rooms Completed" color="var(--teal)"
          sub={rooms_started > 0 ? `${rooms_started} started` : undefined} />
      </div>

      {/* Two-col section */}
      <div className="an-two-col">

        {/* Attempt distribution */}
        <div className="card an-card">
          <h3 className="an-card-title">Attempts per question</h3>
          {[
            { label: 'First try',   key: '1',  color: 'var(--green)' },
            { label: '2 attempts',  key: '2',  color: 'var(--amber)' },
            { label: '3+ attempts', key: '3+', color: 'var(--red)'   },
          ].map(row => {
            const count = attempt_dist[row.key] ?? 0
            const total = Object.values(attempt_dist).reduce((s, v) => s + v, 0)
            const pct   = total > 0 ? Math.round(count / total * 100) : 0
            return (
              <div key={row.key} className="an-dist-row">
                <span className="an-dist-label">{row.label}</span>
                <Bar pct={pct} color={row.color} />
                <span className="an-dist-val" style={{ color: row.color }}>{count}</span>
              </div>
            )
          })}
          {total_attempts === 0 && (
            <p className="an-empty">No answers yet — start a lab to see data here.</p>
          )}
        </div>

        {/* Path progress rings */}
        <div className="card an-card">
          <h3 className="an-card-title">Path progress</h3>
          {paths.length === 0 && <p className="an-empty">No path progress yet.</p>}
          <div className="an-paths">
            {paths.map(p => (
              <div key={p.path_slug} className="an-path-row">
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Ring pct={p.pct} color={p.color ?? 'var(--cyan)'} />
                  <span className="an-ring-label" style={{ color: p.color ?? 'var(--cyan)' }}>
                    {p.icon ?? '🛡️'}
                  </span>
                </div>
                <div className="an-path-info">
                  <div className="an-path-name">{p.path_title}</div>
                  <div className="an-path-sub">
                    {p.modules_done} / {p.modules_total} modules · {p.pct}%
                  </div>
                  <Bar pct={p.pct} color={p.color ?? 'var(--cyan)'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room breakdown */}
      <h2 className="an-section-title">Room Breakdown</h2>
      {rooms.length === 0 && (
        <p style={{ color: 'var(--text-4)', fontSize: 13 }}>
          You haven't started any rooms yet.{' '}
          <Link to="/roadmap" style={{ color: 'var(--cyan)' }}>Go to Roadmap →</Link>
        </p>
      )}
      <div className="an-rooms">
        {rooms.map(r => (
          <div
            key={r.room_id}
            className="an-room-card"
            style={{ '--rc': r.is_completed ? 'var(--green)' : 'var(--amber)' }}
          >
            <div className="an-room-left">
              <div className="an-room-top">
                <Link to={`/rooms/${r.room_slug}`} className="an-room-title">{r.room_title}</Link>
                <span className={`an-room-status${r.is_completed ? ' done' : ''}`}>
                  {r.is_completed ? 'Completed' : 'In Progress'}
                </span>
              </div>
              <div className="an-room-progress">
                <Bar pct={r.pct} color={r.is_completed ? 'var(--green)' : 'var(--cyan)'} />
                <span className="an-room-pct">{r.pct}%</span>
              </div>
            </div>
            <div className="an-room-stats">
              {[
                { val: `${r.questions_correct}/${r.questions_total}`, lbl: 'Questions' },
                { val: `${r.tasks_done}/${r.tasks_total}`,            lbl: 'Tasks' },
                { val: r.score,                                        lbl: 'Score' },
              ].map(s => (
                <div key={s.lbl} className="an-room-stat">
                  <div className="an-room-stat-val">{s.val}</div>
                  <div className="an-room-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
