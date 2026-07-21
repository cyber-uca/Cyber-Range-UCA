import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function StatCard({ val, label, color, sub }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding:'20px 22px', flex:1 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:28, fontWeight:800, color: color ?? 'var(--cyan)', marginBottom:4 }}>
        {val}
      </div>
      <div style={{ fontSize:12, color:'var(--text-4)', fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

function Bar({ pct, color }) {
  return (
    <div style={{ height:6, borderRadius:999, background:'var(--border)', overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', borderRadius:999, background: color ?? 'var(--cyan)',
        width:`${Math.min(100, pct)}%`, transition:'width .6s cubic-bezier(.16,1,.3,1)' }} />
    </div>
  )
}

function Ring({ pct, color, size=72, stroke=6 }) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color ?? 'var(--cyan)'} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition:'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' }}/>
    </svg>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMyAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  if (!data) return (
    <div className="page">
      <p style={{ color:'var(--text-4)' }}>Could not load analytics.</p>
    </div>
  )

  const {
    total_attempts, total_correct, success_rate, total_pts_earned,
    attempt_dist, rooms_started, rooms_completed, hints_used,
    rooms, paths,
  } = data

  const DIFF_COLOR = {
    beginner:'var(--green)', intermediate:'var(--amber)',
    advanced:'var(--red)', expert:'var(--red)',
  }

  return (
    <div className="page fade-up">
      {/* Header */}
      <div style={{ marginBottom:36 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase',
          letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>
          Analytics
        </p>
        <h1 style={{ fontSize:28, marginBottom:8 }}>My Learning Stats</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>
          Your progress across all paths, rooms and questions.
        </p>
      </div>

      {/* Top stat strip */}
      <div style={{ display:'flex', gap:12, marginBottom:32, flexWrap:'wrap' }}>
        <StatCard val={total_attempts}   label="Total answers"    color="var(--cyan)"  />
        <StatCard val={`${success_rate}%`} label="Success rate"   color={success_rate >= 70 ? 'var(--green)' : success_rate >= 40 ? 'var(--amber)' : 'var(--red)'} />
        <StatCard val={total_pts_earned} label="Points earned"    color="var(--amber)" />
        <StatCard val={rooms_completed}  label="Rooms completed"  color="var(--teal)"
          sub={rooms_started > 0 ? `${rooms_started} started` : undefined} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:32 }}>

        {/* Attempt distribution */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--r-lg)', padding:'20px 22px' }}>
          <h3 style={{ fontSize:14, marginBottom:16 }}>Attempts per question</h3>
          {[
            { label:'Got it first try', key:'1',  color:'var(--green)' },
            { label:'Took 2 attempts',  key:'2',  color:'var(--amber)' },
            { label:'3+ attempts',      key:'3+', color:'var(--red)'   },
          ].map(row => {
            const count = attempt_dist[row.key] ?? 0
            const total = Object.values(attempt_dist).reduce((s,v) => s+v, 0)
            const pct   = total > 0 ? Math.round(count/total*100) : 0
            return (
              <div key={row.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ fontSize:12, color:'var(--text-4)', minWidth:130 }}>{row.label}</span>
                <Bar pct={pct} color={row.color} />
                <span style={{ fontSize:12, fontFamily:'var(--mono)', color:row.color, minWidth:36, textAlign:'right' }}>
                  {count}
                </span>
              </div>
            )
          })}
          {total_attempts === 0 && (
            <p style={{ color:'var(--text-4)', fontSize:12 }}>No answers yet — start a lab to see data here.</p>
          )}
        </div>

        {/* Path progress rings */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--r-lg)', padding:'20px 22px' }}>
          <h3 style={{ fontSize:14, marginBottom:16 }}>Path progress</h3>
          {paths.length === 0 && (
            <p style={{ color:'var(--text-4)', fontSize:12 }}>No path progress yet.</p>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {paths.map(p => (
              <div key={p.path_slug} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <Ring pct={p.pct} color={p.color ?? 'var(--cyan)'} />
                  <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:12, fontWeight:800,
                    fontFamily:'var(--mono)', color: p.color ?? 'var(--cyan)',
                    transform:'rotate(90deg)' }}>
                    {p.icon ?? '🛡️'}
                  </span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{p.path_title}</div>
                  <div style={{ fontSize:11, color:'var(--text-4)' }}>
                    {p.modules_done} / {p.modules_total} modules · {p.pct}%
                  </div>
                  <Bar pct={p.pct} color={p.color ?? 'var(--cyan)'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room-by-room breakdown */}
      <h2 style={{ fontSize:16, marginBottom:14 }}>Room breakdown</h2>
      {rooms.length === 0 && (
        <p style={{ color:'var(--text-4)', fontSize:13 }}>
          You haven't started any rooms yet. <Link to="/roadmap" style={{ color:'var(--cyan)' }}>Go to Roadmap →</Link>
        </p>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {rooms.map(r => (
          <div key={r.room_id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:'14px 18px',
            borderLeft:`3px solid ${r.is_completed ? 'var(--green)' : 'var(--amber)'}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <Link to={`/rooms/${r.room_slug}`}
                    style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>
                    {r.room_title}
                  </Link>
                  {r.is_completed
                    ? <span style={{ fontSize:10, fontWeight:700, color:'var(--green)',
                        background:'rgba(34,197,94,0.1)', padding:'2px 8px', borderRadius:999,
                        border:'1px solid rgba(34,197,94,0.3)' }}>COMPLETED</span>
                    : <span style={{ fontSize:10, fontWeight:700, color:'var(--amber)',
                        background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:999,
                        border:'1px solid rgba(245,158,11,0.3)' }}>IN PROGRESS</span>
                  }
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Bar pct={r.pct} color={r.is_completed ? 'var(--green)' : 'var(--cyan)'} />
                  <span style={{ fontSize:12, color:'var(--text-4)', minWidth:40, textAlign:'right',
                    fontFamily:'var(--mono)' }}>{r.pct}%</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:20, flexShrink:0 }}>
                {[
                  { val:`${r.questions_correct}/${r.questions_total}`, lbl:'Questions' },
                  { val:`${r.tasks_done}/${r.tasks_total}`,            lbl:'Tasks' },
                  { val:r.score,                                        lbl:'Score' },
                ].map(s => (
                  <div key={s.lbl} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14,
                      color:'var(--text)' }}>{s.val}</div>
                    <div style={{ fontSize:11, color:'var(--text-4)' }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
