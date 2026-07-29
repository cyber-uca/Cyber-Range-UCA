import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = {
  beginner:'var(--green)', intermediate:'var(--amber)',
  advanced:'var(--red)', expert:'var(--red)',
  easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)',
}

function StatRow({ label, value, color }) {
  return (
    <div className="rd-stat-row">
      <span className="rd-stat-label">{label}</span>
      <span className="rd-stat-value" style={{ color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  )
}

export default function RoomDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)

  useEffect(() => { api.getRoom(slug).then(setRoom).catch(() => {}) }, [slug])

  if (!room) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  const tasks     = room.tasks ?? []
  const totalXP   = room.xp_reward ?? 0
  const totalQ    = tasks.reduce((s, t) => s + (t.questions?.length ?? 0), 0)
  const diffColor = DIFF_COLOR[room.difficulty] ?? 'var(--cyan)'

  return (
    <div className="page rd-page" style={{ paddingTop: 0 }}>

      {/* ── Hero ── */}
      <div className="rd-hero" style={{ '--dc': diffColor }}>
        <div className="rd-hero-bg" />

        <div className="rd-hero-inner">
          {/* Breadcrumb */}
          <div className="rd-breadcrumb fade-up">
            <Link to="/roadmap">Roadmap</Link>
            <span>›</span>
            <span>{room.title}</span>
          </div>

          <div className="rd-hero-body">
            {/* Left — info */}
            <div className="rd-hero-left">
              {/* Badges */}
              <div className="rd-badges fade-up-1">
                <span className="rd-badge-diff" style={{ '--dc': diffColor }}>
                  {room.difficulty}
                </span>
                {room.tags && room.tags.split(',').slice(0, 3).map(t => (
                  <span key={t} className="rd-badge-tag">{t.trim()}</span>
                ))}
                {room.mitre_attack && (
                  <span className="rd-badge-mitre">
                    MITRE · {room.mitre_attack}
                  </span>
                )}
              </div>

              <h1 className="rd-title fade-up-2">{room.title}</h1>
              <p className="rd-desc fade-up-3">{room.description}</p>

              {/* Mission briefing */}
              {room.story && (
                <div className="rd-briefing fade-up-3" style={{ '--dc': diffColor }}>
                  <div className="rd-briefing-label">Mission Briefing</div>
                  <p className="rd-briefing-text">{room.story}</p>
                </div>
              )}

              {/* Objectives */}
              {room.objectives && (
                <div className="rd-objectives fade-up-3">
                  <div className="rd-objectives-label">Objectives</div>
                  {room.objectives.split(';').filter(Boolean).map((o, i) => (
                    <div key={i} className="rd-objective">
                      <div className="rd-objective-dot" style={{ background: diffColor }} />
                      <span>{o.trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right — stats + CTA */}
            <div className="rd-hero-right fade-up-2">
              <div className="rd-stats-card" style={{ '--dc': diffColor }}>
                <div className="rd-stats-card-header">Room Info</div>
                <StatRow label="Tasks"      value={tasks.length} />
                <StatRow label="Questions"  value={totalQ} />
                <StatRow label="XP Reward"  value={`${totalXP} XP`}        color="var(--amber)" />
                <StatRow label="Duration"   value={`${room.estimated_minutes} min`} />
                <StatRow label="Difficulty" value={room.difficulty}         color={diffColor} />
                {room.xp_reward > 0 && (
                  <div className="rd-xp-bar">
                    <div className="rd-xp-fill" style={{ '--dc': diffColor }} />
                  </div>
                )}
                <button
                  className="btn-primary rd-cta"
                  onClick={() => navigate(`/rooms/${room.slug}/lab`)}
                >
                  Enter Lab →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Task list ── */}
      <div className="rd-tasks-header">
        <h2>Mission Tasks</h2>
        <span className="rd-tasks-meta">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {totalQ} questions
        </span>
      </div>

      <div className="rd-tasks">
        {tasks.length > 1 && <div className="rd-tasks-line" />}

        {tasks.map((t, idx) => (
          <div
            key={t.id}
            className="rd-task fade-up"
            style={{ animationDelay: `${idx * .06}s` }}
          >
            <div className="rd-task-num">{String(idx + 1).padStart(2, '0')}</div>
            <div className="rd-task-card">
              <div className="rd-task-header">
                <div className="rd-task-title">{t.title}</div>
                <span className="rd-task-pts">{t.points} pts</span>
              </div>
              {t.description && (
                <p className="rd-task-desc">{t.description}</p>
              )}
              <div className="rd-task-footer">
                <span>{t.questions?.length ?? 0} questions</span>
                <span>·</span>
                <span>{t.estimated_minutes} min</span>
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <p style={{ color: 'var(--text-4)', fontSize: 13 }}>No tasks yet.</p>
        )}
      </div>
    </div>
  )
}
