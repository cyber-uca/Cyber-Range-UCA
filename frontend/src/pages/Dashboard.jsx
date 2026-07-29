import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const CAT_COLOR  = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }
const DIFF_COLOR = { easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)', beginner:'var(--green)', intermediate:'var(--amber)', advanced:'var(--red)' }

// Animated counter
function AnimatedStat({ value, label, color }) {
  const [display, setDisplay] = useState(0)
  const isNum = typeof value === 'number'

  useEffect(() => {
    if (!isNum) return
    let start = 0
    const end = value
    if (end === 0) return
    const duration = 900
    const step = Math.ceil(end / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setDisplay(end); clearInterval(timer) }
      else setDisplay(start)
    }, 16)
    return () => clearInterval(timer)
  }, [value, isNum])

  return (
    <div className="dash-stat-card" style={{ '--stat-color': color }}>
      <div className="dash-stat-glow" />
      <div className="dash-stat-val">{isNum ? display : value}</div>
      <div className="dash-stat-lbl">{label}</div>
    </div>
  )
}

function RoomCard({ room, delay = 0 }) {
  const navigate = useNavigate()
  const cc = CAT_COLOR[room.category?.slug] ?? 'var(--cyan)'
  return (
    <div
      onClick={() => navigate(`/rooms/${room.slug}`)}
      className="dash-room-card"
      style={{ '--card-color': cc, animationDelay: `${delay}s` }}
    >
      <div className="dash-room-bar" />
      <div className="dash-room-header">
        <span className="dash-room-cat">{room.category?.name ?? room.difficulty}</span>
        <span className="dash-room-diff" style={{ color: DIFF_COLOR[room.difficulty] ?? 'var(--text-4)' }}>
          {room.difficulty}
        </span>
      </div>
      <div className="dash-room-title">{room.title}</div>
      <p className="dash-room-desc">{room.description}</p>
      <div className="dash-room-footer">
        <span className="dash-room-meta">{room.task_count ?? room.challenge_count ?? 0} tasks</span>
        <span className="dash-room-cta">Enter →</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, linkTo, linkLabel }) {
  return (
    <div className="dash-section-header">
      <h3>{title}</h3>
      {linkTo && <Link to={linkTo} className="dash-section-link">{linkLabel} →</Link>}
    </div>
  )
}

function QuickCard({ label, desc, to, color }) {
  const navigate = useNavigate()
  return (
    <div className="dash-quick-card" onClick={() => navigate(to)} style={{ '--qcard-color': color }}>
      <div className="dash-quick-accent" />
      <div className="dash-quick-label">{label}</div>
      <div className="dash-quick-desc">{desc}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [challenges, setChallenges]   = useState([])
  const [rooms, setRooms]             = useState([])

  const isLearner = user?.role === 'learner'

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(() => {})
    if (isLearner) {
      api.listChallenges().then(setChallenges).catch(() => {})
      api.listRooms().then(setRooms).catch(() => {})
    }
  }, [isLearner])

  const myRank  = leaderboard.findIndex(e => e.name === user?.name) + 1
  const h       = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

  const heroDesc = isLearner
    ? "Your training overview. Pick up where you left off."
    : user?.role === 'admin'
      ? 'Platform command center. Manage content, users and infrastructure from the sidebar.'
      : 'Teaching overview. Use Creator Studio to build challenges.'

  const stats = isLearner
    ? [
        { val: user?.points ?? 0,            lbl: 'XP Earned',  color: 'var(--cyan)'  },
        { val: rooms.length,                 lbl: 'Rooms',       color: 'var(--teal)'  },
        { val: challenges.length,            lbl: 'Challenges',  color: 'var(--blue)'  },
        { val: myRank ? `#${myRank}` : '—', lbl: 'Your Rank',   color: 'var(--amber)' },
      ]
    : user?.role === 'admin'
      ? [{ val: leaderboard.length, lbl: 'Active Learners', color: 'var(--cyan)' }]
      : []

  return (
    <div className="page" style={{ paddingTop: 0 }}>

      {/* ── Hero ── */}
      <div className="dash-hero">
        <div className="dash-hero-bg" />
        <div className="dash-hero-content">
          <div className="fade-up dash-greeting">{greeting}</div>
          <h1 className="fade-up-1 dash-name">{user?.name?.split(' ')[0]}.</h1>
          <p className="fade-up-2 dash-tagline">{heroDesc}</p>
          {stats.length > 0 && (
            <div className="fade-up-3 dash-stats">
              {stats.map(s => <AnimatedStat key={s.lbl} value={s.val} label={s.lbl} color={s.color} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="dash-grid dashboard-grid">

        {/* Left column */}
        <div>

          {/* LEARNER */}
          {isLearner && (
            <>
              <SectionHeader title="Continue learning" linkTo="/roadmap" linkLabel="Full roadmap" />
              <div className="dash-rooms-grid">
                {rooms.slice(0, 4).map((r, i) => <RoomCard key={r.id} room={r} delay={i * .05} />)}
                {rooms.length === 0 && <p className="dash-empty">No rooms available yet.</p>}
              </div>

              <div style={{ marginTop: 36 }}>
                <SectionHeader title="Recent challenges" linkTo="/challenges" linkLabel="Browse all" />
                <div className="dash-challenge-list">
                  {challenges.slice(0, 5).map((c, i) => (
                    <div
                      key={c.id}
                      className="dash-challenge-row"
                      onClick={() => navigate(`/challenges/${c.id}`)}
                      style={{ animationDelay: `${.1 + i * .04}s` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={`badge badge-${c.category?.slug}`}>{c.category?.name}</span>
                        <span className="dash-challenge-title">{c.title}</span>
                      </div>
                      <div className="dash-challenge-right">
                        <span className="dash-diff" style={{ color: DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-3)' }}>
                          {c.difficulty?.name}
                        </span>
                        <span className="dash-pts">{c.points}</span>
                      </div>
                    </div>
                  ))}
                  {challenges.length === 0 && <p className="dash-empty">No challenges yet.</p>}
                </div>
              </div>
            </>
          )}

          {/* ADMIN */}
          {user?.role === 'admin' && (
            <>
              <SectionHeader title="Quick access" />
              <div className="dash-quick-grid">
                <QuickCard label="Content" desc="Paths, modules, rooms, tasks, questions" to="/admin/content" color="var(--cyan)" />
                <QuickCard label="Users" desc="Manage roles and accounts" to="/admin/users" color="var(--teal)" />
                <QuickCard label="Infrastructure" desc="VM templates and Proxmox config" to="/admin/vm-templates" color="var(--amber)" />
                <QuickCard label="Settings" desc="Platform-wide configuration" to="/admin/settings" color="var(--blue)" />
              </div>
            </>
          )}

          {/* TUTOR */}
          {user?.role === 'tutor' && (
            <>
              <SectionHeader title="Quick access" />
              <div className="dash-quick-grid">
                <QuickCard label="Creator Studio" desc="Build and manage challenges" to="/creator" color="var(--cyan)" />
                <QuickCard label="Roadmap" desc="Browse all rooms and paths" to="/roadmap" color="var(--teal)" />
              </div>
            </>
          )}

        </div>

        {/* Right — leaderboard */}
        <div>
          <SectionHeader title="Top learners" linkTo="/leaderboard" linkLabel="Full table" />
          <div className="dash-leaderboard">
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div
                key={i}
                className={`dash-lb-row${entry.name === user?.name ? ' me' : ''}`}
              >
                <span className={`dash-lb-rank${i < 3 ? ' top' : ''}`}>{i + 1}</span>
                <span className="dash-lb-name">{entry.name}</span>
                <span className="dash-lb-pts">{entry.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="dash-empty" style={{ padding: '20px 16px' }}>No scores yet.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
