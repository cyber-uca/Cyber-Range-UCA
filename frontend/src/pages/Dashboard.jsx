import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(() => {})
    api.listChallenges().then(setChallenges).catch(() => {})
    api.listCategoriesPublic().then((cats) => setCategories(cats.map((c) => ({ ...c, count: 0 })))).catch(() => {})
  }, [])

  useEffect(() => {
    if (challenges.length === 0) return
    setCategories((prev) => {
      const counts = {}
      challenges.forEach((c) => { counts[c.category.id] = (counts[c.category.id] || 0) + 1 })
      return prev.map((c) => ({ ...c, count: counts[c.id] || 0 }))
    })
  }, [challenges])

  return (
    <div className="page">
      <h1>Welcome back, {user?.name.split(' ')[0]} 👋</h1>
      <p className="subtitle">Ready to secure the future of automotive?</p>

      <div className="stat-grid">
        <div className="stat-card"><div className="value">{user?.points ?? 0}</div><div className="label">Points</div></div>
        <div className="stat-card"><div className="value">{challenges.length}</div><div className="label">Challenges available</div></div>
        <div className="stat-card"><div className="value">#{leaderboard.findIndex((e) => e.name === user?.name) + 1 || '—'}</div><div className="label">Your rank</div></div>
        <div className="stat-card"><div className="value">{categories.length}</div><div className="label">Categories</div></div>
      </div>

      <h2>Challenge categories</h2>
      <div className="category-card-grid">
        {categories.map((c) => (
          <div key={c.id} className={`category-hero-card cat-${c.color}`} onClick={() => navigate(`/challenges?category=${c.slug}`)} style={{ cursor: 'pointer' }}>
            <span className={`category-tag tag-${c.color}`}>{c.name}</span>
            <h3>{c.name}</h3>
            <p>{c.description}</p>
            <div className="count">{c.count} challenge{c.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
        {categories.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No categories yet.</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div>
          <h2>Latest challenges</h2>
          {challenges.slice(0, 5).map((c) => (
            <div key={c.id} className="challenge-row" onClick={() => navigate(`/challenges/${c.id}`)} style={{ cursor: 'pointer' }}>
              <div>
                <span className={`category-tag tag-${c.category.color}`} style={{ marginRight: 10 }}>{c.category.name}</span>
                <strong>{c.title}</strong>
              </div>
              <span className="mono" style={{ color: 'var(--accent)' }}>{c.points} pts</span>
            </div>
          ))}
          <Link to="/challenges" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 6 }}>
            View all challenges →
          </Link>
        </div>
        <div>
          <h2>Leaderboard</h2>
          <ul className="leaderboard-list">
            {leaderboard.slice(0, 8).map((entry, i) => (
              <li key={i}>
                <span><span className="rank">#{i + 1}</span>{entry.name} {entry.institution && `(${entry.institution})`}</span>
                <span className="mono" style={{ color: 'var(--accent)' }}>{entry.points}</span>
              </li>
            ))}
            {leaderboard.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No scores yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
