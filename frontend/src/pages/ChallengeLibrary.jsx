import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'

export default function ChallengeLibrary() {
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const [difficulty, setDifficulty] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.listCategoriesPublic().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    const params = {}
    if (category) params.category = category
    if (difficulty) params.difficulty = difficulty
    api.listChallenges(params).then(setChallenges).catch(() => {})
  }, [category, difficulty])

  const setCategory = (slug) => setSearchParams(slug ? { category: slug } : {})

  const visible = challenges.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <h1>Challenges</h1>
      <p className="subtitle">Explore our hands-on challenges across offensive, defensive, and mitigation categories.</p>

      <div className="filter-tabs">
        <button className={category === '' ? 'active' : ''} onClick={() => setCategory('')}>All</button>
        {categories.map((c) => (
          <button key={c.id} className={category === c.slug ? 'active' : ''} onClick={() => setCategory(c.slug)}>{c.name}</button>
        ))}
      </div>

      <div className="filters">
        <input placeholder="Search challenges…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <table className="challenge-table">
        <thead>
          <tr><th>Challenge</th><th>Category</th><th>Difficulty</th><th>XP</th><th></th></tr>
        </thead>
        <tbody>
          {visible.map((c) => (
            <tr key={c.id} onClick={() => navigate(`/challenges/${c.id}`)}>
              <td className="challenge-title-cell">
                <div className="title">{c.title}</div>
                <div className="desc">{c.tags}</div>
              </td>
              <td><span className={`category-tag tag-${c.category.color}`}>{c.category.name}</span></td>
              <td style={{ color: 'var(--text-muted)' }}>{c.difficulty.name}</td>
              <td className="mono" style={{ color: 'var(--accent)' }}>{c.points} XP</td>
              <td><button className="btn-primary" style={{ padding: '5px 10px' }}>→</button></td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr><td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No challenges match these filters yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
