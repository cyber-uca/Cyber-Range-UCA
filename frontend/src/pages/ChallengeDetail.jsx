import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function ChallengeDetail() {
  const { id } = useParams()
  const [challenge, setChallenge] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getChallenge(id).then(setChallenge).catch(() => {})
  }, [id])

  if (!challenge) return <div className="page">Loading…</div>

  return (
    <div className="page">
      <span className={`category-tag tag-${challenge.category.color}`}>{challenge.category.name}</span>
      <h1>{challenge.title}</h1>
      <p className="subtitle">{challenge.difficulty.name} · {challenge.time_limit_minutes} min · {challenge.points} XP</p>

      <div style={{ maxWidth: 700 }}>
        <h2>Description</h2>
        <p>{challenge.description}</p>

        {challenge.objectives && (
          <>
            <h2>What you'll learn</h2>
            <p>{challenge.objectives}</p>
          </>
        )}

        <h2>Environment</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          This challenge provisions {challenge.vms.length} VM{challenge.vms.length !== 1 ? 's' : ''}:{' '}
          {challenge.vms.map((v) => v.vm_template.name).join(', ')}
        </p>

        <button className="btn-primary" onClick={() => navigate(`/challenges/${id}/workspace`)}>
          Start Challenge →
        </button>
      </div>
    </div>
  )
}
