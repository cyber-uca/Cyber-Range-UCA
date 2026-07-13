import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 14px rgba(0,194,230,.25)}50%{box-shadow:0 0 28px rgba(0,194,230,.55)}}`

const diffColor = { easy: 'var(--mitigation)', medium: 'var(--warning)', hard: 'var(--offensive)' }

/* ─── MCQ parser ─────────────────────────────────────────────────────────
   Detects lines like:
     "Q1. Question text"            → question header
     "  A) Option text"             → answer option
     "Submit ANSWER_X …"            → submit instruction
   Everything else is a prose paragraph.
──────────────────────────────────────────────────────────────────────── */
function parseDescription(text) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Question header: "Q1. ..." or "Q12. ..."
    if (/^Q\d+\.\s/.test(trimmed)) {
      const qNum = trimmed.match(/^(Q\d+)\./)[1]
      const qText = trimmed.replace(/^Q\d+\.\s*/, '')
      const options = []

      i++
      while (i < lines.length) {
        const optLine = lines[i].trim()
        const optMatch = optLine.match(/^([A-D])\)\s+(.+)/)
        if (optMatch) {
          options.push({ letter: optMatch[1], text: optMatch[2] })
          i++
        } else {
          break
        }
      }

      blocks.push({ type: 'question', num: qNum, text: qText, options })
      continue
    }

    // Submit instruction
    if (/^Submit\s+ANSWER_/i.test(trimmed) || /^Submit\s+FLAG\{/i.test(trimmed)) {
      blocks.push({ type: 'submit', text: trimmed })
      i++
      continue
    }

    // Machine access table lines (indented with spaces + em dash)
    if (/^\s+(Vehicle|OTA|Wazuh|Machine)/.test(line) && line.includes('—')) {
      // collect consecutive access lines
      if (blocks.length && blocks[blocks.length - 1].type === 'access') {
        blocks[blocks.length - 1].lines.push(trimmed)
      } else {
        blocks.push({ type: 'access', lines: [trimmed] })
      }
      i++
      continue
    }

    // File table lines
    if (/^\s+(update|battery|install|auth)\.log/.test(line)) {
      if (blocks.length && blocks[blocks.length - 1].type === 'files') {
        blocks[blocks.length - 1].lines.push(trimmed)
      } else {
        blocks.push({ type: 'files', lines: [trimmed] })
      }
      i++
      continue
    }

    // Command lines (indented, start with sudo/python3/journalctl/nano)
    if (/^\s+(sudo|python3|journalctl|nano|cat|ssh)\s/.test(line)) {
      blocks.push({ type: 'command', text: trimmed })
      i++
      continue
    }

    // Non-empty prose
    if (trimmed.length > 0) {
      if (blocks.length && blocks[blocks.length - 1].type === 'prose') {
        blocks[blocks.length - 1].text += '\n' + trimmed
      } else {
        blocks.push({ type: 'prose', text: trimmed })
      }
    }

    i++
  }

  return blocks
}

function isMCQDescription(text) {
  return /Q\d+\.\s/.test(text) && /[A-D]\)\s/.test(text)
}

/* ─── MCQ renderer ─────────────────────────────────────────────────────── */
function MCQDescription({ text }) {
  const blocks = parseDescription(text)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {blocks.map((block, idx) => {
        if (block.type === 'prose') return (
          <p key={idx} style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.85, margin: 0 }}>
            {block.text}
          </p>
        )

        if (block.type === 'command') return (
          <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
            background: '#04070C', border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 14px', color: '#00C2E6' }}>
            {block.text}
          </div>
        )

        if (block.type === 'access') return (
          <div key={idx} style={{ background: 'rgba(0,194,230,0.05)', border: '1px solid rgba(0,194,230,0.2)',
            borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em',
              color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>Lab Access</div>
            {block.lines.map((l, i) => {
              const parts = l.split('—').map(s => s.trim())
              return (
                <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '4px 0',
                  borderBottom: i < block.lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600, minWidth: 120 }}>{parts[0]}</span>
                  {parts[1] && <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{parts[1]}</span>}
                </div>
              )
            })}
          </div>
        )

        if (block.type === 'files') return (
          <div key={idx} style={{ background: 'rgba(155,124,240,0.05)', border: '1px solid rgba(155,124,240,0.2)',
            borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em',
              color: 'var(--combined)', fontWeight: 700, marginBottom: 8 }}>Log Files</div>
            {block.lines.map((l, i) => {
              const parts = l.split('—').map(s => s.trim())
              return (
                <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '5px 0',
                  borderBottom: i < block.lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--combined)', minWidth: 110, fontSize: 11 }}>{parts[0]}</span>
                  {parts[1] && <span style={{ color: 'var(--text-muted)' }}>{parts[1]}</span>}
                </div>
              )
            })}
          </div>
        )

        if (block.type === 'question') return (
          <div key={idx} style={{ background: 'rgba(13,24,38,0.6)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
                color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 8px',
                borderRadius: 6, flexShrink: 0 }}>{block.num}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{block.text}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {block.options.map(opt => (
                <div key={opt.letter} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 12px', borderRadius: 8, background: 'rgba(7,13,22,0.5)',
                  border: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
                    color: 'var(--text-muted)', minWidth: 20 }}>{opt.letter}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{opt.text}</span>
                </div>
              ))}
            </div>
          </div>
        )

        if (block.type === 'submit') return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(20,201,168,0.08)', border: '1px solid rgba(20,201,168,0.25)',
            borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 16 }}>🏁</span>
            <span style={{ fontSize: 13, color: 'var(--mitigation)', fontWeight: 600 }}>{block.text}</span>
          </div>
        )

        return null
      })}
    </div>
  )
}

/* ─── main page ──────────────────────────────────────────────────────────── */
export default function ChallengeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [challenge, setChallenge] = useState(null)
  const fromRoom = location.state?.room ?? null

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

  const lyr = api.LAB_LAYERS.find(l => l.slug === challenge.lab_layer)
  const isMCQ = isMCQDescription(challenge.description)

  return (
    <div className="page">
      <style>{ANIM}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12,
        color: 'var(--text-muted)', animation: 'fadeUp .3s ease both', flexWrap: 'wrap' }}>
        <Link to="/roadmap" style={{ color: 'var(--text-muted)' }}>Roadmap</Link>
        {fromRoom && <>
          <span style={{ opacity: .4 }}>›</span>
          <Link to={`/rooms/${fromRoom.slug}`} style={{ color: 'var(--text-muted)' }}>{fromRoom.title}</Link>
        </>}
        <span style={{ opacity: .4 }}>›</span>
        <span style={{ color: 'var(--text)' }}>{challenge.title}</span>
      </div>

      {/* Hero */}
      <div style={{
        background: 'rgba(13,24,38,0.78)', border: '1px solid var(--border)', borderRadius: 20,
        padding: '30px 36px', marginBottom: 20, backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 36px rgba(0,0,0,0.35)', animation: 'fadeUp .4s .05s ease both',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-25%', right: '-8%', width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,194,230,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span className={`category-tag tag-${challenge.category.color}`}>{challenge.category.name}</span>
              {lyr && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 700,
                  background: `${lyr.color}18`, color: lyr.color, border: `1px solid ${lyr.color}40`,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  {lyr.icon} {lyr.label}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: diffColor[challenge.difficulty?.slug] ?? 'var(--accent)' }} />
                <span style={{ fontSize: 11, color: diffColor[challenge.difficulty?.slug] ?? 'var(--accent)', fontWeight: 600, textTransform: 'capitalize' }}>
                  {challenge.difficulty.name}
                </span>
              </div>
            </div>
            <h1 style={{ marginBottom: 10 }}>{challenge.title}</h1>
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {challenge.time_limit_minutes} min
              </span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15 }}>
                {challenge.points} XP
              </span>
            </div>
          </div>
          <button className="btn-primary"
            onClick={() => navigate(`/challenges/${id}/workspace`)}
            style={{ padding: '13px 30px', fontSize: 14, borderRadius: 12,
              animation: 'glowPulse 3s ease-in-out infinite', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
            Start Challenge →
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMCQ ? '1fr 260px' : '1fr 280px', gap: 16, animation: 'fadeUp .4s .1s ease both' }}>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '22px 24px', backdropFilter: 'blur(12px)' }}>
            {isMCQ
              ? <MCQDescription text={challenge.description} />
              : <p style={{ color: 'var(--text-muted)', lineHeight: 1.85, margin: 0 }}>{challenge.description}</p>
            }
          </div>

          {challenge.objectives && (
            <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '22px 24px', backdropFilter: 'blur(12px)' }}>
              <h2>What you'll learn</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {challenge.objectives.split(';').map((obj, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                      marginTop: 6, flexShrink: 0, boxShadow: '0 0 4px var(--accent)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{obj.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Environment */}
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '20px', backdropFilter: 'blur(12px)' }}>
            <h2 style={{ marginBottom: 14 }}>Environment</h2>
            {challenge.vms.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>No VMs configured.</p>
              : challenge.vms.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                  borderBottom: i < challenge.vms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)',
                    border: '1px solid rgba(0,194,230,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{v.vm_template.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v.vm_template.zone}</div>
                  </div>
                </div>
              ))
            }
            <button className="btn-primary"
              onClick={() => navigate(`/challenges/${id}/workspace`)}
              style={{ width: '100%', marginTop: 16, padding: '11px', fontSize: 13 }}>
              Launch Lab →
            </button>
          </div>

          {/* Tags */}
          {challenge.tags && (
            <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(12px)' }}>
              <h2 style={{ marginBottom: 12 }}>Tags</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {challenge.tags.split(',').map(t => (
                  <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999,
                    background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* MCQ answer guide */}
          {isMCQ && (
            <div style={{ background: 'rgba(155,124,240,0.07)', border: '1px solid rgba(155,124,240,0.25)',
              borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(12px)' }}>
              <h2 style={{ marginBottom: 10, color: 'var(--combined)' }}>How to submit</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 10px' }}>
                Read the task description, investigate the lab machines, then submit your combined answer in the Workspace flag box.
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: '#04070C',
                border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--combined)' }}>
                Example: ANSWER_B_C
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
