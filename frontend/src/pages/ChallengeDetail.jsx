import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)' }
const CAT_COLOR  = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }

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

function DescBody({ text }) {
  const isMCQ = /^Q\d+\.\s/m.test(text) && /^[A-D]\)\s/m.test(text)
  if (!isMCQ) return <p style={{ lineHeight:1.85, fontSize:14 }}>{text}</p>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {parseDescription(text).map((b,i) => {
        if (b.type==='prose') return <p key={i} style={{ lineHeight:1.85, fontSize:14 }}>{b.text}</p>
        if (b.type==='cmd') return (
          <div key={i} style={{ fontFamily:'var(--mono)', fontSize:12, background:'#03080F',
            border:'1px solid var(--border-md)', borderRadius:'var(--r-sm)', padding:'10px 14px', color:'var(--cyan)' }}>
            {b.text}
          </div>
        )
        if (b.type==='access') return (
          <div key={i} style={{ background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:'var(--r-sm)', padding:'14px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--cyan)', fontWeight:700, marginBottom:10 }}>Lab Access</div>
            {b.lines.map((l,j) => {
              const [name,...rest] = l.split('—').map(s=>s.trim())
              return <div key={j} style={{ display:'flex', gap:14, fontSize:12, padding:'5px 0', borderBottom:j<b.lines.length-1?'1px solid var(--border)':'none' }}>
                <span style={{ fontWeight:600, minWidth:110, color:'var(--text-2)' }}>{name}</span>
                <span style={{ color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:11 }}>{rest.join(' — ')}</span>
              </div>
            })}
          </div>
        )
        if (b.type==='files') return (
          <div key={i} style={{ background:'rgba(167,139,250,0.04)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:'var(--r-sm)', padding:'14px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--violet)', fontWeight:700, marginBottom:10 }}>Log Files</div>
            {b.lines.map((l,j) => {
              const [fname,...rest] = l.split('—').map(s=>s.trim())
              return <div key={j} style={{ display:'flex', gap:14, fontSize:12, padding:'5px 0', borderBottom:j<b.lines.length-1?'1px solid var(--border)':'none' }}>
                <span style={{ fontFamily:'var(--mono)', color:'var(--violet)', minWidth:110, fontSize:11 }}>{fname}</span>
                <span style={{ color:'var(--text-3)' }}>{rest.join(' — ')}</span>
              </div>
            })}
          </div>
        )
        if (b.type==='q') return (
          <div key={i} style={{ background:'var(--surface-2)', borderLeft:'3px solid var(--cyan)', borderRadius:`0 var(--r-sm) var(--r-sm) 0`, padding:'16px 18px' }}>
            <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--cyan)', background:'var(--cyan-dim)', padding:'2px 7px', borderRadius:4, flexShrink:0 }}>{b.num}</span>
              <span style={{ fontWeight:600, lineHeight:1.5, color:'var(--text)' }}>{b.text}</span>
            </div>
            {b.opts.map(o => (
              <div key={o.l} style={{ display:'flex', gap:10, padding:'8px 11px', borderRadius:'var(--r-xs)', background:'var(--surface-3)', marginBottom:5 }}>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'var(--text-4)', minWidth:18 }}>{o.l}</span>
                <span style={{ fontSize:13, color:'var(--text-3)' }}>{o.t}</span>
              </div>
            ))}
          </div>
        )
        if (b.type==='submit') return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--green-dim)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'var(--r-sm)', padding:'12px 14px' }}>
            <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>{b.text}</span>
          </div>
        )
        return null
      })}
    </div>
  )
}

export default function ChallengeDetail() {
  const { id } = useParams()
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

  const lyr = api.LAB_LAYERS.find(l => l.slug === challenge.lab_layer)
  const isMCQ = /^Q\d+\.\s/m.test(challenge.description) && /^[A-D]\)\s/m.test(challenge.description)
  const cc = CAT_COLOR[challenge.category?.slug] ?? 'var(--cyan)'

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Full-bleed hero */}
      <div style={{
        marginLeft: -44, marginRight: -44, padding: '0 44px',
        background: `linear-gradient(180deg, ${cc}08 0%, transparent 100%)`,
        borderBottom: '1px solid var(--border)', marginBottom: 36,
      }}>
        {/* Breadcrumb */}
        <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:8, padding:'20px 0 0', fontSize:13, color:'var(--text-4)' }}>
          <Link to="/roadmap" style={{ color:'var(--text-4)' }}>Roadmap</Link>
          {fromRoom && <><span>›</span><Link to={`/rooms/${fromRoom.slug}`} style={{ color:'var(--text-4)' }}>{fromRoom.title}</Link></>}
          <span>›</span>
          <span style={{ color:'var(--text-3)' }}>{challenge.title}</span>
        </div>

        {/* Hero content */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:32, padding:'28px 0 36px', flexWrap:'wrap' }}>
          <div style={{ flex:1, maxWidth:680 }}>
            <div className="fade-up-1" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <span className={`badge badge-${challenge.category.slug}`}>{challenge.category.name}</span>
              {lyr && <span style={{ fontSize:12, color:'var(--text-4)' }}>{lyr.label}</span>}
              <span style={{ fontSize:12, color: DIFF_COLOR[challenge.difficulty?.slug] ?? 'var(--text-3)', fontWeight:600, textTransform:'capitalize' }}>
                {challenge.difficulty.name}
              </span>
            </div>
            <h1 className="fade-up-2" style={{ fontSize:34, marginBottom:14 }}>{challenge.title}</h1>
            <div className="fade-up-3" style={{ display:'flex', gap:20, fontSize:13, color:'var(--text-4)', flexWrap:'wrap' }}>
              <span>{challenge.time_limit_minutes} min</span>
              <span style={{ color:'var(--amber)', fontFamily:'var(--mono)', fontWeight:700, fontSize:16 }}>{challenge.points} XP</span>
            </div>
          </div>
          <div className="fade-up-2" style={{ flexShrink:0 }}>
            <button className="btn-primary"
              onClick={() => navigate(`/challenges/${id}/workspace`)}
              style={{ padding:'13px 32px', fontSize:15, borderRadius:'var(--r-lg)' }}>
              Start Challenge
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display:'grid', gridTemplateColumns: isMCQ ? '1fr 260px' : '1fr 280px', gap:24, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card fade-up">
            <h3 style={{ marginBottom:20, fontSize:14, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Mission Briefing</h3>
            <DescBody text={challenge.description} />
          </div>

          {challenge.objectives && (
            <div className="card fade-up-1">
              <h3 style={{ marginBottom:16, fontSize:14, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Objectives</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {challenge.objectives.split(';').map((o,i) => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border:'1px solid var(--cyan)', color:'var(--cyan)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>
                      {i+1}
                    </div>
                    <span style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.65 }}>{o.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card fade-up-1">
            <h3 style={{ marginBottom:16, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Environment</h3>
            {challenge.vms.length === 0
              ? <p style={{ fontSize:13, color:'var(--text-4)' }}>No VMs configured.</p>
              : challenge.vms.map((v,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0',
                  borderBottom:i<challenge.vms.length-1?'1px solid var(--border)':'none' }}>
                  <div style={{ width:28, height:28, borderRadius:'var(--r-sm)', background:'var(--cyan-dim)',
                    border:'1px solid rgba(34,211,238,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9,
                    fontFamily:'var(--mono)', fontWeight:700, color:'var(--cyan)', flexShrink:0 }}>VM</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-2)' }}>{v.vm_template.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)' }}>{v.vm_template.zone}</div>
                  </div>
                </div>
              ))
            }
            <button className="btn-primary" onClick={() => navigate(`/challenges/${id}/workspace`)}
              style={{ width:'100%', marginTop:16, padding:'10px', justifyContent:'center' }}>
              Launch Lab
            </button>
          </div>

          {challenge.tags && (
            <div className="card fade-up-2">
              <h3 style={{ marginBottom:12, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Tags</h3>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {challenge.tags.split(',').map(t => (
                  <span key={t} style={{ fontSize:11, padding:'3px 9px', borderRadius:999,
                    background:'var(--surface-3)', color:'var(--text-4)', border:'1px solid var(--border)' }}>
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isMCQ && (
            <div className="card fade-up-3" style={{ borderColor:'rgba(167,139,250,0.15)' }}>
              <h3 style={{ marginBottom:10, color:'var(--violet)', fontSize:13, fontWeight:600 }}>How to submit</h3>
              <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7, marginBottom:10 }}>
                Investigate the lab, then submit your combined answer.
              </p>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--surface-3)',
                border:'1px solid var(--border-md)', borderRadius:'var(--r-xs)', padding:'7px 11px', color:'var(--violet)' }}>
                ANSWER_B_C
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
