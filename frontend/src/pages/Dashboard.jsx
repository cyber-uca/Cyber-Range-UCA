import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`
const diffColor = { easy: 'var(--mitigation)', medium: 'var(--warning)', hard: 'var(--offensive)' }
const layerMeta = Object.fromEntries(api.LAB_LAYERS.map(l => [l.slug, l]))

function RoomCard({ room, idx }) {
  const navigate = useNavigate()
  const lyr = layerMeta[room.lab_layer]
  const [hov, setHov] = useState(false)

  return (
    <div onClick={() => navigate(`/rooms/${room.slug}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(18,31,48,0.95)' : 'rgba(13,24,38,0.7)',
        border: `1px solid ${hov ? 'rgba(0,194,230,0.3)' : 'var(--border)'}`,
        borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
        transition: 'all .2s', backdropFilter: 'blur(12px)',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? '0 8px 28px rgba(0,0,0,0.3)' : 'none',
        animation: `fadeUp .4s ${0.1 + idx * 0.05}s ease both`,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lyr && <span style={{ fontSize: 18 }}>{lyr.icon}</span>}
          <span style={{ fontSize: 10, color: lyr?.color ?? 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>
            {lyr?.label ?? room.lab_layer}
          </span>
        </div>
        <span className={`category-tag tag-${room.category?.color}`}>{room.category?.name}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{room.title}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6,
        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {room.description}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: diffColor[room.difficulty] ?? 'var(--accent)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{room.difficulty}</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {room.challenge_count} task{room.challenge_count !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--accent)' }}>→</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(() => {})
    api.listChallenges().then(setChallenges).catch(() => {})
    api.listCategoriesPublic().then(cats => setCategories(cats.map(c => ({ ...c, count: 0 })))).catch(() => {})
    api.listRooms().then(setRooms).catch(() => {})
  }, [])

  useEffect(() => {
    if (!challenges.length) return
    setCategories(prev => {
      const counts = {}
      challenges.forEach(c => { counts[c.category.id] = (counts[c.category.id] || 0) + 1 })
      return prev.map(c => ({ ...c, count: counts[c.id] || 0 }))
    })
  }, [challenges])

  const myRank = leaderboard.findIndex(e => e.name === user?.name) + 1
  const featuredRooms = rooms.slice(0, 4)

  return (
    <div className="page">
      <style>{ANIM}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--accent)', fontWeight: 700 }}>Dashboard</span>
        </div>
        <h1>Welcome back, {user?.name.split(' ')[0]}</h1>
        <p className="subtitle">Ready to secure the future of automotive and industrial systems?</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ animation: 'fadeUp .4s .05s ease both' }}>
        <div className="stat-card"><div className="value">{user?.points ?? 0}</div><div className="label">XP Points</div></div>
        <div className="stat-card"><div className="value">{rooms.length}</div><div className="label">Rooms available</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--combined)' }}>#{myRank || '—'}</div><div className="label">Your rank</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--warning)' }}>{challenges.length}</div><div className="label">Challenges</div></div>
      </div>

      {/* Featured Rooms */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeUp .4s .08s ease both' }}>
        <h2 style={{ margin: 0 }}>Featured Rooms</h2>
        <Link to="/roadmap" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
          🗺️ Full Roadmap →
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14, marginBottom: 28 }}>
        {featuredRooms.map((r, i) => <RoomCard key={r.id} room={r} idx={i} />)}
        {rooms.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No rooms yet.</p>}
      </div>

      {/* Lab layers quick-nav */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .4s .1s ease both' }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Lab Layers</h2>
          <Link to="/challenges" style={{ fontSize: 12, color: 'var(--accent)' }}>All challenges →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {api.LAB_LAYERS.map(l => (
            <div key={l.slug} onClick={() => navigate(`/challenges?layer=${l.slug}`)}
              style={{ background: `${l.color}10`, border: `1px solid ${l.color}30`, borderRadius: 12,
                padding: '14px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = l.color + '70'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = l.color + '30'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{l.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{l.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid: recent challenges + leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, animation: 'fadeUp .4s .12s ease both' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Recent Challenges</h2>
            <Link to="/challenges" style={{ fontSize: 12, color: 'var(--accent)' }}>See all →</Link>
          </div>
          {challenges.slice(0, 5).map(c => {
            const lyr = layerMeta[c.lab_layer]
            return (
              <div key={c.id} className="challenge-row" onClick={() => navigate(`/challenges/${c.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {lyr && <span style={{ fontSize: 16 }}>{lyr.icon}</span>}
                  <span className={`category-tag tag-${c.category.color}`}>{c.category.name}</span>
                  <strong style={{ fontSize: 13 }}>{c.title}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.difficulty.name}</span>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>{c.points} XP</span>
                </div>
              </div>
            )
          })}
          {challenges.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No challenges yet.</p>}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Leaderboard</h2>
            <Link to="/leaderboard" style={{ fontSize: 12, color: 'var(--accent)' }}>Full →</Link>
          </div>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
            {leaderboard.slice(0, 8).map((entry, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none',
                background: entry.name === user?.name ? 'var(--accent-dim)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: i < 3 ? 'var(--accent)' : 'var(--text-dim)', width: 22, fontWeight: i < 3 ? 700 : 400 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: entry.name === user?.name ? 700 : 400 }}>{entry.name}</span>
                </div>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{entry.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No scores yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
