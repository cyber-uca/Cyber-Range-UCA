import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy: 'var(--teal)', medium: 'var(--amber)', hard: 'var(--red)' }

function parseDescription(text) {
  const lines = text.split('\n'), blocks = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i], t = raw.trim()
    if (/^Q\d+\.\s/.test(t)) {
      const num = t.match(/^(Q\d+)\./)[1], qtext = t.replace(/^Q\d+\.\s*/,'')
      const opts = []; i++
      while (i < lines.length) {
        const m = lines[i].trim().match(/^([A-D])\)\s+(.+)/)
        if (m) { opts.push({ l:m[1], t:m[2] }); i++ } else break
      }
      blocks.push({ type:'q', num, text:qtext, opts }); continue
    }
    if (/^Submit\s+(ANSWER_|FLAG\{)/i.test(t)) { blocks.push({ type:'submit', text:t }); i++; continue }
    if (/^\s+(Vehicle|OTA|Wazuh|Machine)/.test(raw) && raw.includes('—')) {
      const last = blocks[blocks.length-1]
      if (last?.type==='access') last.lines.push(t)
      else blocks.push({ type:'access', lines:[t] })
      i++; continue
    }
    if (/^\s+(update|battery|install|auth)\.log/.test(raw)) {
      const last = blocks[blocks.length-1]
      if (last?.type==='files') last.lines.push(t)
      else blocks.push({ type:'files', lines:[t] })
      i++; continue
    }
    if (/^\s+(sudo|python3|journalctl|nano|cat|ssh)\s/.test(raw)) {
      blocks.push({ type:'cmd', text:t }); i++; continue
    }
    if (t) {
      const last = blocks[blocks.length-1]
      if (last?.type==='prose') last.text += '\n'+t
      else blocks.push({ type:'prose', text:t })
    }
    i++
  }
  return blocks
}

function DescriptionBody({ text }) {
  const isMCQ = /^Q\d+\.\s/m.test(text) && /^[A-D]\)\s/m.test(text)
  if (!isMCQ) return <p style={{ color:'var(--text-muted)', lineHeight:1.8, margin:0 }}>{text}</p>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {parseDescription(text).map((b,i) => {
        if (b.type==='prose')  return <p key={i} style={{ color:'var(--text-muted)', lineHeight:1.8, margin:0 }}>{b.text}</p>
        if (b.type==='cmd')    return <div key={i} style={{ fontFamily:'var(--mono)', fontSize:12, background:'#04070C', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 14px', color:'#38BDF8' }}>{b.text}</div>
        if (b.type==='access') return (
          <div key={i} style={{ background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:'var(--r)', padding:'12px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--accent)', fontWeight:700, marginBottom:8 }}>Lab Access</div>
            {b.lines.map((l,j) => {
              const [name,...rest] = l.split('—').map(s=>s.trim())
              return <div key={j} style={{ display:'flex', gap:12, fontSize:12, padding:'4px 0', borderBottom:j<b.lines.length-1?'1px solid var(--border)':'none' }}>
                <span style={{ fontWeight:600, minWidth:120 }}>{name}</span>
                <span style={{ color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:11 }}>{rest.join(' — ')}</span>
              </div>
            })}
          </div>
        )
        if (b.type==='files') return (
          <div key={i} style={{ background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:'var(--r)', padding:'12px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--purple)', fontWeight:700, marginBottom:8 }}>Log Files</div>
            {b.lines.map((l,j) => {
              const [fname,...rest] = l.split('—').map(s=>s.trim())
              return <div key={j} style={{ display:'flex', gap:12, fontSize:12, padding:'5px 0', borderBottom:j<b.lines.length-1?'1px solid var(--border)':'none' }}>
                <span style={{ fontFamily:'var(--mono)', color:'var(--purple)', minWidth:100, fontSize:11 }}>{fname}</span>
                <span style={{ color:'var(--text-muted)' }}>{rest.join(' — ')}</span>
              </div>
            })}
          </div>
        )
        if (b.type==='q') return (
          <div key={i} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderLeft:'3px solid var(--accent)', borderRadius:'var(--r)', padding:'14px 16px' }}>
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, color:'var(--accent)', background:'var(--accent-dim)', padding:'2px 7px', borderRadius:4, flexShrink:0 }}>{b.num}</span>
              <span style={{ fontWeight:600, lineHeight:1.5 }}>{b.text}</span>
            </div>
            {b.opts.map(o => (
              <div key={o.l} style={{ display:'flex', gap:10, padding:'7px 10px', borderRadius:'var(--r-sm)', background:'var(--surface-3)', marginBottom:5, fontSize:13 }}>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'var(--text-dim)', minWidth:18 }}>{o.l}</span>
                <span style={{ color:'var(--text-muted)' }}>{o.t}</span>
              </div>
            ))}
          </div>
        )
        if (b.type==='submit') return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--green-dim)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:'var(--r)', padding:'11px 14px' }}>
            <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>{b.text}</span>
          </div>
        )
        return null
      })}
    </div>
  )
}

export default function ChallengeDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [challenge, setChallenge] = useState(null)
  const fromRoom = location.state?.room ?? null

  useEffect(() => { api.getChallenge(id).then(setChallenge).catch(() => {}) }, [id])

  if (!challenge) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  const lyr  = api.LAB_LAYERS.find(l => l.slug === challenge.lab_layer)
  const isMCQ = /^Q\d+\.\s/m.test(challenge.description) && /^[A-D]\)\s/m.test(challenge.description)

  return (
    <div className="page fade-up">
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13, color:'var(--text-muted)' }}>
        <Link to="/roadmap" style={{ color:'var(--text-muted)' }}>Roadmap</Link>
        {fromRoom && <><span style={{ opacity:.4 }}>›</span><Link to={`/rooms/${fromRoom.slug}`} style={{ color:'var(--text-muted)' }}>{fromRoom.title}</Link></>}
        <span style={{ opacity:.4 }}>›</span>
        <span style={{ color:'var(--text)' }}>{challenge.title}</span>
      </div>

      {/* Hero */}
      <div className="card" style={{ marginBottom:20, position:'relative' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              <span className={`badge badge-${challenge.category.slug}`}>{challenge.category.name}</span>
              {lyr && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{lyr.label}</span>}
              <span style={{ fontSize:12, color: DIFF_COLOR[challenge.difficulty?.slug] ?? 'var(--text-muted)', textTransform:'capitalize' }}>
                {challenge.difficulty.name}
              </span>
            </div>
            <h1 style={{ marginBottom:10, fontSize:22 }}>{challenge.title}</h1>
            <div style={{ display:'flex', gap:18, fontSize:13, color:'var(--text-muted)', flexWrap:'wrap' }}>
              <span>{challenge.time_limit_minutes} min</span>
              <span style={{ color:'var(--amber)', fontFamily:'var(--mono)', fontWeight:700 }}>{challenge.points} XP</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => navigate(`/challenges/${id}/workspace`)}
            style={{ padding:'12px 28px', fontSize:14, flexShrink:0 }}>
            Start Challenge
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display:'grid', gridTemplateColumns: isMCQ ? '1fr 260px' : '1fr 280px', gap:16 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <h3 style={{ marginBottom:16 }}>Description</h3>
            <DescriptionBody text={challenge.description} />
          </div>

          {challenge.objectives && (
            <div className="card">
              <h3 style={{ marginBottom:14 }}>What you'll learn</h3>
              {challenge.objectives.split(';').map((o,i) => (
                <div key={i} style={{ display:'flex', gap:10, marginBottom:8 }}>
                  <span style={{ color:'var(--accent)', marginTop:3, flexShrink:0, fontWeight:700 }}>–</span>
                  <span style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.65 }}>{o.trim()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <h3 style={{ marginBottom:14 }}>Environment</h3>
            {challenge.vms.length === 0
              ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>No VMs configured.</p>
              : challenge.vms.map((v,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0',
                  borderBottom: i < challenge.vms.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:30, height:30, borderRadius:'var(--r-sm)', background:'var(--accent-dim)',
                    border:'1px solid rgba(56,189,248,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:12 }}>VM</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{v.vm_template.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'var(--mono)' }}>{v.vm_template.zone}</div>
                  </div>
                </div>
              ))
            }
            <button className="btn-primary" onClick={() => navigate(`/challenges/${id}/workspace`)}
              style={{ width:'100%', marginTop:16, padding:'10px' }}>
              Launch Lab
            </button>
          </div>

          {challenge.tags && (
            <div className="card">
              <h3 style={{ marginBottom:12 }}>Tags</h3>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {challenge.tags.split(',').map(t => (
                  <span key={t} style={{ fontSize:11, padding:'3px 10px', borderRadius:999,
                    background:'var(--surface-2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isMCQ && (
            <div className="card" style={{ borderColor:'rgba(167,139,250,0.2)' }}>
              <h3 style={{ marginBottom:10, color:'var(--purple)' }}>How to submit</h3>
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.7, margin:'0 0 10px' }}>
                Investigate the lab machines, then submit your combined answer in the Workspace.
              </p>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--surface-3)',
                border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'7px 11px', color:'var(--purple)' }}>
                Example: ANSWER_B_C
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
