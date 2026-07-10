import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

export default function ChallengeDetail() {
  const { id } = useParams()
  const [challenge, setChallenge] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { api.getChallenge(id).then(setChallenge).catch(() => {}) }, [id])

  if (!challenge) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading challenge…</span>
      </div>
    </div>
  )

  return (
    <div className="page">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)', animation: 'fadeUp .3s ease both' }}>
        <Link to="/challenges" style={{ color: 'var(--text-muted)' }}>Challenges</Link>
        <span style={{ opacity: .4 }}>›</span>
        <span style={{ color: 'var(--text)' }}>{challenge.title}</span>
      </div>

      {/* Hero card */}
      <div style={{
        background: 'rgba(13,24,38,0.75)', border: '1px solid var(--border)', borderRadius: 18,
        padding: '32px 36px', marginBottom: 20, backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeUp .4s .05s ease both',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* background glow */}
        <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,194,230,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span className={`category-tag tag-${challenge.category.color}`}>{challenge.category.name}</span>
            <h1 style={{ marginTop: 12, marginBottom: 8 }}>{challenge.title}</h1>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {challenge.time_limit_minutes} min
              </span>
              <span style={{ color: 'var(--text-dim)' }}>·</span>
              <span>{challenge.difficulty.name}</span>
              <span style={{ color: 'var(--text-dim)' }}>·</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{challenge.points} XP</span>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/challenges/${id}/workspace`)}
            style={{ padding: '12px 28px', fontSize: 14, borderRadius: 10, animation: 'glowPulse 3s ease-in-out infinite', whiteSpace: 'nowrap' }}>
            <style>{`@keyframes glowPulse{0%,100%{box-shadow:0 0 14px rgba(0,194,230,.25)}50%{box-shadow:0 0 28px rgba(0,194,230,.55)}}`}</style>
            Start Challenge →
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, animation: 'fadeUp .4s .1s ease both' }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', backdropFilter: 'blur(12px)' }}>
            <h2>Description</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, margin: 0 }}>{challenge.description}</p>
          </div>

          {challenge.objectives && (
            <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', backdropFilter: 'blur(12px)' }}>
              <h2>What you'll learn</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, margin: 0 }}>{challenge.objectives}</p>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', backdropFilter: 'blur(12px)' }}>
            <h2 style={{ marginBottom: 16 }}>Environment</h2>
            {challenge.vms.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>No VMs configured.</p>
              : challenge.vms.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < challenge.vms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(0,194,230,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{v.vm_template.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v.vm_template.zone}</div>
                  </div>
                </div>
              ))
            }
            <button
              className="btn-primary"
              onClick={() => navigate(`/challenges/${id}/workspace`)}
              style={{ width: '100%', marginTop: 16, padding: '11px', fontSize: 13 }}>
              Launch Lab →
            </button>
          </div>

          {challenge.tags && (
            <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(12px)' }}>
              <h2 style={{ marginBottom: 12 }}>Tags</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {challenge.tags.split(',').map(t => (
                  <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{t.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
