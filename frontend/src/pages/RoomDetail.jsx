import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = {
  beginner:'var(--green)', intermediate:'var(--amber)',
  advanced:'var(--red)', expert:'var(--red)',
  easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)',
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

  const tasks    = room.tasks ?? []
  const totalXP  = room.xp_reward ?? 0
  const totalQ   = tasks.reduce((s, t) => s + (t.questions?.length ?? 0), 0)
  const diffColor = DIFF_COLOR[room.difficulty] ?? 'var(--cyan)'

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Hero */}
      <div style={{
        marginLeft:-44, marginRight:-44,
        background:`linear-gradient(180deg, ${diffColor}06 0%, transparent 100%)`,
        borderBottom:'1px solid var(--border)', marginBottom:40,
      }}>
        <div style={{ padding:'0 44px' }}>
          {/* Breadcrumb */}
          <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:8, padding:'20px 0 0', fontSize:13, color:'var(--text-4)' }}>
            <Link to="/roadmap" style={{ color:'var(--text-4)' }}>Roadmap</Link>
            <span>›</span>
            <span style={{ color:'var(--text-3)' }}>{room.title}</span>
          </div>

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:28, padding:'28px 0 40px', flexWrap:'wrap' }}>
            <div style={{ flex:1, maxWidth:640 }}>
              {/* Meta tags */}
              <div className="fade-up-1" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:700, color:diffColor, textTransform:'uppercase', letterSpacing:'.06em', padding:'2px 8px', borderRadius:999, background:`${diffColor}15`, border:`1px solid ${diffColor}30` }}>
                  {room.difficulty}
                </span>
                {room.tags && room.tags.split(',').slice(0,3).map(t => (
                  <span key={t} style={{ fontSize:11, color:'var(--text-4)', padding:'2px 8px', borderRadius:999, background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                    {t.trim()}
                  </span>
                ))}
                {room.mitre_attack && (
                  <span style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)' }}>
                    MITRE: {room.mitre_attack}
                  </span>
                )}
              </div>

              <h1 className="fade-up-2" style={{ fontSize:34, marginBottom:14 }}>{room.title}</h1>
              <p className="fade-up-3" style={{ fontSize:15, color:'var(--text-3)', lineHeight:1.75, maxWidth:560, marginBottom:20 }}>
                {room.description}
              </p>

              {/* Story / Mission Briefing */}
              {room.story && (
                <div className="fade-up-3" style={{
                  background:'var(--surface-2)', border:'1px solid var(--border)',
                  borderLeft:`3px solid ${diffColor}`, borderRadius:'var(--r-lg)',
                  padding:'18px 20px', marginBottom:20, maxWidth:580,
                }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:diffColor, marginBottom:10 }}>
                    Mission Briefing
                  </div>
                  <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.8, margin:0 }}>{room.story}</p>
                </div>
              )}

              {/* Objectives */}
              {room.objectives && (
                <div className="fade-up-3" style={{ maxWidth:560 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-4)', marginBottom:10 }}>
                    Objectives
                  </div>
                  {room.objectives.split(';').filter(Boolean).map((o, i) => (
                    <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:diffColor, marginTop:6, flexShrink:0 }} />
                      <span style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.6 }}>{o.trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats + CTA */}
            <div className="fade-up-2" style={{ display:'flex', flexDirection:'column', gap:10, minWidth:200, flexShrink:0 }}>
              {[
                { lbl:'Tasks',      val: tasks.length },
                { lbl:'Questions',  val: totalQ },
                { lbl:'XP Reward',  val: `${totalXP} XP`, color:'var(--amber)' },
                { lbl:'Duration',   val: `${room.estimated_minutes} min` },
                { lbl:'Difficulty', val: room.difficulty, color: diffColor },
              ].map(s => (
                <div key={s.lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  background:'var(--surface-2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-sm)', padding:'9px 14px' }}>
                  <span style={{ fontSize:12, color:'var(--text-4)' }}>{s.lbl}</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:s.color??'var(--text)', fontSize:13, textTransform:'capitalize' }}>{s.val}</span>
                </div>
              ))}
              <button className="btn-primary" onClick={() => navigate(`/rooms/${room.slug}/lab`)}
                style={{ padding:'12px', fontSize:15, fontWeight:700, justifyContent:'center', marginTop:4 }}>
                Enter Lab →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <h2 style={{ fontSize:18 }}>Mission Tasks</h2>
        <span style={{ fontSize:13, color:'var(--text-4)' }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {totalQ} questions</span>
      </div>

      <div style={{ position:'relative' }}>
        {tasks.length > 1 && (
          <div style={{ position:'absolute', left:19, top:28, bottom:28, width:1,
            background:'linear-gradient(180deg, var(--border-md), transparent)', zIndex:0 }} />
        )}

        {tasks.map((t, idx) => (
          <div key={t.id} className="fade-up"
            style={{ animationDelay:`${idx * .06}s`, position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', gap:16, marginBottom:12 }}>
            {/* Step number */}
            <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
              background:'var(--surface-2)', border:'1px solid var(--border-md)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:'var(--cyan)', zIndex:2 }}>
              {String(idx+1).padStart(2,'0')}
            </div>

            {/* Card */}
            <div style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:'var(--r-lg)', padding:'16px 20px',
              marginBottom: idx < tasks.length - 1 ? 8 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:5, color:'var(--text)' }}>{t.title}</div>
                  {t.description && (
                    <p style={{ fontSize:12, color:'var(--text-4)', margin:'0 0 8px', lineHeight:1.6 }}>{t.description}</p>
                  )}
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--text-4)' }}>{t.questions?.length ?? 0} questions</span>
                    <span style={{ fontSize:11, color:'var(--text-4)' }}>⏱ {t.estimated_minutes} min</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:800, color:'var(--amber)' }}>{t.points} pts</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <p style={{ color:'var(--text-4)', fontSize:13 }}>No tasks yet.</p>
        )}
      </div>
    </div>
  )
}
