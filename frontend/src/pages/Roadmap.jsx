import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

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

function PathCol({ pathData, isActive, onToggle, moduleProgress }) {
  // Use DB values directly — no hardcoded override
  const color = pathData.color ?? 'var(--cyan)'
  const modules = pathData?.modules ?? []
  const allRooms = modules.flatMap(m => m.rooms ?? [])

  const [expanded, setExpanded] = useState(() => {
    const s = new Set()
    if (modules.length > 0) s.add(modules[0].id)
    return s
  })
  const toggle = (id) => setExpanded(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  return (
    <div style={{ flex:1, minWidth:200, maxWidth:290, opacity:isActive?1:0.25, filter:isActive?'none':'grayscale(70%)', transition:'opacity .2s, filter .2s' }}>
      <div onClick={onToggle} style={{
        background: isActive ? `linear-gradient(135deg, ${color}12, var(--surface))` : 'var(--surface)',
        border:`1px solid ${isActive ? color+'30' : 'var(--border)'}`,
        borderRadius:'var(--r-lg)', padding:'18px 16px', marginBottom:16,
        cursor:'pointer', textAlign:'center', transition:'all .2s',
      }}>
        <div style={{ fontWeight:800, fontSize:14, color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
          {pathData.title}
        </div>
        <p style={{ fontSize:11, color:'var(--text-4)', margin:'0 0 10px', lineHeight:1.6 }}>{pathData.description}</p>
        <span style={{ fontSize:10, color:'var(--text-4)', fontFamily:'var(--mono)' }}>
          {allRooms.length} room{allRooms.length !== 1 ? 's' : ''} · {modules.length} module{modules.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
        <div style={{ width:1, height:20, background:`linear-gradient(180deg, ${color}50, transparent)` }} />
      </div>

      {modules.map((mod, mi) => {
        const modRooms = mod.rooms ?? []
        const mp = moduleProgress?.[mod.id]
        const allCompleted = mp?.is_completed || false
        const roomsDone = mp?.rooms_done ?? 0
        const roomsTotal = modRooms.length
        const isOpen = expanded.has(mod.id)
        const pct = roomsTotal > 0 ? Math.round(roomsDone / roomsTotal * 100) : 0

        return (
          <div key={mod.id} style={{ marginBottom:8 }}>
            <div onClick={() => toggle(mod.id)} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
              borderRadius:'var(--r-md)', cursor:'pointer', transition:'all .15s',
              background: isOpen ? `${color}08` : 'var(--surface-2)',
              border:`1px solid ${isOpen ? color+'25' : 'var(--border)'}`,
              marginBottom: isOpen ? 8 : 0,
            }}>
              <span style={{ fontSize:10, color, flexShrink:0, transition:'transform .2s',
                display:'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              <span style={{ fontSize:11, fontWeight:700, color, flex:1,
                textTransform:'uppercase', letterSpacing:'.06em', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {mod.title}
              </span>
              {roomsTotal > 0 && (
                <span style={{ fontSize:9, fontWeight:700, flexShrink:0,
                  color: allCompleted ? '#14C9A8' : 'var(--text-4)',
                  background: allCompleted ? 'rgba(20,201,168,0.1)' : 'var(--surface-3)',
                  padding:'1px 7px', borderRadius:999,
                  border:`1px solid ${allCompleted ? 'rgba(20,201,168,0.3)' : 'var(--border)'}` }}>
                  {allCompleted ? '✓' : `${roomsDone}/${roomsTotal}`}
                </span>
              )}
            </div>

            {!isOpen && roomsTotal > 0 && roomsDone > 0 && (
              <div style={{ height:2, borderRadius:999, background:'var(--border)', overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', borderRadius:999, background:color,
                  width:`${pct}%`, transition:'width .4s' }} />
              </div>
            )}

            {isOpen && (
              <div>
                {modRooms.map((room, i) => {
                  const isLastRoom = i === modRooms.length - 1 && !allCompleted
                  return <RoomNode key={room.id} room={room} pathColor={color} isLast={isLastRoom} />
                })}
                {modRooms.length === 0 && (
                  <div style={{ textAlign:'center', padding:'10px 0', color:'var(--text-4)', fontSize:11, opacity:.6 }}>No rooms yet</div>
                )}
                {allCompleted && (
                  <Link to={`/modules/${mod.id}/quiz`} style={{ textDecoration:'none' }}>
                    <div style={{
                      marginTop:8, padding:'9px 12px', borderRadius:'var(--r-md)',
                      background:`linear-gradient(135deg, ${color}12, transparent)`,
                      border:`1px solid ${color}40`,
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      cursor:'pointer',
                    }}>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color }}>📝 Module Quiz</div>
                        <div style={{ fontSize:10, color:'var(--text-4)', marginTop:1 }}>Test your knowledge</div>
                      </div>
                      <span style={{ color, fontSize:13 }}>→</span>
                    </div>
                  </Link>
                )}
                {mi < modules.length - 1 && (
                  <div style={{ display:'flex', justifyContent:'center', margin:'8px 0' }}>
                    <div style={{ width:1, height:16, background:`linear-gradient(180deg, ${color}30, transparent)` }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {modules.length === 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-4)', fontSize:12 }}>Coming soon</div>
      )}

      <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
        <div style={{ width:10, height:10, borderRadius:'50%', border:`1px solid ${color}50`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:4, height:4, borderRadius:'50%', background:color, animation:'pulse 2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// ── Coming-soon domain placeholder ─────────────────────────────────────────
function ComingSoonDomain({ domain }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:320, gap:16, padding:'40px 20px',
    }}>
      <div style={{
        width:72, height:72, borderRadius:20,
        background:`${domain.color}12`,
        border:`1px dashed ${domain.color}40`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:32,
      }}>
        {domain.icon}
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text-2)', marginBottom:8 }}>
          {domain.label} Domain
        </div>
        <p style={{ fontSize:13, color:'var(--text-4)', maxWidth:400, lineHeight:1.7, margin:'0 auto 20px' }}>
          {domain.desc}
        </p>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em',
          color: domain.color, background:`${domain.color}10`,
          border:`1px solid ${domain.color}30`,
          padding:'5px 14px', borderRadius:999,
        }}>
          In development
        </div>
      </div>
    </div>
  )
}

export default function Roadmap() {
  const { user } = useAuth()
  const [domains, setDomains]     = useState([])
  const [paths, setPaths]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeDomain, setActiveDomain] = useState(null) // set after domains load
  const [activePath, setActivePath]     = useState(null)
  const [moduleProgress, setModuleProgress] = useState({})

  useEffect(() => {
    Promise.all([
      api.listDomains(),
      api.listPaths().then(cards => Promise.all(cards.map(c => api.getPath(c.slug)))),
    ]).then(([doms, fullPaths]) => {
      setDomains(doms)
      setPaths(fullPaths)
      if (doms.length > 0) setActiveDomain(doms[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user?.role !== 'learner') return
    api.getMyModuleProgress().then(setModuleProgress).catch(() => {})
  }, [user])

  const currentDomain = domains.find(d => d.id === activeDomain) ?? domains[0]

  const domainPaths = currentDomain
    ? paths.filter(p => p.domain_id === currentDomain.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : []

  // Paths not assigned to any domain shown under first domain as fallback
  const assignedIds = new Set(paths.filter(p => p.domain_id).map(p => p.id))
  const unassigned  = paths.filter(p => !p.domain_id)
  const displayPaths = currentDomain && domains.indexOf(currentDomain) === 0
    ? [...domainPaths, ...unassigned]
    : domainPaths

  const allRooms  = paths.flatMap(p => (p.modules ?? []).flatMap(m => m.rooms ?? []))
  const totalTasks = allRooms.reduce((s, r) => s + (r.task_count ?? 0), 0)

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page page-full fade-up" style={{ padding:'40px 44px' }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:10 }}>
          Learning Roadmap
        </p>
        <h1 style={{ fontSize:30, marginBottom:10 }}>ICS/OT Cyber Range</h1>
        <p style={{ color:'var(--text-3)', fontSize:14, maxWidth:540, marginBottom:20 }}>
          Multi-domain training across ICS/OT cybersecurity. Select a domain to explore its learning paths.
        </p>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { val: paths.length,        lbl:'Paths',  color:'var(--cyan)'  },
            { val: allRooms.length,      lbl:'Rooms',  color:'var(--teal)'  },
            { val: totalTasks,           lbl:'Tasks',  color:'var(--amber)' },
          ].map(s => (
            <div key={s.lbl} style={{ display:'flex', alignItems:'baseline', gap:7 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:s.color }}>{s.val}</span>
              <span style={{ fontSize:12, color:'var(--text-4)' }}>{s.lbl}</span>
            </div>
          ))}
          {activePath && (
            <button className="btn-ghost btn-sm" onClick={() => setActivePath(null)}>Show all paths</button>
          )}
        </div>
      </div>

      {/* ── Domain tab bar ── */}
      <div className="rm-domain-tabs">
        {domains.map(d => (
          <button
            key={d.id}
            className={`rm-domain-tab${activeDomain === d.id ? ' active' : ''}${!d.is_active ? ' coming' : ''}`}
            onClick={() => { setActiveDomain(d.id); setActivePath(null) }}
            style={{ '--tab-color': d.color }}
          >
            <span className="rm-domain-tab-label">{d.title}</span>
            {!d.is_active && <span className="rm-domain-tab-soon">Soon</span>}
          </button>
        ))}
        {domains.length === 0 && (
          <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-4)' }}>
            No domains configured — add one in Admin → Domains.
          </div>
        )}
      </div>

      {/* ── Domain description strip ── */}
      {currentDomain && (
        <div className="rm-domain-desc" style={{ '--tab-color': currentDomain.color }}>
          <span className="rm-domain-desc-text">{currentDomain.description}</span>
        </div>
      )}

      {/* ── Content ── */}
      {currentDomain && !currentDomain.is_active ? (
        <ComingSoonDomain domain={{ ...currentDomain, desc: currentDomain.description }} />
      ) : (
        <>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start', overflowX:'auto', paddingBottom:32 }} className="roadmap-cols">
            {displayPaths.map(pathData => (
              <PathCol
                key={pathData.slug}
                pathData={pathData}
                isActive={activePath === null || activePath === pathData.slug}
                onToggle={() => setActivePath(activePath === pathData.slug ? null : pathData.slug)}
                moduleProgress={moduleProgress}
              />
            ))}
            {displayPaths.length === 0 && (
              <div style={{ color:'var(--text-4)', fontSize:13, padding:'40px 0' }}>
                No paths deployed yet for this domain.
              </div>
            )}
          </div>

          <p style={{ textAlign:'center', fontSize:12, color:'var(--text-4)', marginTop:8 }}>
            Faded paths are in development — rooms appear as they get deployed.
          </p>
        </>
      )}
    </div>
  )
}
