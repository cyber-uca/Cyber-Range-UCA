import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)' }
const CAT_COLOR  = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }

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

  const lyr     = api.LAB_LAYERS.find(l => l.slug === room.lab_layer)
  const totalXP = room.challenges?.reduce((s,rc) => s+(rc.challenge?.points??0), 0) ?? 0
  const cc      = CAT_COLOR[room.category?.slug] ?? 'var(--cyan)'

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Hero */}
      <div style={{
        marginLeft:-44, marginRight:-44,
        background:`linear-gradient(180deg, ${cc}06 0%, transparent 100%)`,
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
            <div style={{ flex:1, maxWidth:600 }}>
              <div className="fade-up-1" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                {lyr && <span style={{ fontSize:12, color:'var(--text-4)' }}>{lyr.label} Layer</span>}
                <span style={{ fontSize:12, fontWeight:700, color:cc }}>{room.category?.name}</span>
                {room.module && <span style={{ fontSize:12, color:'var(--text-4)' }}>/ {room.module}</span>}
              </div>
              <h1 className="fade-up-2" style={{ fontSize:34, marginBottom:14 }}>{room.title}</h1>
              <p className="fade-up-3" style={{ fontSize:15, color:'var(--text-3)', lineHeight:1.75, maxWidth:520 }}>
                {room.description}
              </p>
            </div>

            {/* Stats + CTA */}
            <div className="fade-up-2" style={{ display:'flex', flexDirection:'column', gap:10, minWidth:180, flexShrink:0 }}>
              {[
                { lbl:'Tasks',      val: room.challenges?.length ?? 0 },
                { lbl:'Total XP',   val: `${totalXP}`, color:'var(--amber)' },
                { lbl:'Difficulty', val: room.difficulty, color: DIFF_COLOR[room.difficulty] ?? 'var(--text)' },
              ].map(s => (
                <div key={s.lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'9px 14px' }}>
                  <span style={{ fontSize:12, color:'var(--text-4)' }}>{s.lbl}</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:s.color??'var(--text)', fontSize:13, textTransform:'capitalize' }}>{s.val}</span>
                </div>
              ))}
              <button className="btn-primary" onClick={() => navigate(`/rooms/${room.slug}/lab`)}
                style={{ padding:'12px', fontSize:15, fontWeight:700, justifyContent:'center', marginTop:4 }}>
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task list — mission steps */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <h2 style={{ fontSize:18 }}>Mission Tasks</h2>
        <span style={{ fontSize:13, color:'var(--text-4)' }}>
          {room.challenges?.length ?? 0} challenge{room.challenges?.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ position:'relative' }}>
        {/* Vertical connector line */}
        {(room.challenges?.length ?? 0) > 1 && (
          <div style={{ position:'absolute', left:19, top:28, bottom:28, width:1,
            background:'linear-gradient(180deg, var(--border-md), transparent)', zIndex:0 }} />
        )}

        {(room.challenges ?? []).map((rc, idx) => {
          const c = rc.challenge
          if (!c) return null
          return (
            <div key={c.id} className="fade-up"
              style={{ animationDelay: `${idx * .06}s`, position:'relative', zIndex:1 }}
              onClick={() => navigate(`/challenges/${c.id}`)}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:10, cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.parentElement.querySelector('.task-card').style.borderColor = 'var(--border-hi)'}
                onMouseLeave={e => e.currentTarget.parentElement.querySelector('.task-card').style.borderColor = 'var(--border)'}>
                {/* Step number */}
                <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background:'var(--surface-2)', border:'1px solid var(--border-md)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:'var(--cyan)', zIndex:2,
                  background:'var(--surface-2)' }}>
                  {String(idx+1).padStart(2,'0')}
                </div>

                {/* Card */}
                <div className="task-card" style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-lg)', padding:'16px 20px', transition:'border-color .15s',
                  marginBottom: idx < (room.challenges?.length??0) - 1 ? 8 : 0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:5, color:'var(--text)' }}>{c.title}</div>
                      <p style={{ fontSize:12, color:'var(--text-4)', overflow:'hidden', textOverflow:'ellipsis',
                        whiteSpace:'nowrap', maxWidth:500, margin:0 }}>{c.description}</p>
                      {c.tags && (
                        <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                          {c.tags.split(',').slice(0,3).map(t => (
                            <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:999,
                              background:'var(--surface-3)', color:'var(--text-4)', border:'1px solid var(--border)' }}>
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:800, color:'var(--amber)' }}>{c.points} XP</span>
                      <span style={{ fontSize:11, color:DIFF_COLOR[c.difficulty?.slug]??'var(--text-4)', textTransform:'capitalize', fontWeight:600 }}>
                        {c.difficulty?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
