import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy: 'var(--green)', medium: 'var(--amber)', hard: 'var(--red)' }
const CAT_COLOR  = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }
const layerMeta  = Object.fromEntries(api.LAB_LAYERS.map(l => [l.slug, l]))

function ChallengeCard({ c, idx }) {
  const navigate = useNavigate()
  const cc = CAT_COLOR[c.category?.slug] ?? 'var(--cyan)'
  const lyr = layerMeta[c.lab_layer]

  return (
    <div className="card card-hover"
      onClick={() => navigate(`/challenges/${c.id}`)}
      style={{ padding: '20px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
        animation: `fadeUp .4s ${idx * .03}s cubic-bezier(.16,1,.3,1) both` }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${cc}80, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className={`badge badge-${c.category.slug}`}>{c.category.name}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{c.points}</span>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, lineHeight: 1.35 }}>{c.title}</div>

      {c.tags && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {c.tags.split(',').slice(0, 3).map(t => (
            <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999,
              background: 'var(--surface-3)', color: 'var(--text-4)', border: '1px solid var(--border)' }}>
              {t.trim()}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-4)', fontWeight: 600, textTransform: 'capitalize' }}>
            {c.difficulty.name}
          </span>
          {lyr && <>
            <span style={{ color: 'var(--text-4)', fontSize: 10 }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{lyr.label}</span>
          </>}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>→</span>
      </div>
    </div>
  )
}

export default function ChallengeLibrary() {
  const [challenges, setChallenges]  = useState([])
  const [categories, setCategories]  = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const [difficulty, setDifficulty]  = useState('')
  const [activeLayer, setActiveLayer]= useState('')
  const [search, setSearch]          = useState('')

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
    return (!q || c.title.toLowerCase().includes(q) || (c.tags||'').toLowerCase().includes(q))
        && (!activeLayer || c.lab_layer === activeLayer)
  })

  return (
    <div className="page fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--mono)', marginBottom: 8 }}>
            Challenge Library
          </p>
          <h1 style={{ fontSize: 28 }}>All Challenges</h1>
        </div>
        <Link to="/roadmap">
          <button className="btn-secondary">Learning Roadmap →</button>
        </Link>
      </div>

      {/* Filters */}
      <div className="pill-bar">
        <span className={`pill${activeLayer===''?' active':''}`} onClick={() => setActiveLayer('')}>All Layers</span>
        {api.LAB_LAYERS.map(l => (
          <span key={l.slug} className={`pill${activeLayer===l.slug?' active':''}`} onClick={() => setActiveLayer(l.slug)}>
            {l.label}
          </span>
        ))}
      </div>
      <div className="pill-bar">
        <span className={`pill${category===''?' active':''}`} onClick={() => setCategory('')}>All Categories</span>
        {categories.map(c => (
          <span key={c.id} className={`pill${category===c.slug?' active':''}`} onClick={() => setCategory(c.slug)}>
            {c.name}
          </span>
        ))}
      </div>

      {/* Search + count */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: 280 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search challenges…"
            style={{ paddingLeft: 36 }} />
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: .4 }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All difficulties</option>
          {difficulties.map(d => <option key={d.id} value={d.slug}>{d.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
          {visible.length} results
        </span>
      </div>

      {/* Card grid — editorial */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-4)' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>∅</div>
          <p style={{ color: 'var(--text-4)' }}>No challenges match these filters.</p>
        </div>
      ) : (
        <div style={{ columns: '280px 3', gap: 14 }}>
          {visible.map((c, i) => (
            <div key={c.id} style={{ breakInside: 'avoid', marginBottom: 14 }}>
              <ChallengeCard c={c} idx={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
