import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const PATH_META = {
  offensive:  { label:'Offensive',  color:'var(--cat-offensive)', desc:'Attack ICS/OT — PLC, SCADA, CAN bus' },
  defensive:  { label:'Defensive',  color:'var(--cat-defensive)', desc:'Detect and respond with Wazuh, Suricata' },
  mitigation: { label:'Mitigation', color:'var(--cat-mitigation)', desc:'Harden systems, recover from incidents' },
  risk:       { label:'Risk',       color:'var(--cat-risk)',       desc:'Assess and model OT cybersecurity risk' },
}
const DIFF_COLOR = {
  beginner:'var(--green)', easy:'var(--green)',
  medium:'var(--amber)', hard:'var(--red)',
  expert:'var(--red)', intermediate:'var(--amber)', advanced:'var(--red)',
}

function RoomNode({ room, pathColor, isLast }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const taskCount = room.task_count ?? room.challenge_count ?? 0
  const empty = taskCount === 0
  return (
    <div style={{ position:'relative' }}>
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={() => !empty && navigate(`/rooms/${room.slug}`)}
        style={{
          background: hov && !empty ? 'var(--surface-3)' : 'var(--surface-2)',
          border: `1px solid ${hov && !empty ? pathColor+'40' : 'var(--border)'}`,
          borderRadius:'var(--r)', padding:'14px 16px',
          cursor: empty ? 'default' : 'pointer',
          opacity: empty ? 0.5 : 1, transition:'all .2s',
          position:'relative', overflow:'hidden',
        }}>
        {empty && (
          <div style={{
            position:'absolute', top:6, right:-10, background:'var(--surface-4)',
            color:'var(--text-4)', fontSize:8, fontWeight:700, letterSpacing:'.08em',
            textTransform:'uppercase', padding:'2px 20px', transform:'rotate(35deg)',
          }}>Soon</div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:DIFF_COLOR[room.difficulty]??pathColor, textTransform:'capitalize' }}>
            {room.difficulty}
          </span>
          <span style={{ fontSize:10, color:'var(--text-4)' }}>{taskCount} tasks</span>
        </div>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:5, lineHeight:1.3 }}>{room.title}</div>
        <p style={{
          fontSize:11, color:'var(--text-4)', margin:0, lineHeight:1.6,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>{room.description}</p>
        {!empty && hov && <div style={{ marginTop:8, fontSize:11, color:pathColor, fontWeight:600 }}>Enter →</div>}
      </div>
      {!isLast && (
        <div style={{ display:'flex', justifyContent:'center', margin:'4px 0' }}>
          <div style={{ width:1, height:20, background:`linear-gradient(180deg, ${pathColor}50, transparent)` }} />
        </div>
      )}
    </div>
  )
}

function PathCol({ pathData, meta, isActive, onToggle, moduleProgress }) {
  const modules = pathData?.modules ?? []
  const allRooms = modules.flatMap(m => m.rooms ?? [])

  return (
    <div style={{ flex:1, minWidth:200, maxWidth:290, opacity:isActive?1:0.25, filter:isActive?'none':'grayscale(70%)', transition:'opacity .2s, filter .2s' }}>
      <div onClick={onToggle} style={{
        background: isActive ? `linear-gradient(135deg, ${meta.color}12, var(--surface))` : 'var(--surface)',
        border:`1px solid ${isActive ? meta.color+'30' : 'var(--border)'}`,
        borderRadius:'var(--r-lg)', padding:'18px 16px', marginBottom:16,
        cursor:'pointer', textAlign:'center', transition:'all .2s',
      }}>
        <div style={{ fontWeight:800, fontSize:14, color:meta.color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
          {meta.label}
        </div>
        <p style={{ fontSize:11, color:'var(--text-4)', margin:'0 0 10px', lineHeight:1.6 }}>{meta.desc}</p>
        <span style={{ fontSize:10, color:'var(--text-4)', fontFamily:'var(--mono)' }}>
          {allRooms.length} room{allRooms.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
        <div style={{ width:1, height:20, background:`linear-gradient(180deg, ${meta.color}50, transparent)` }} />
      </div>

      {modules.map(mod => {
        const modRooms = mod.rooms ?? []
        const allRoomsDone = modRooms.length > 0 && modRooms.every(r => r.task_count > 0)
        const mp = moduleProgress?.[mod.id]
        const allCompleted = mp?.is_completed || false
        const hasQuiz = mod.quiz_question_count > 0
        return (
          <div key={mod.id} style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${meta.color}30, transparent)` }} />
              <span style={{
                fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em',
                color:meta.color, padding:'3px 9px', borderRadius:999,
                background:`${meta.color}10`, border:`1px solid ${meta.color}25`, whiteSpace:'nowrap',
              }}>{mod.title}</span>
              <div style={{ flex:1, height:1, background:`linear-gradient(90deg, transparent, ${meta.color}30)` }} />
            </div>
            {modRooms.map((room, i) => (
              <RoomNode key={room.id} room={room} pathColor={meta.color} isLast={i === (modRooms.length - 1) && !allCompleted} />
            ))}
            {modRooms.length === 0 && (
              <div style={{ textAlign:'center', padding:'10px 0', color:'var(--text-4)', fontSize:11, opacity:.6 }}>No rooms yet</div>
            )}
            {/* Quiz button — shown when all rooms are completed */}
            {allCompleted && (
              <Link to={`/modules/${mod.id}/quiz`} style={{ textDecoration:'none' }}>
                <div style={{
                  marginTop:8, padding:'10px 14px', borderRadius:'var(--r-md)',
                  background: `linear-gradient(135deg, ${meta.color}12, transparent)`,
                  border:`1px solid ${meta.color}40`,
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  cursor:'pointer', transition:'all .2s',
                }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:meta.color }}>📝 Module Quiz</div>
                    <div style={{ fontSize:10, color:'var(--text-4)', marginTop:2 }}>
                      {mp?.quiz_passed ? '✓ Passed' : 'Test your knowledge'}
                    </div>
                  </div>
                  <span style={{ color:meta.color, fontSize:14 }}>→</span>
                </div>
              </Link>
            )}
          </div>
        )
      })}

      {modules.length === 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-4)', fontSize:12 }}>Coming soon</div>
      )}

      <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
        <div style={{ width:10, height:10, borderRadius:'50%', border:`1px solid ${meta.color}50`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:4, height:4, borderRadius:'50%', background:meta.color, animation:'pulse 2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

export default function Roadmap() {
  const { user } = useAuth()
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePath, setActivePath] = useState(null)
  const [moduleProgress, setModuleProgress] = useState({}) // moduleId → progress

  useEffect(() => {
    api.listPaths()
      .then(cards => Promise.all(cards.map(c => api.getPath(c.slug))))
      .then(setPaths)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch module-level progress for learners
  useEffect(() => {
    if (user?.role !== 'learner') return
    api.getMyModuleProgress().then(setModuleProgress).catch(() => {})
  }, [user])

  const pathOrder = ['offensive', 'defensive', 'mitigation', 'risk']
  const sorted = pathOrder.map(slug => paths.find(p => p.slug === slug)).filter(Boolean)
  const allRooms = paths.flatMap(p => (p.modules ?? []).flatMap(m => m.rooms ?? []))
  const totalTasks = allRooms.reduce((s, r) => s + (r.task_count ?? 0), 0)

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page page-full fade-up" style={{ padding:'40px 44px' }}>
      <div style={{ marginBottom:36 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:10 }}>
          Learning Roadmap
        </p>
        <h1 style={{ fontSize:30, marginBottom:10 }}>ICS/OT Cyber Range</h1>
        <p style={{ color:'var(--text-3)', fontSize:14, maxWidth:540, marginBottom:20 }}>
          Four learning paths, each divided into modules and rooms. Click a path to focus it.
        </p>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { val:4,               lbl:'Paths',  color:'var(--cyan)'  },
            { val:allRooms.length, lbl:'Rooms',  color:'var(--teal)'  },
            { val:totalTasks,      lbl:'Tasks',  color:'var(--amber)' },
          ].map(s => (
            <div key={s.lbl} style={{ display:'flex', alignItems:'baseline', gap:7 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:s.color }}>{s.val}</span>
              <span style={{ fontSize:12, color:'var(--text-4)' }}>{s.lbl}</span>
            </div>
          ))}
          {activePath && <button className="btn-ghost btn-sm" onClick={() => setActivePath(null)}>Show all</button>}
        </div>
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'flex-start', overflowX:'auto', paddingBottom:32 }}>
        {sorted.map(pathData => {
          const meta = PATH_META[pathData.slug] ?? { label:pathData.title, color:pathData.color ?? 'var(--cyan)', desc:pathData.description }
          return (
            <PathCol
              key={pathData.slug}
              pathData={pathData}
              meta={meta}
              isActive={activePath === null || activePath === pathData.slug}
              onToggle={() => setActivePath(activePath === pathData.slug ? null : pathData.slug)}
              moduleProgress={moduleProgress}
            />
          )
        })}
      </div>

      <p style={{ textAlign:'center', fontSize:12, color:'var(--text-4)', marginTop:8 }}>
        Faded paths are in development — rooms appear as they get deployed.
      </p>
    </div>
  )
}
