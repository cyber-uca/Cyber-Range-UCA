import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 14px rgba(0,194,230,.2)}50%{box-shadow:0 0 28px rgba(0,194,230,.5)}}`

const diffColor = { easy: 'var(--mitigation)', medium: 'var(--warning)', hard: 'var(--offensive)' }
const catStyle = {
  offensive:  { color: 'var(--offensive)',  bg: 'rgba(240,82,74,0.08)' },
  defensive:  { color: 'var(--defensive)',  bg: 'rgba(74,144,240,0.08)' },
  mitigation: { color: 'var(--mitigation)', bg: 'rgba(20,201,168,0.08)' },
  risk:       { color: 'var(--combined)',   bg: 'rgba(155,124,240,0.08)' },
}

export default function RoomDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)

  useEffect(() => { api.getRoom(slug).then(setRoom).catch(() => {}) }, [slug])

  if (!room) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading room…</span>
      </div>
    </div>
  )

  const lyr = api.LAB_LAYERS.find(l => l.slug === room.lab_layer)
  const cs = catStyle[room.category?.slug] ?? catStyle.offensive
  const totalXP = room.challenges?.reduce((s, rc) => s + (rc.challenge?.points ?? 0), 0) ?? 0

  return (
    <div className="page">
      <style>{ANIM}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)', animation: 'fadeUp .3s ease both' }}>
        <Link to="/roadmap" style={{ color: 'var(--text-muted)' }}>Roadmap</Link>
        <span style={{ opacity: .4 }}>›</span>
        <span style={{ color: 'var(--text)' }}>{room.title}</span>
      </div>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(145deg,${cs.bg},rgba(13,24,38,0.85))`,
        border: '1px solid var(--border)', borderRadius: 20, padding: '32px 36px',
        marginBottom: 24, backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35)', animation: 'fadeUp .4s .04s ease both',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 320, height: 320,
          borderRadius: '50%', background: `radial-gradient(circle,${cs.color}12 0%,transparent 70%)`,
          pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {lyr && (
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${lyr.color}20`,
                  border: `1px solid ${lyr.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {lyr.icon}
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: lyr?.color ?? 'var(--accent)', fontWeight: 700 }}>
                  {lyr?.label ?? room.lab_layer} Layer
                </div>
                <span className={`category-tag tag-${room.category?.color}`}>{room.category?.name}</span>
              </div>
            </div>
            <h1 style={{ marginBottom: 10 }}>{room.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.8, maxWidth: 560, margin: 0 }}>
              {room.description}
            </p>
          </div>

          {/* stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
            {[
              { label: 'Tasks', value: room.challenges?.length ?? 0, color: 'var(--accent)' },
              { label: 'Total XP', value: `${totalXP} XP`, color: 'var(--warning)' },
              { label: 'Difficulty', value: room.difficulty, color: diffColor[room.difficulty] ?? 'var(--accent)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(7,13,22,0.6)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.color, fontSize: 13, textTransform: 'capitalize' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ animation: 'fadeUp .4s .08s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Tasks</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {room.challenges?.length ?? 0} challenge{room.challenges?.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(room.challenges ?? []).map((rc, idx) => {
            const c = rc.challenge
            if (!c) return null
            return (
              <div key={c.id}
                onClick={() => navigate(`/challenges/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
                  transition: 'all .2s', backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,194,230,0.3)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>

                {/* task number */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-dim)', border: '2px solid rgba(0,194,230,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </div>

                {/* info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                    {c.description}
                  </div>
                  {c.tags && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {c.tags.split(',').slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999,
                          background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* right side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                    {c.points} XP
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: diffColor[c.difficulty?.slug] ?? 'var(--accent)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c.difficulty?.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {c.time_limit_minutes}m
                  </span>
                </div>

                <div style={{ color: 'var(--accent)', fontSize: 18, opacity: .6 }}>›</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
