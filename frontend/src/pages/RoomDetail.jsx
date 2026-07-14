import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy:'var(--teal)', medium:'var(--amber)', hard:'var(--red)' }
const CAT_COLOR  = { offensive:'var(--red)', defensive:'var(--blue)', mitigation:'var(--teal)', risk:'var(--purple)' }

export default function RoomDetail() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const [room, setRoom] = useState(null)

  useEffect(() => { api.getRoom(slug).then(setRoom).catch(() => {}) }, [slug])

  if (!room) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  const lyr     = api.LAB_LAYERS.find(l => l.slug === room.lab_layer)
  const totalXP = room.challenges?.reduce((s,rc) => s+(rc.challenge?.points??0), 0) ?? 0
  const catColor = CAT_COLOR[room.category?.slug] ?? 'var(--accent)'

  return (
    <div className="page fade-up">
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13, color:'var(--text-muted)' }}>
        <Link to="/roadmap" style={{ color:'var(--text-muted)' }}>Roadmap</Link>
        <span style={{ opacity:.4 }}>›</span>
        <span style={{ color:'var(--text)' }}>{room.title}</span>
      </div>

      {/* Hero */}
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
              {lyr && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{lyr.label} Layer</span>}
              <span style={{ fontSize:12, fontWeight:700, color:catColor }}>{room.category?.name}</span>
              {room.module && <span style={{ fontSize:12, color:'var(--text-dim)' }}>{room.module}</span>}
            </div>
            <h1 style={{ marginBottom:12, fontSize:24 }}>{room.title}</h1>
            <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.8, maxWidth:560, margin:0 }}>
              {room.description}
            </p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:170, flexShrink:0 }}>
            {[
              { lbl:'Tasks',      val: room.challenges?.length ?? 0 },
              { lbl:'Total XP',   val: `${totalXP} XP`,  color:'var(--amber)' },
              { lbl:'Difficulty', val: room.difficulty,   color: DIFF_COLOR[room.difficulty] ?? 'var(--text)' },
            ].map(s => (
              <div key={s.lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                background:'var(--surface-2)', border:'1px solid var(--border)',
                borderRadius:'var(--r)', padding:'9px 14px' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{s.lbl}</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:s.color ?? 'var(--text)', fontSize:13, textTransform:'capitalize' }}>{s.val}</span>
              </div>
            ))}
            <button className="btn-primary" onClick={() => navigate(`/rooms/${room.slug}/lab`)}
              style={{ padding:'12px', fontSize:14, fontWeight:800, width:'100%', marginTop:4 }}>
              Join Room
            </button>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <h2>Tasks in this room</h2>
        <span style={{ fontSize:13, color:'var(--text-muted)' }}>
          {room.challenges?.length ?? 0} challenge{room.challenges?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {(room.challenges ?? []).map((rc, idx) => {
        const c = rc.challenge
        if (!c) return null
        return (
          <div key={c.id} className="item-row" style={{ cursor:'pointer' }}
            onClick={() => navigate(`/challenges/${c.id}`)}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
                background:'var(--accent-dim)', border:'1px solid rgba(56,189,248,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--mono)', fontWeight:800, fontSize:12, color:'var(--accent)' }}>
                {String(idx+1).padStart(2,'0')}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{c.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:480 }}>
                  {c.description}
                </div>
                {c.tags && (
                  <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                    {c.tags.split(',').slice(0,3).map(t => (
                      <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:999,
                        background:'var(--surface-2)', color:'var(--text-dim)', border:'1px solid var(--border)' }}>
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800, color:'var(--amber)' }}>{c.points} XP</span>
              <span style={{ fontSize:11, color: DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-muted)', textTransform:'capitalize' }}>
                {c.difficulty?.name}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
