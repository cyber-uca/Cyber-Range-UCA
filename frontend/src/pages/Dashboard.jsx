import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const catGlow = { coral: 'rgba(240,82,74,0.15)', blue: 'rgba(74,144,240,0.15)', teal: 'rgba(20,201,168,0.15)', purple: 'rgba(155,124,240,0.15)' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(() => {})
    api.listChallenges().then(setChallenges).catch(() => {})
    api.listCategoriesPublic().then(cats => setCategories(cats.map(c => ({ ...c, count: 0 })))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!challenges.length) return
    setCategories(prev => {
      const counts = {}
      challenges.forEach(c => { counts[c.category.id] = (counts[c.category.id] || 0) + 1 })
      return prev.map(c => ({ ...c, count: counts[c.id] || 0 }))
    })
  }, [challenges])

  const myRank = leaderboard.findIndex(e => e.name === user?.name) + 1

  return (
    <div className="page">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--accent)', fontWeight: 700 }}>Dashboard</span>
        </div>
        <h1>Welcome back, {user?.name.split(' ')[0]}</h1>
        <p className="subtitle">Ready to secure the future of automotive?</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ animation: 'fadeUp .4s .05s ease both' }}>
        <div className="stat-card">
          <div className="value">{user?.points ?? 0}</div>
          <div className="label">XP Points</div>
        </div>
        <div className="stat-card">
          <div className="value">{challenges.length}</div>
          <div className="label">Challenges available</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{ color: 'var(--combined)' }}>#{myRank || '—'}</div>
          <div className="label">Your rank</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{ color: 'var(--mitigation)' }}>{categories.length}</div>
          <div className="label">Categories</div>
        </div>
      </div>

      {/* Categories */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeUp .4s .1s ease both' }}>
        <h2 style={{ margin: 0 }}>Challenge categories</h2>
        <Link to="/challenges" style={{ fontSize: 12, color: 'var(--accent)' }}>View all →</Link>
      </div>
      <div className="category-card-grid" style={{ animation: 'fadeUp .4s .12s ease both' }}>
        {categories.map(c => (
          <div key={c.id} className={`category-hero-card cat-${c.color}`}
            onClick={() => navigate(`/challenges?category=${c.slug}`)}>
            <span className={`category-tag tag-${c.color}`}>{c.name}</span>
            <h3>{c.name}</h3>
            <p>{c.description || 'Explore challenges in this category.'}</p>
            <div className="count" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'inherit', marginRight: 4 }}>{c.count}</span>
              challenge{c.count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
        {categories.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No categories yet.</p>}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, animation: 'fadeUp .4s .15s ease both' }}>

        {/* Latest challenges */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Latest challenges</h2>
            <Link to="/challenges" style={{ fontSize: 12, color: 'var(--accent)' }}>See all →</Link>
          </div>
          {challenges.slice(0, 5).map(c => (
            <div key={c.id} className="challenge-row" onClick={() => navigate(`/challenges/${c.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`category-tag tag-${c.category.color}`}>{c.category.name}</span>
                <strong style={{ fontSize: 13 }}>{c.title}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.difficulty.name}</span>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>{c.points} XP</span>
              </div>
            </div>
          ))}
          {challenges.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No challenges published yet.</p>}
        </div>

        {/* Leaderboard */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Leaderboard</h2>
            <Link to="/leaderboard" style={{ fontSize: 12, color: 'var(--accent)' }}>Full →</Link>
          </div>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
            {leaderboard.slice(0, 8).map((entry, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none',
                background: entry.name === user?.name ? 'var(--accent-dim)' : 'transparent',
                transition: 'background .15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: i < 3 ? 'var(--accent)' : 'var(--text-dim)', width: 22, fontWeight: i < 3 ? 700 : 400 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: entry.name === user?.name ? 700 : 400 }}>{entry.name}</span>
                </div>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{entry.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No scores yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
