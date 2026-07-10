import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'

export default function ChallengeLibrary() {
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const [difficulty, setDifficulty] = useState('')
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
  const visible = challenges.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--accent)', fontWeight: 700 }}>Challenge Library</span>
        </div>
        <h1>Challenges</h1>
        <p className="subtitle">Explore hands-on labs across offensive, defensive, and mitigation tracks.</p>
      </div>

      {/* Category filter pills */}
      <div className="filter-tabs" style={{ animation: 'fadeUp .4s .05s ease both' }}>
        <button className={category === '' ? 'active' : ''} onClick={() => setCategory('')}>All</button>
        {categories.map(c => (
          <button key={c.id} className={category === c.slug ? 'active' : ''} onClick={() => setCategory(c.slug)}>{c.name}</button>
        ))}
      </div>

      {/* Search + difficulty */}
      <div className="filters" style={{ animation: 'fadeUp .4s .08s ease both' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: .4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search challenges…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, minWidth: 240 }} />
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
      <div style={{
        background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', backdropFilter: 'blur(12px)', animation: 'fadeUp .4s .1s ease both',
      }}>
        <table className="challenge-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>XP</th>
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.id} onClick={() => navigate(`/challenges/${c.id}`)}>
                <td className="challenge-title-cell">
                  <div className="title">{c.title}</div>
                  {c.tags && <div className="desc">{c.tags}</div>}
                </td>
                <td><span className={`category-tag tag-${c.category.color}`}>{c.category.name}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{c.difficulty.name}</td>
                <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.points}</td>
                <td>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>→</div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 24, marginBottom: 8, opacity: .3 }}>⚡</div>
                  No challenges match these filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
