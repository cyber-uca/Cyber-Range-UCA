import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`

const diffColor = { easy: 'var(--mitigation)', medium: 'var(--warning)', hard: 'var(--offensive)' }

const layerMeta = Object.fromEntries(api.LAB_LAYERS.map(l => [l.slug, l]))

function ChallengeRow({ c, idx }) {
  const navigate = useNavigate()
  const lyr = layerMeta[c.lab_layer]

  return (
    <tr key={c.id} onClick={() => navigate(`/challenges/${c.id}`)}
      style={{ cursor: 'pointer', animation: `fadeUp .3s ${idx * 0.03}s ease both` }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lyr && (
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${lyr.color}18`,
              border: `1px solid ${lyr.color}30`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
              {lyr.icon}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</div>
            {c.tags && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{c.tags.split(',').slice(0,3).join(' · ')}</div>}
          </div>
        </div>
      </td>
      <td><span className={`category-tag tag-${c.category.color}`}>{c.category.name}</span></td>
      <td>
        {lyr
          ? <span style={{ fontSize: 11, color: lyr.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>{lyr.icon} {lyr.label}</span>
          : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
        }
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: diffColor[c.difficulty?.slug] ?? 'var(--accent)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c.difficulty.name}</span>
        </div>
      </td>
      <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.points}</td>
      <td style={{ textAlign: 'center' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, margin: '0 auto' }}>→</div>
      </td>
    </tr>
  )
}

export default function ChallengeLibrary() {
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const [difficulty, setDifficulty] = useState('')
  const [activeLayer, setActiveLayer] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.listCategoriesPublic().then(setCategories).catch(() => {})
    api.listDifficultiesPublic().then(setDifficulties).catch(() => {})
  }, [])

  useEffect(() => {
    const params = {}
    if (category) params.category = category
    if (difficulty) params.difficulty = difficulty
    api.listChallenges(params).then(setChallenges).catch(() => {})
  }, [category, difficulty])

  const setCategory = slug => setSearchParams(slug ? { category: slug } : {})

  const visible = challenges.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.title.toLowerCase().includes(q) || (c.tags || '').toLowerCase().includes(q)
    const matchLayer = !activeLayer || c.lab_layer === activeLayer
    return matchSearch && matchLayer
  })

  return (
    <div className="page">
      <style>{ANIM}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp .4s ease both', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--accent)', fontWeight: 700 }}>Challenge Library</span>
          </div>
          <h1>All Challenges</h1>
          <p className="subtitle" style={{ margin: 0 }}>Browse and filter every challenge across all rooms and lab layers.</p>
        </div>
        <Link to="/roadmap">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px' }}>
            🗺️ View Roadmap
          </button>
        </Link>
      </div>

      {/* Layer quick-filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, animation: 'fadeUp .4s .04s ease both' }}>
        <button onClick={() => setActiveLayer('')}
          style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
            border: `1px solid ${!activeLayer ? 'rgba(0,194,230,0.5)' : 'var(--border)'}`,
            background: !activeLayer ? 'var(--accent-dim)' : 'var(--surface-2)',
            color: !activeLayer ? 'var(--accent)' : 'var(--text-muted)' }}>
          All Layers
        </button>
        {api.LAB_LAYERS.map(l => (
          <button key={l.slug} onClick={() => setActiveLayer(l.slug)}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              border: `1px solid ${activeLayer === l.slug ? l.color + '60' : 'var(--border)'}`,
              background: activeLayer === l.slug ? `${l.color}18` : 'var(--surface-2)',
              color: activeLayer === l.slug ? l.color : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5 }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="filter-tabs" style={{ animation: 'fadeUp .4s .06s ease both' }}>
        <button className={category === '' ? 'active' : ''} onClick={() => setCategory('')}>All</button>
        {categories.map(c => (
          <button key={c.id} className={category === c.slug ? 'active' : ''} onClick={() => setCategory(c.slug)}>{c.name}</button>
        ))}
      </div>

      {/* Search + difficulty */}
      <div className="filters" style={{ animation: 'fadeUp .4s .08s ease both' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: .4 }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search challenges…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All difficulties</option>
          {difficulties.map(d => <option key={d.id} value={d.slug}>{d.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
          {visible.length} result{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', backdropFilter: 'blur(12px)', animation: 'fadeUp .4s .1s ease both' }}>
        <table className="challenge-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Category</th>
              <th>Layer</th>
              <th>Difficulty</th>
              <th>XP</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c, idx) => <ChallengeRow key={c.id} c={c} idx={idx} />)}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 10, opacity: .3 }}>⚡</div>
                  No challenges match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
