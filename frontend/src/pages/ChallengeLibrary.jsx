import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy: 'var(--teal)', medium: 'var(--amber)', hard: 'var(--red)' }
const layerMeta  = Object.fromEntries(api.LAB_LAYERS.map(l => [l.slug, l]))

export default function ChallengeLibrary() {
  const [challenges,  setChallenges]  = useState([])
  const [categories,  setCategories]  = useState([])
  const [difficulties,setDifficulties]= useState([])
  const [searchParams,setSearchParams]= useSearchParams()
  const category  = searchParams.get('category') || ''
  const [difficulty,  setDifficulty]  = useState('')
  const [activeLayer, setActiveLayer] = useState('')
  const [search,      setSearch]      = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.listCategoriesPublic().then(setCategories).catch(() => {})
    api.listDifficultiesPublic().then(setDifficulties).catch(() => {})
  }, [])

  useEffect(() => {
    const params = {}
    if (category)   params.category   = category
    if (difficulty) params.difficulty = difficulty
    api.listChallenges(params).then(setChallenges).catch(() => {})
  }, [category, difficulty])

  const setCategory = slug => setSearchParams(slug ? { category: slug } : {})

  const visible = challenges.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.title.toLowerCase().includes(q) || (c.tags || '').toLowerCase().includes(q)
    const matchLayer  = !activeLayer || c.lab_layer === activeLayer
    return matchSearch && matchLayer
  })

  return (
    <div className="page fade-up">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>All Challenges</h1>
          <p className="lead" style={{ marginTop: 6 }}>
            Browse and filter every challenge across all rooms and lab layers.
          </p>
        </div>
        <Link to="/roadmap">
          <button className="btn-secondary">Learning Roadmap →</button>
        </Link>
      </div>

      {/* Layer filter */}
      <div className="pill-bar">
        <span className={`pill${activeLayer === '' ? ' active' : ''}`} onClick={() => setActiveLayer('')}>All layers</span>
        {api.LAB_LAYERS.map(l => (
          <span key={l.slug} className={`pill${activeLayer === l.slug ? ' active' : ''}`}
            onClick={() => setActiveLayer(l.slug)}>
            {l.label}
          </span>
        ))}
      </div>

      {/* Category filter */}
      <div className="pill-bar">
        <span className={`pill${category === '' ? ' active' : ''}`} onClick={() => setCategory('')}>All categories</span>
        {categories.map(c => (
          <span key={c.id} className={`pill${category === c.slug ? ' active' : ''}`}
            onClick={() => setCategory(c.slug)}>
            {c.name}
          </span>
        ))}
      </div>

      {/* Search row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search by title or tag…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }} />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All difficulties</option>
          {difficulties.map(d => <option key={d.id} value={d.slug}>{d.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {visible.length} result{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Category</th>
              <th>Layer</th>
              <th>Difficulty</th>
              <th>XP</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(c => {
              const lyr = layerMeta[c.lab_layer]
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/challenges/${c.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    {c.tags && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{c.tags.split(',').slice(0,3).join(' · ')}</div>}
                  </td>
                  <td><span className={`badge badge-${c.category.slug}`}>{c.category.name}</span></td>
                  <td>
                    {lyr
                      ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lyr.label}</span>
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: DIFF_COLOR[c.difficulty?.slug] ?? 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {c.difficulty.name}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--amber)', fontSize: 13 }}>{c.points}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>›</td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
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
