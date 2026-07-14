import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const DIFF_COLOR = { easy: 'var(--teal)', medium: 'var(--amber)', hard: 'var(--red)' }
const CAT_COLOR  = { offensive:'var(--red)', defensive:'var(--blue)', mitigation:'var(--teal)', risk:'var(--purple)' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard]   = useState([])
  const [challenges,  setChallenges]    = useState([])
  const [rooms,       setRooms]         = useState([])

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(() => {})
    api.listChallenges().then(setChallenges).catch(() => {})
    api.listRooms().then(setRooms).catch(() => {})
  }, [])

  const myRank = leaderboard.findIndex(e => e.name === user?.name) + 1

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="page fade-up">
      {/* Header */}
      <div className="page-header">
        <h1>{greeting()}, {user?.name?.split(' ')[0]}.</h1>
        <p className="lead" style={{ marginTop: 6 }}>
          Here's where things stand on the platform today.
        </p>
      </div>

      {/* Stats */}
      <div className="stat-row">
        {[
          { val: user?.points ?? 0,  lbl: 'Your XP',           color: 'var(--accent)' },
          { val: rooms.length,        lbl: 'Rooms available',   color: 'var(--teal)'   },
          { val: challenges.length,   lbl: 'Challenges',        color: 'var(--blue)'   },
          { val: myRank ? `#${myRank}` : '—', lbl: 'Your rank', color: 'var(--amber)'  },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="val" style={{ color: s.color }}>{s.val}</div>
            <div className="lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

        {/* Left: rooms + recent challenges */}
        <div>
          {/* Featured rooms */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3>Rooms to explore</h3>
            <Link to="/roadmap" style={{ fontSize: 13, color: 'var(--accent)' }}>Full roadmap →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {rooms.slice(0, 4).map(r => (
              <div key={r.id} className="card card-hover"
                onClick={() => navigate(`/rooms/${r.slug}`)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: CAT_COLOR[r.category?.slug] ?? 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {r.category?.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{r.difficulty}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{r.title}</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                  {r.description}
                </p>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                  {r.challenge_count} task{r.challenge_count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
            {rooms.length === 0 && (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', fontSize: 13 }}>No rooms yet.</p>
            )}
          </div>

          {/* Recent challenges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3>Recent challenges</h3>
            <Link to="/challenges" style={{ fontSize: 13, color: 'var(--accent)' }}>Browse all →</Link>
          </div>

          {challenges.slice(0, 5).map(c => (
            <div key={c.id} className="item-row" style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/challenges/${c.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge badge-${c.category.slug}`}>{c.category.name}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {c.difficulty.name}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
                  {c.points} XP
                </span>
              </div>
            </div>
          ))}
          {challenges.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No challenges yet.</p>}
        </div>

        {/* Right: leaderboard */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3>Leaderboard</h3>
            <Link to="/leaderboard" style={{ fontSize: 13, color: 'var(--accent)' }}>See all →</Link>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {leaderboard.slice(0, 8).map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 16px',
                borderBottom: i < 7 ? '1px solid var(--border)' : 'none',
                background: entry.name === user?.name ? 'var(--accent-dim)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: i < 3 ? 'var(--amber)' : 'var(--text-dim)', width: 22, fontWeight: i < 3 ? 800 : 400 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: entry.name === user?.name ? 700 : 400 }}>{entry.name}</span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>{entry.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No scores yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
