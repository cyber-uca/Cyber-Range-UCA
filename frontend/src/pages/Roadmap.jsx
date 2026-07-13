import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

/* ─── design tokens ────────────────────────────────────────────────────── */
const PATHS = [
  {
    key: 'offensive',
    label: 'Offensive',
    color: '#F0524A',
    dim: 'rgba(240,82,74,0.12)',
    border: 'rgba(240,82,74,0.35)',
    glow: 'rgba(240,82,74,0.25)',
    icon: '⚔️',
    desc: 'Attack ICS/OT systems — PLC, SCADA, CAN bus exploitation',
  },
  {
    key: 'defensive',
    label: 'Defensive',
    color: '#4A90F0',
    dim: 'rgba(74,144,240,0.12)',
    border: 'rgba(74,144,240,0.35)',
    glow: 'rgba(74,144,240,0.25)',
    icon: '🛡️',
    desc: 'Detect and respond with Wazuh, Suricata and IDS tooling',
  },
  {
    key: 'mitigation',
    label: 'Mitigation',
    color: '#14C9A8',
    dim: 'rgba(20,201,168,0.12)',
    border: 'rgba(20,201,168,0.35)',
    glow: 'rgba(20,201,168,0.25)',
    icon: '🔧',
    desc: 'Harden systems, respond to incidents and recover from attacks',
  },
  {
    key: 'risk',
    label: 'Risk',
    color: '#9B7CF0',
    dim: 'rgba(155,124,240,0.12)',
    border: 'rgba(155,124,240,0.35)',
    glow: 'rgba(155,124,240,0.25)',
    icon: '⚠️',
    desc: 'Assess, model and manage cybersecurity risk in OT environments',
    modules: ['Accidental Risk', 'Environmental Risk', 'Regulatory Risk', 'Organizational Risk'],
  },
]

const DIFF_COLOR = { easy: '#14C9A8', medium: '#F5A623', hard: '#F0524A' }

const ANIM = `
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes dash{to{stroke-dashoffset:-20}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,194,230,.2)}50%{box-shadow:0 0 22px rgba(0,194,230,.5)}}
`

/* ─── SVG connector between two nodes ──────────────────────────────────── */
function Connector({ color, vertical = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: vertical ? 40 : 'auto', width: vertical ? 'auto' : 40,
      flexDirection: vertical ? 'column' : 'row',
      flexShrink: 0,
    }}>
      <div style={{
        width: vertical ? 2 : 40, height: vertical ? 40 : 2,
        background: `linear-gradient(${vertical ? '180deg' : '90deg'}, ${color}80, ${color}20)`,
        borderRadius: 2, position: 'relative',
      }}>
        {/* arrowhead */}
        <div style={{
          position: 'absolute',
          ...(vertical
            ? { bottom: -4, left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `6px solid ${color}80` }
            : { right: -4, top: '50%', transform: 'translateY(-50%)', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `6px solid ${color}80` }
          ),
        }} />
      </div>
    </div>
  )
}

/* ─── single room node in a path ───────────────────────────────────────── */
function RoomNode({ room, path, isLast, idx }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const isEmpty = (room.challenge_count ?? 0) === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* node card */}
      <div
        onClick={() => !isEmpty && navigate(`/rooms/${room.slug}`)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: '100%',
          background: hov && !isEmpty
            ? `linear-gradient(145deg,${path.dim},rgba(13,24,38,0.95))`
            : 'rgba(13,24,38,0.82)',
          border: `1px solid ${hov && !isEmpty ? path.border : 'var(--border)'}`,
          borderRadius: 12, padding: '14px 16px',
          cursor: isEmpty ? 'default' : 'pointer',
          transition: 'all .2s', backdropFilter: 'blur(14px)',
          transform: hov && !isEmpty ? 'scale(1.02)' : 'scale(1)',
          boxShadow: hov && !isEmpty ? `0 8px 28px rgba(0,0,0,0.4), 0 0 16px ${path.glow}` : 'none',
          opacity: isEmpty ? 0.55 : 1,
          animation: `fadeUp .5s ${idx * 0.08}s ease both`,
          position: 'relative', overflow: 'hidden',
        }}>

        {/* coming soon ribbon */}
        {isEmpty && (
          <div style={{
            position: 'absolute', top: 8, right: -18, background: 'rgba(126,143,163,0.25)',
            color: 'var(--text-dim)', fontSize: 8, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', padding: '2px 24px', transform: 'rotate(35deg)',
          }}>Soon</div>
        )}

        {/* top: diff dot + count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: DIFF_COLOR[room.difficulty] ?? path.color,
              boxShadow: !isEmpty ? `0 0 5px ${DIFF_COLOR[room.difficulty] ?? path.color}` : 'none' }} />
            <span style={{ fontSize: 10, color: DIFF_COLOR[room.difficulty] ?? path.color, fontWeight: 600, textTransform: 'capitalize' }}>
              {room.difficulty}
            </span>
          </div>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            {room.challenge_count ?? 0} task{room.challenge_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* title */}
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.35, marginBottom: 6 }}>
          {room.title}
        </div>

        {/* desc */}
        <p style={{
          fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {room.description}
        </p>

        {/* bottom action */}
        {!isEmpty && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4,
            color: path.color, fontSize: 11, fontWeight: 700 }}>
            Enter room <span>→</span>
          </div>
        )}
      </div>

      {/* connector to next node */}
      {!isLast && <Connector color={path.color} vertical={true} />}
    </div>
  )
}

/* ─── module block: a named group of rooms ──────────────────────────────── */
function ModuleBlock({ moduleName, rooms, path, startIdx }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {/* module label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${path.border},transparent)` }} />
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
          color: path.color, background: `${path.dim}`, border: `1px solid ${path.border}`,
          borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
        }}>
          {moduleName}
        </span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${path.border})` }} />
      </div>

      {/* rooms in this module */}
      {rooms.map((room, i) => (
        <RoomNode
          key={room.id}
          room={room}
          path={path}
          isLast={i === rooms.length - 1}
          idx={startIdx + i}
        />
      ))}
    </div>
  )
}

/* ─── one full vertical path column ─────────────────────────────────────── */
function PathColumn({ path, rooms, activePath, setActivePath }) {
  const isActive = activePath === null || activePath === path.key
  const navigate = useNavigate()

  // group rooms by module
  const grouped = []
  const seen = {}
  rooms.forEach(r => {
    const mod = r.module ?? 'General'
    if (!seen[mod]) { seen[mod] = []; grouped.push({ name: mod, rooms: seen[mod] }) }
    seen[mod].push(r)
  })

  let nodeIdx = 0

  return (
    <div style={{
      flex: 1, minWidth: 220, maxWidth: 320,
      opacity: isActive ? 1 : 0.35,
      transition: 'opacity .25s, filter .25s',
      filter: isActive ? 'none' : 'grayscale(60%)',
    }}>
      {/* path header */}
      <div
        onClick={() => setActivePath(activePath === path.key ? null : path.key)}
        style={{
          background: `linear-gradient(135deg,${path.dim},rgba(13,24,38,0.9))`,
          border: `1px solid ${path.border}`,
          borderRadius: 14, padding: '16px 18px', marginBottom: 16,
          cursor: 'pointer', transition: 'all .2s', textAlign: 'center',
          boxShadow: activePath === path.key ? `0 0 24px ${path.glow}` : 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px ${path.glow}`}
        onMouseLeave={e => e.currentTarget.style.boxShadow = activePath === path.key ? `0 0 24px ${path.glow}` : 'none'}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>{path.icon}</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: path.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          {path.label}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{path.desc}</p>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* start node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${path.dim}`,
          border: `2px solid ${path.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, boxShadow: `0 0 12px ${path.glow}` }}>
          {path.icon}
        </div>
        <Connector color={path.color} vertical={true} />
      </div>

      {/* modules + rooms */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 12 }}>
          No rooms yet
        </div>
      ) : (
        grouped.map(({ name, rooms: modRooms }) => {
          const block = (
            <ModuleBlock
              key={name}
              moduleName={name}
              rooms={modRooms}
              path={path}
              startIdx={nodeIdx}
            />
          )
          nodeIdx += modRooms.length
          return block
        })
      )}

      {/* end node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${path.dim}`,
          border: `1px solid ${path.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: path.color, animation: 'pulse 2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

/* ─── main page ──────────────────────────────────────────────────────────── */
export default function Roadmap() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePath, setActivePath] = useState(null)  // null = show all

  useEffect(() => {
    api.listRooms().catch(() => []).then(r => { setRooms(r) }).finally(() => setLoading(false))
  }, [])

  // group rooms by category
  const byPath = {}
  PATHS.forEach(p => { byPath[p.key] = [] })
  rooms.forEach(r => {
    const key = r.category?.slug ?? 'offensive'
    if (byPath[key]) byPath[key].push(r)
  })

  const totalRooms = rooms.length
  const totalChallenges = rooms.reduce((s, r) => s + (r.challenge_count ?? 0), 0)

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 38, height: 38, border: '2px solid var(--accent)', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading roadmap…</span>
      </div>
    </div>
  )

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      <style>{ANIM}</style>

      {/* ── header ── */}
      <div style={{ marginBottom: 32, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--accent)', fontWeight: 700 }}>
            Learning Roadmap
          </span>
        </div>
        <h1>ICS/OT Cyber Range</h1>
        <p className="subtitle">
          Four learning paths. Each path is divided into modules, each module into rooms.
          Click a path header to focus it, click a room to enter it.
        </p>

        {/* stats row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Paths', value: 4, color: 'var(--accent)' },
            { label: 'Rooms', value: totalRooms, color: 'var(--mitigation)' },
            { label: 'Challenges', value: totalChallenges, color: 'var(--warning)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '7px 16px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
          {activePath && (
            <button onClick={() => setActivePath(null)}
              style={{ fontSize: 11, padding: '7px 14px', borderRadius: 10, background: 'var(--surface-2)',
                border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              ✕ Show all paths
            </button>
          )}
        </div>
      </div>

      {/* ── 4-path schema ── */}
      <div style={{
        display: 'flex', gap: 20, alignItems: 'flex-start',
        overflowX: 'auto', paddingBottom: 24,
        animation: 'fadeIn .5s .1s ease both',
      }}>
        {/* horizontal connecting line at the top */}
        <div style={{
          position: 'absolute', pointerEvents: 'none',
          // rendered below via the path headers naturally
        }} />

        {PATHS.map(path => (
          <PathColumn
            key={path.key}
            path={path}
            rooms={byPath[path.key] ?? []}
            activePath={activePath}
            setActivePath={setActivePath}
          />
        ))}
      </div>

      {/* hint */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-dim)', animation: 'fadeIn 1s .4s ease both' }}>
        Faded paths are still being developed — rooms will appear as they are deployed.
      </div>
    </div>
  )
}
