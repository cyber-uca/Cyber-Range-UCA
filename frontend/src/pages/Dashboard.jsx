import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const CAT_COLOR = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }
const DIFF_COLOR = { easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)' }

function RoomCard({ room, delay = 0 }) {
  const navigate = useNavigate()
  const cc = CAT_COLOR[room.category?.slug] ?? 'var(--cyan)'
  return (
    <div
      onClick={() => navigate(`/rooms/${room.slug}`)}
      className="card card-hover card-glow"
      style={{ cursor: 'pointer', padding: '20px', position: 'relative', overflow: 'hidden',
        animationDelay: `${delay}s`, animation: 'fadeUp .5s cubic-bezier(.16,1,.3,1) both' }}>
      {/* Color accent top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${cc}60, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: cc, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {room.category?.name}
        </span>
        <span style={{ fontSize: 11, color: DIFF_COLOR[room.difficulty] ?? 'var(--text-4)', fontWeight: 600, textTransform: 'capitalize' }}>
          {room.difficulty}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.3, color: 'var(--text)' }}>{room.title}</div>
      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 16px',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {room.description}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{room.challenge_count} task{room.challenge_count !== 1 ? 's' : ''}</span>
        <span style={{ fontSize: 12, color: cc, fontWeight: 600 }}>Enter →</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [challenges, setChallenges] = useState([])
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(() => {})
    api.listChallenges().then(setChallenges).catch(() => {})
    api.listRooms().then(setRooms).catch(() => {})
  }, [])

  const myRank = leaderboard.findIndex(e => e.name === user?.name) + 1
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Hero header — full bleed */}
      <div style={{
        marginLeft: -44, marginRight: -44, padding: '48px 44px 40px',
        background: 'linear-gradient(180deg, rgba(34,211,238,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 40,
      }}>
        <div className="fade-up" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {greeting}
          </span>
        </div>
        <h1 className="fade-up-1" style={{ fontSize: 36, marginBottom: 12 }}>
          {user?.name?.split(' ')[0]}.
        </h1>
        <p className="fade-up-2" style={{ color: 'var(--text-3)', fontSize: 15, maxWidth: 480, marginBottom: 28 }}>
          Ready to continue your training? Here's where things stand.
        </p>
        {/* Stat strip */}
        <div className="fade-up-3" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { val: user?.points ?? 0, lbl: 'XP Earned', color: 'var(--cyan)' },
            { val: rooms.length, lbl: 'Rooms Available', color: 'var(--teal)' },
            { val: challenges.length, lbl: 'Challenges', color: 'var(--blue)' },
            { val: myRank ? `#${myRank}` : '—', lbl: 'Your Rank', color: 'var(--amber)' },
          ].map(s => (
            <div key={s.lbl} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{s.lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid — asymmetric */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
        <div>
          {/* Rooms */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Continue learning</h3>
            <Link to="/roadmap" style={{ fontSize: 13, color: 'var(--cyan)' }}>Full roadmap →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
            {rooms.slice(0, 4).map((r, i) => <RoomCard key={r.id} room={r} delay={i * 0.05} />)}
            {rooms.length === 0 && <p style={{ color: 'var(--text-4)', gridColumn: '1/-1', fontSize: 13 }}>No rooms yet.</p>}
          </div>

          {/* Recent challenges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3>Recent challenges</h3>
            <Link to="/challenges" style={{ fontSize: 13, color: 'var(--cyan)' }}>Browse all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {challenges.slice(0, 5).map((c, i) => (
              <div key={c.id} onClick={() => navigate(`/challenges/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 'var(--r-lg)', cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  transition: 'border-color .15s, background .15s',
                  animation: `fadeUp .5s ${.1 + i*.04}s cubic-bezier(.16,1,.3,1) both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`badge badge-${c.category.slug}`}>{c.category.name}</span>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{c.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-3)', textTransform: 'capitalize' }}>{c.difficulty.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{c.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — leaderboard */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Top learners</h3>
            <Link to="/leaderboard" style={{ fontSize: 13, color: 'var(--cyan)' }}>Full table →</Link>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: i < leaderboard.slice(0,10).length - 1 ? '1px solid var(--border)' : 'none',
                background: entry.name === user?.name ? 'rgba(34,211,238,0.04)' : 'transparent',
                transition: 'background .1s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, minWidth: 24,
                    color: i < 3 ? 'var(--amber)' : 'var(--text-4)', fontWeight: i < 3 ? 700 : 400 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: entry.name === user?.name ? 600 : 400, color: entry.name === user?.name ? 'var(--cyan)' : 'var(--text-2)' }}>
                    {entry.name}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>{entry.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ padding: '20px 16px', color: 'var(--text-4)', fontSize: 13 }}>No scores yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
