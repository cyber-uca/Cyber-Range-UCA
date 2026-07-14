import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const PATHS = [
  { key: 'offensive',  label: 'Offensive',  color: 'var(--red)',    desc: 'Attack ICS/OT systems — PLC, SCADA, CAN bus exploitation' },
  { key: 'defensive',  label: 'Defensive',  color: 'var(--blue)',   desc: 'Detect and respond using Wazuh, Suricata, IDS tooling' },
  { key: 'mitigation', label: 'Mitigation', color: 'var(--teal)',   desc: 'Harden systems, respond to incidents and recover' },
  { key: 'risk',       label: 'Risk',       color: 'var(--purple)', desc: 'Assess, model and manage cybersecurity risk in OT environments' },
]

const DIFF_COLOR = { easy: 'var(--teal)', medium: 'var(--amber)', hard: 'var(--red)' }

function RoomCard({ room, pathColor }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const empty = (room.challenge_count ?? 0) === 0

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => !empty && navigate(`/rooms/${room.slug}`)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hov && !empty ? pathColor + '50' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        cursor: empty ? 'default' : 'pointer',
        opacity: empty ? 0.55 : 1,
        transition: 'border-color .2s, transform .15s, box-shadow .15s',
        transform: hov && !empty ? 'translateY(-2px)' : 'none',
        boxShadow: hov && !empty ? '0 6px 24px rgba(0,0,0,0.3)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {empty && (
        <div style={{
          position: 'absolute', top: 8, right: -14, background: 'var(--surface-3)',
          color: 'var(--text-dim)', fontSize: 8, fontWeight: 700, letterSpacing: '.08em',
          textTransform: 'uppercase', padding: '2px 22px', transform: 'rotate(35deg)',
        }}>Soon</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: DIFF_COLOR[room.difficulty] ?? pathColor, textTransform: 'capitalize' }}>
          {room.difficulty}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{room.challenge_count ?? 0} tasks</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{room.title}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {room.description}
      </p>
      {!empty && (
        <div style={{ marginTop: 12, fontSize: 12, color: pathColor, fontWeight: 600 }}>
          Enter room →
        </div>
      )}
    </div>
  )
}

function PathColumn({ path, rooms, isActive, onToggle }) {
  const grouped = {}
  rooms.forEach(r => {
    const mod = r.module ?? 'General'
    if (!grouped[mod]) grouped[mod] = []
    grouped[mod].push(r)
  })

  return (
    <div style={{
      flex: 1, minWidth: 210, maxWidth: 300,
      opacity: isActive ? 1 : 0.3,
      filter: isActive ? 'none' : 'grayscale(60%)',
      transition: 'opacity .2s, filter .2s',
    }}>
      {/* Path header */}
      <div onClick={onToggle} style={{
        background: 'var(--surface)',
        border: `1px solid ${isActive ? path.color + '40' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: '18px 16px',
        marginBottom: 16,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'border-color .2s',
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: path.color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
          {path.label}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.6 }}>{path.desc}</p>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Connector start */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{ width: 2, height: 20, background: `linear-gradient(180deg, ${path.color}60, ${path.color}20)` }} />
      </div>

      {/* Modules + rooms */}
      {Object.entries(grouped).map(([modName, modRooms]) => (
        <div key={modName} style={{ marginBottom: 16 }}>
          {/* Module label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${path.color}40, transparent)` }} />
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
              color: path.color, padding: '3px 10px', borderRadius: 999,
              background: `${path.color}12`, border: `1px solid ${path.color}25`,
              whiteSpace: 'nowrap',
            }}>{modName}</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${path.color}40)` }} />
          </div>

          {/* Room cards */}
          {modRooms.map((room, i) => (
            <div key={room.id}>
              <RoomCard room={room} pathColor={path.color} />
              {i < modRooms.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                  <div style={{ width: 2, height: 16, background: `linear-gradient(180deg, ${path.color}50, ${path.color}20)` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {rooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 12 }}>
          No rooms yet
        </div>
      )}
    </div>
  )
}

export default function Roadmap() {
  const [rooms,      setRooms]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activePath, setActivePath] = useState(null)

  useEffect(() => {
    api.listRooms().then(setRooms).catch(() => []).finally(() => setLoading(false))
  }, [])

  const byPath = {}
  PATHS.forEach(p => { byPath[p.key] = [] })
  rooms.forEach(r => {
    const key = r.category?.slug ?? 'offensive'
    if (byPath[key]) byPath[key].push(r)
  })

  const totalTasks = rooms.reduce((s, r) => s + (r.challenge_count ?? 0), 0)

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page page-wide fade-up">
      <div className="page-header">
        <h1>Learning Roadmap</h1>
        <p className="lead" style={{ marginTop: 6 }}>
          Four learning paths, each split into modules and rooms. Click a path header to focus it.
        </p>
        <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
          {[
            { val: 4,           lbl: 'Paths'      },
            { val: rooms.length,lbl: 'Rooms'      },
            { val: totalTasks,  lbl: 'Challenges' },
          ].map(s => (
            <div key={s.lbl} style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '6px 14px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>{s.val}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.lbl}</span>
            </div>
          ))}
          {activePath && (
            <button className="btn-ghost btn-sm" onClick={() => setActivePath(null)}>
              Show all paths
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 24 }}>
        {PATHS.map(path => (
          <PathColumn
            key={path.key}
            path={path}
            rooms={byPath[path.key] ?? []}
            isActive={activePath === null || activePath === path.key}
            onToggle={() => setActivePath(activePath === path.key ? null : path.key)}
          />
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
        Faded paths are still being developed — rooms will appear as they get deployed.
      </p>
    </div>
  )
}
