import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy: 'var(--green)', medium: 'var(--amber)', hard: 'var(--red)' }
const CAT_COLOR  = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }
const layerMeta  = Object.fromEntries(api.LAB_LAYERS.map(l => [l.slug, l]))

function ChallengeCard({ c, idx }) {
  const navigate = useNavigate()
  const cc = CAT_COLOR[c.category?.slug] ?? 'var(--cyan)'
  const dc = DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-4)'
  const lyr = layerMeta[c.lab_layer]

  return (
    <div
      className="clib-card"
      onClick={() => navigate(`/challenges/${c.id}`)}
      style={{ '--cc': cc, animationDelay: `${idx * .03}s` }}
    >
      <div className="clib-card-bar" />

      <div className="clib-card-top">
        <span className={`badge badge-${c.category?.slug}`}>{c.category?.name}</span>
        <span className="clib-pts">{c.points}</span>
      </div>

      <div className="clib-card-title">{c.title}</div>

      {c.tags && (
        <div className="clib-tags">
          {c.tags.split(',').slice(0, 3).map(t => (
            <span key={t} className="clib-tag">{t.trim()}</span>
          ))}
        </div>
      )}

      <div className="clib-card-footer">
        <div className="clib-card-meta">
          <span style={{ color: dc, fontWeight: 600 }}>{c.difficulty?.name}</span>
          {lyr && <>
            <span className="clib-dot">·</span>
            <span>{lyr.label}</span>
          </>}
        </div>
        <span className="clib-arrow">→</span>
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      className={`clib-pill${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function ChallengeLibrary() {
  const [challenges, setChallenges]     = useState([])
  const [categories, setCategories]     = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const category     = searchParams.get('category') || ''
  const [difficulty, setDifficulty]     = useState('')
  const [activeLayer, setActiveLayer]   = useState('')
  const [search, setSearch]             = useState('')

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
    return (!q || c.title.toLowerCase().includes(q) || (c.tags || '').toLowerCase().includes(q))
        && (!activeLayer || c.lab_layer === activeLayer)
  })

  return (
    <div className="page fade-up" style={{ paddingTop: 0 }}>

      {/* Page header */}
      <div className="clib-header">
        <div className="clib-header-bg" />
        <div className="clib-header-content">
          <div className="clib-eyebrow">Challenge Library</div>
          <h1 className="clib-title">All Challenges</h1>
          <p className="clib-subtitle">
            {challenges.length} challenges across {categories.length} categories.
          </p>
        </div>
        <Link to="/roadmap">
          <button className="btn-secondary">Learning Roadmap →</button>
        </Link>
      </div>

      {/* Filter section */}
      <div className="clib-filters">
        {/* Layer filter */}
        <div className="clib-filter-row">
          <FilterPill active={activeLayer === ''} onClick={() => setActiveLayer('')}>All Layers</FilterPill>
          {api.LAB_LAYERS.map(l => (
            <FilterPill key={l.slug} active={activeLayer === l.slug} onClick={() => setActiveLayer(l.slug)}>
              {l.label}
            </FilterPill>
          ))}
        </div>

        {/* Category filter */}
        <div className="clib-filter-row">
          <FilterPill active={category === ''} onClick={() => setCategory('')}>All Categories</FilterPill>
          {categories.map(c => (
            <FilterPill key={c.id} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.name}
            </FilterPill>
          ))}
        </div>

        {/* Search + difficulty + count */}
        <div className="clib-search-row">
          <div className="clib-search-wrap">
            <svg className="clib-search-icon" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="clib-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search challenges…"
            />
          </div>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="clib-select"
          >
            <option value="">All difficulties</option>
            {difficulties.map(d => <option key={d.id} value={d.slug}>{d.name}</option>)}
          </select>
          <span className="clib-count">{visible.length} results</span>
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="clib-empty">
          <div className="clib-empty-icon">∅</div>
          <p>No challenges match these filters.</p>
        </div>
      ) : (
        <div className="clib-grid">
          {visible.map((c, i) => <ChallengeCard key={c.id} c={c} idx={i} />)}
        </div>
      )}
    </div>
  )
}
