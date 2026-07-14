import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const PATHS = [
  { key:'offensive',  label:'Offensive',  color:'var(--cat-offensive)', desc:'Attack ICS/OT — PLC, SCADA, CAN bus' },
  { key:'defensive',  label:'Defensive',  color:'var(--cat-defensive)', desc:'Detect and respond with Wazuh, Suricata' },
  { key:'mitigation', label:'Mitigation', color:'var(--cat-mitigation)', desc:'Harden systems, recover from incidents' },
  { key:'risk',       label:'Risk',       color:'var(--cat-risk)', desc:'Assess and model OT cybersecurity risk' },
]
const DIFF_COLOR = { easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)' }

function RoomNode({ room, pathColor, isLast }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const empty = (room.challenge_count ?? 0) === 0
  return (
    <div style={{ position:'relative' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={() => !empty && navigate(`/rooms/${room.slug}`)}
        style={{
          background: hov && !empty ? 'var(--surface-3)' : 'var(--surface-2)',
          border: `1px solid ${hov && !empty ? pathColor+'40' : 'var(--border)'}`,
          borderRadius:'var(--r)',
          padding:'14px 16px',
          cursor: empty ? 'default' : 'pointer',
          opacity: empty ? 0.5 : 1,
          transition:'all .2s',
          position:'relative', overflow:'hidden',
        }}>
        {empty && (
          <div style={{ position:'absolute', top:6, right:-10, background:'var(--surface-4)',
            color:'var(--text-4)', fontSize:8, fontWeight:700, letterSpacing:'.08em',
            textTransform:'uppercase', padding:'2px 20px', transform:'rotate(35deg)' }}>Soon</div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:DIFF_COLOR[room.difficulty]??pathColor, textTransform:'capitalize' }}>
            {room.difficulty}
          </span>
          <span style={{ fontSize:10, color:'var(--text-4)' }}>{room.challenge_count} tasks</span>
        </div>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:5, lineHeight:1.3 }}>{room.title}</div>
        <p style={{ fontSize:11, color:'var(--text-4)', margin:0, lineHeight:1.6,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {room.description}
        </p>
        {!empty && hov && (
          <div style={{ marginTop:8, fontSize:11, color:pathColor, fontWeight:600 }}>Enter →</div>
        )}
      </div>
      {!isLast && (
        <div style={{ display:'flex', justifyContent:'center', margin:'4px 0' }}>
          <div style={{ width:1, height:20, background:`linear-gradient(180deg, ${pathColor}50, transparent)` }} />
        </div>
      )}
    </div>
  )
}

function PathCol({ path, rooms, isActive, onToggle }) {
  const grouped = {}
  rooms.forEach(r => {
    const mod = r.module ?? 'General'
    if (!grouped[mod]) grouped[mod] = []
    grouped[mod].push(r)
  })

  return (
    <div style={{ flex:1, minWidth:200, maxWidth:290,
      opacity: isActive ? 1 : 0.25,
      filter: isActive ? 'none' : 'grayscale(70%)',
      transition:'opacity .2s, filter .2s' }}>
      {/* Path header */}
      <div onClick={onToggle} style={{
        background: isActive
          ? `linear-gradient(135deg, ${path.color}12, var(--surface))`
          : 'var(--surface)',
        border:`1px solid ${isActive ? path.color+'30' : 'var(--border)'}`,
        borderRadius:'var(--r-lg)', padding:'18px 16px', marginBottom:16,
        cursor:'pointer', textAlign:'center', transition:'all .2s',
      }}>
        <div style={{ fontWeight:800, fontSize:14, color:path.color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
          {path.label}
        </div>
        <p style={{ fontSize:11, color:'var(--text-4)', margin:'0 0 10px', lineHeight:1.6 }}>{path.desc}</p>
        <span style={{ fontSize:10, color:'var(--text-4)', fontFamily:'var(--mono)' }}>
          {rooms.length} room{rooms.length!==1?'s':''}
        </span>
      </div>

      {/* Connector from header */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
        <div style={{ width:1, height:20, background:`linear-gradient(180deg, ${path.color}50, transparent)` }} />
      </div>

      {/* Modules */}
      {Object.entries(grouped).map(([mod, modRooms]) => (
        <div key={mod} style={{ marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${path.color}30, transparent)` }} />
            <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em',
              color:path.color, padding:'3px 9px', borderRadius:999,
              background:`${path.color}10`, border:`1px solid ${path.color}25`, whiteSpace:'nowrap' }}>
              {mod}
            </span>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg, transparent, ${path.color}30)` }} />
          </div>
          {modRooms.map((room, i) => (
            <RoomNode key={room.id} room={room} pathColor={path.color} isLast={i===modRooms.length-1} />
          ))}
        </div>
      ))}

      {rooms.length===0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-4)', fontSize:12 }}>Coming soon</div>
      )}

      {/* End node */}
      <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
        <div style={{ width:10, height:10, borderRadius:'50%', border:`1px solid ${path.color}50`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:4, height:4, borderRadius:'50%', background:path.color, animation:'pulse 2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

export default function Roadmap() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePath, setActivePath] = useState(null)

  useEffect(() => {
    api.listRooms().then(setRooms).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const byPath = {}
  PATHS.forEach(p => { byPath[p.key] = [] })
  rooms.forEach(r => {
    const key = r.category?.slug ?? 'offensive'
    if (byPath[key]) byPath[key].push(r)
  })

  const totalTasks = rooms.reduce((s,r) => s+(r.challenge_count??0), 0)

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
            { val:4, lbl:'Paths', color:'var(--cyan)' },
            { val:rooms.length, lbl:'Rooms', color:'var(--teal)' },
            { val:totalTasks, lbl:'Challenges', color:'var(--amber)' },
          ].map(s => (
            <div key={s.lbl} style={{ display:'flex', alignItems:'baseline', gap:7 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:s.color }}>{s.val}</span>
              <span style={{ fontSize:12, color:'var(--text-4)' }}>{s.lbl}</span>
            </div>
          ))}
          {activePath && (
            <button className="btn-ghost btn-sm" onClick={() => setActivePath(null)}>Show all</button>
          )}
        </div>
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'flex-start', overflowX:'auto', paddingBottom:32 }}>
        {PATHS.map(path => (
          <PathCol key={path.key} path={path}
            rooms={byPath[path.key]??[]}
            isActive={activePath===null || activePath===path.key}
            onToggle={() => setActivePath(activePath===path.key ? null : path.key)}
          />
        ))}
      </div>

      <p style={{ textAlign:'center', fontSize:12, color:'var(--text-4)', marginTop:8 }}>
        Faded paths are in development — rooms appear as they get deployed.
      </p>
    </div>
  )
}
