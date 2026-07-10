import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const ANIM = `
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes glowPulse{0%,100%{box-shadow:0 0 14px rgba(0,194,230,.2)}50%{box-shadow:0 0 28px rgba(0,194,230,.5)}}
  @keyframes scanline{0%{top:-2px}100%{top:100%}}
`

const LAYERS = api.LAB_LAYERS
const LAYER_ALL = { slug: 'all', label: 'All Layers', color: 'var(--accent)', icon: '⚡' }

const catStyle = {
  offensive:  { color: 'var(--offensive)',  bg: 'rgba(240,82,74,0.10)',   border: 'rgba(240,82,74,0.25)' },
  defensive:  { color: 'var(--defensive)',  bg: 'rgba(74,144,240,0.10)',  border: 'rgba(74,144,240,0.25)' },
  mitigation: { color: 'var(--mitigation)', bg: 'rgba(20,201,168,0.10)',  border: 'rgba(20,201,168,0.25)' },
  risk:       { color: 'var(--combined)',   bg: 'rgba(155,124,240,0.10)', border: 'rgba(155,124,240,0.25)' },
}

const diffBadge = { easy: 'var(--mitigation)', medium: 'var(--warning)', hard: 'var(--offensive)' }

function LayerIcon({ slug, size = 18 }) {
  const l = LAYERS.find(x => x.slug === slug)
  return <span style={{ fontSize: size }}>{l?.icon ?? '⚡'}</span>
}

function RoomCard({ room, idx }) {
  const navigate = useNavigate()
  const cs = catStyle[room.category?.slug] ?? catStyle.offensive
  const lyr = LAYERS.find(l => l.slug === room.lab_layer)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate(`/rooms/${room.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(145deg,${cs.bg},rgba(13,24,38,0.92))`
          : 'rgba(13,24,38,0.75)',
        border: `1px solid ${hovered ? cs.border : 'var(--border)'}`,
        borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
        transition: 'all .2s ease', backdropFilter: 'blur(14px)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${cs.bg}` : '0 4px 16px rgba(0,0,0,0.2)',
        animation: `fadeUp .5s ${idx * 0.06}s ease both`,
        position: 'relative', overflow: 'hidden',
      }}>

      {/* subtle number watermark */}
      <div style={{ position: 'absolute', right: 16, top: 8, fontSize: 72, fontWeight: 900,
        color: cs.color, opacity: 0.04, fontFamily: 'var(--font-mono)', lineHeight: 1, userSelect: 'none' }}>
        {String(room.sort_order).padStart(2, '0')}
      </div>

      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lyr && (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${lyr.color}18`,
              border: `1px solid ${lyr.color}40`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 16 }}>
              {lyr.icon}
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em',
              color: lyr?.color ?? 'var(--accent)', fontWeight: 700 }}>
              {lyr?.label ?? room.lab_layer}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
              {room.challenge_count ?? 0} task{room.challenge_count !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <span className={`category-tag tag-${room.category?.color}`}>{room.category?.name}</span>
      </div>

      {/* title */}
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: 'var(--text)', lineHeight: 1.3 }}>
        {room.title}
      </div>

      {/* description */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.7,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {room.description}
      </p>

      {/* bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: diffBadge[room.difficulty] ?? 'var(--accent)' }} />
          <span style={{ fontSize: 11, color: diffBadge[room.difficulty] ?? 'var(--accent)', fontWeight: 600, textTransform: 'capitalize' }}>
            {room.difficulty}
          </span>
        </div>
        <div style={{ fontSize: 12, color: cs.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          Start Room <span style={{ fontSize: 14 }}>→</span>
        </div>
      </div>
    </div>
  )
}

export default function Roadmap() {
  const [rooms, setRooms] = useState([])
  const [categories, setCategories] = useState([])
  const [activeLayer, setActiveLayer] = useState('all')
  const [activeCat, setActiveCat] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.listRooms().catch(() => []),
      api.listCategoriesPublic().catch(() => []),
    ]).then(([r, c]) => { setRooms(r); setCategories(c) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = rooms.filter(r => {
    const catOk = activeCat === 'all' || r.category?.slug === activeCat
    const layOk = activeLayer === 'all' || r.lab_layer === activeLayer
    return catOk && layOk
  })

  // group by category for roadmap view
  const grouped = {}
  filtered.forEach(r => {
    const key = r.category?.slug ?? 'other'
    if (!grouped[key]) grouped[key] = { cat: r.category, rooms: [] }
    grouped[key].rooms.push(r)
  })

  const totalRooms = rooms.length
  const totalChallenges = rooms.reduce((s, r) => s + (r.challenge_count ?? 0), 0)

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 38, height: 38, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading roadmap…</span>
      </div>
    </div>
  )

  return (
    <div className="page">
      <style>{ANIM}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both', position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, height: 2, width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(0,194,230,0.3))', pointerEvents: 'none',
          animation: 'scanline 8s linear infinite' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--accent)', fontWeight: 700 }}>Learning Roadmap</span>
        </div>
        <h1>ICS/OT Cyber Range</h1>
        <p className="subtitle">Structured learning paths across PLC, SCADA, ICSim, Wazuh and Risk layers. Complete rooms in order to build real-world skills.</p>

        {/* meta stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Rooms', value: totalRooms, color: 'var(--accent)' },
            { label: 'Challenges', value: totalChallenges, color: 'var(--mitigation)' },
            { label: 'Lab Layers', value: LAYERS.length, color: 'var(--warning)' },
            { label: 'Categories', value: categories.length, color: 'var(--combined)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '8px 16px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lab Layer tabs ── */}
      <div style={{ marginBottom: 16, animation: 'fadeUp .4s .05s ease both' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 10 }}>Lab Layer</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[LAYER_ALL, ...LAYERS].map(l => (
            <button key={l.slug} onClick={() => setActiveLayer(l.slug)}
              style={{
                padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1px solid ${activeLayer === l.slug ? l.color + '60' : 'var(--border)'}`,
                background: activeLayer === l.slug ? `${l.color}18` : 'var(--surface-2)',
                color: activeLayer === l.slug ? l.color : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: activeLayer === l.slug ? `0 0 10px ${l.color}25` : 'none',
              }}>
              <span>{l.icon}</span>{l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="filter-tabs" style={{ marginBottom: 28, animation: 'fadeUp .4s .08s ease both' }}>
        <button className={activeCat === 'all' ? 'active' : ''} onClick={() => setActiveCat('all')}>All Categories</button>
        {categories.map(c => (
          <button key={c.id} className={activeCat === c.slug ? 'active' : ''} onClick={() => setActiveCat(c.slug)}>{c.name}</button>
        ))}
      </div>

      {/* ── Room grid grouped by category ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 14, opacity: .3 }}>🗺️</div>
          <div style={{ fontSize: 15, marginBottom: 6 }}>No rooms match these filters</div>
          <div style={{ fontSize: 13 }}>Try selecting a different layer or category</div>
        </div>
      ) : (
        Object.entries(grouped).map(([catSlug, { cat, rooms: catRooms }]) => {
          const cs = catStyle[catSlug] ?? catStyle.offensive
          return (
            <div key={catSlug} style={{ marginBottom: 36 }}>
              {/* Category section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                paddingBottom: 12, borderBottom: `1px solid ${cs.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cs.color, boxShadow: `0 0 8px ${cs.color}` }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: cs.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {cat?.name ?? catSlug}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {catRooms.length} room{catRooms.length !== 1 ? 's' : ''}
                </span>
                {cat?.description && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>— {cat.description}</span>
                )}
              </div>

              {/* Path connector + cards */}
              <div style={{ position: 'relative' }}>
                {/* horizontal connector line for desktop */}
                {catRooms.length > 1 && (
                  <div style={{ position: 'absolute', top: 46, left: '5%', right: '5%', height: 1,
                    background: `linear-gradient(90deg,transparent,${cs.border},${cs.border},transparent)`,
                    zIndex: 0, pointerEvents: 'none' }} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, position: 'relative', zIndex: 1 }}>
                  {catRooms.map((room, idx) => (
                    <RoomCard key={room.id} room={room} idx={idx} />
                  ))}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
