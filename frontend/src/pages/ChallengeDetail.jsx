import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { api } from '../api.js'

const DIFF_COLOR = { easy:'var(--green)', medium:'var(--amber)', hard:'var(--red)' }
const CAT_COLOR  = { offensive:'var(--cat-offensive)', defensive:'var(--cat-defensive)', mitigation:'var(--cat-mitigation)', risk:'var(--cat-risk)' }

/* ── countdown ─────────────────────────────────────────────── */
function useCountdown(expiresAt) {
  const calc = () => expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)) : null
  const [secs, setSecs] = useState(calc)
  useEffect(() => {
    if (!expiresAt) return
    setSecs(calc())
    const id = setInterval(() => setSecs(calc()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return secs
}
function fmt(s) {
  if (s === null) return null
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

/* ── VM card ───────────────────────────────────────────────── */
function VMCard({ vmTemplate, envVm, env, onStart, onStop, starting, stopping }) {
  const running = envVm?.status === 'running'
  const ip = envVm?.ip_address
  const secsLeft = useCountdown(running && env?.expires_at_iso ? env.expires_at_iso : null)
  const urgent = secsLeft !== null && secsLeft < 300
  const warn   = secsLeft !== null && secsLeft < 900
  const [consoleUrl, setConsoleUrl] = useState(null)
  const [loadingConsole, setLoadingConsole] = useState(false)

  const openConsole = async () => {
    if (consoleUrl) { window.open(consoleUrl, '_blank'); return }
    if (!envVm?.id) return
    setLoadingConsole(true)
    try {
      const data = await api.getConsoleUrl(envVm.environment_id, envVm.id)
      setConsoleUrl(data.console_url)
      window.open(data.console_url, '_blank')
    } catch {
      if (envVm.proxmox_vmid && envVm.proxmox_node) {
        const url = `https://192.168.37.20:8006/?console=kvm&novnc=1&vmid=${envVm.proxmox_vmid}&node=${envVm.proxmox_node}&lang=en`
        setConsoleUrl(url); window.open(url, '_blank')
      }
    } finally { setLoadingConsole(false) }
  }

  return (
    <div style={{
      background: running ? 'rgba(52,211,153,0.06)' : 'var(--surface-2)',
      border: `1px solid ${running ? (urgent ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.3)') : 'var(--border-md)'}`,
      borderRadius: 'var(--r)', padding: '14px 16px', transition: 'all .2s',
      marginBottom: 10,
    }}>
      {/* Name + status */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'var(--r-sm)', flexShrink:0,
            background: running ? 'rgba(52,211,153,0.12)' : 'var(--cyan-dim)',
            border: `1px solid ${running ? 'rgba(52,211,153,0.3)' : 'rgba(34,211,238,0.2)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--mono)', fontWeight:700, fontSize:9, color: running ? 'var(--green)' : 'var(--cyan)' }}>
            VM
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)' }}>{vmTemplate.name}</div>
            <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)', marginTop:1 }}>
              {vmTemplate.zone}
              {running && ip && <span style={{ color:'var(--green)', marginLeft:8 }}>· {ip}</span>}
            </div>
          </div>
        </div>
        {running ? (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)',
              boxShadow:'0 0 6px var(--green)', animation:'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize:11, color:'var(--green)', fontWeight:700 }}>RUNNING</span>
          </div>
        ) : (
          <button onClick={onStart} disabled={starting}
            style={{ padding:'6px 14px', borderRadius:'var(--r-sm)', fontSize:12, fontWeight:700,
              cursor: starting ? 'wait' : 'pointer',
              background: starting ? 'var(--surface-3)' : 'var(--cyan)',
              color: starting ? 'var(--text-4)' : 'var(--on-cyan)',
              border:'none', display:'flex', alignItems:'center', gap:6,
              boxShadow: starting ? 'none' : 'var(--glow-sm)' }}>
            {starting
              ? <><div style={{ width:10, height:10, border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} /> Starting…</>
              : `▶ Start ${vmTemplate.name}`
            }
          </button>
        )}
      </div>

      {/* Running controls */}
      {running && (
        <div style={{ marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          {secsLeft !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:6,
              background: urgent ? 'rgba(248,113,113,0.08)' : warn ? 'rgba(251,191,36,0.08)' : 'var(--surface-3)',
              border: `1px solid ${urgent ? 'rgba(248,113,113,0.25)' : warn ? 'rgba(251,191,36,0.25)' : 'var(--border)'}`,
              borderRadius:'var(--r-sm)', padding:'5px 10px' }}>
              <span style={{ fontSize:13, fontFamily:'var(--mono)', fontWeight:700,
                color: urgent ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--text-3)' }}>
                {fmt(secsLeft)}
              </span>
              <span style={{ fontSize:10, color:'var(--text-4)' }}>remaining</span>
            </div>
          )}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={openConsole} disabled={loadingConsole}
              style={{ padding:'5px 12px', borderRadius:'var(--r-sm)', fontSize:11, fontWeight:600, cursor:'pointer',
                background:'var(--cyan-dim)', color:'var(--cyan)',
                border:'1px solid rgba(34,211,238,0.3)', display:'flex', alignItems:'center', gap:5 }}>
              {loadingConsole ? 'Opening…' : '🖥 Console'}
            </button>
            <button onClick={onStop} disabled={stopping}
              style={{ padding:'5px 12px', borderRadius:'var(--r-sm)', fontSize:11, fontWeight:600,
                cursor: stopping ? 'wait' : 'pointer',
                background: stopping ? 'var(--surface-3)' : 'var(--red-dim)',
                color: stopping ? 'var(--text-4)' : 'var(--red)',
                border: `1px solid ${stopping ? 'var(--border)' : 'rgba(248,113,113,0.3)'}`,
                display:'flex', alignItems:'center', gap:5 }}>
              {stopping ? 'Stopping…' : '⏹ Stop'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── MCQ parser + renderer ─────────────────────────────────── */
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
  if (!isMCQ) return <p style={{ lineHeight:1.85, fontSize:14, color:'var(--text-3)' }}>{text}</p>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {parseDescription(text).map((b,i) => {
        if (b.type==='prose') return <p key={i} style={{ lineHeight:1.85, fontSize:14, color:'var(--text-3)' }}>{b.text}</p>
        if (b.type==='cmd')   return <div key={i} style={{ fontFamily:'var(--mono)', fontSize:12, background:'#03080F', border:'1px solid var(--border-md)', borderRadius:'var(--r-sm)', padding:'10px 14px', color:'var(--cyan)' }}>{b.text}</div>
        if (b.type==='access') return (
          <div key={i} style={{ background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:'var(--r-sm)', padding:'14px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--cyan)', fontWeight:700, marginBottom:10 }}>Lab Access</div>
            {b.lines.map((l,j) => { const [name,...rest]=l.split('—').map(s=>s.trim()); return <div key={j} style={{ display:'flex', gap:14, fontSize:12, padding:'5px 0', borderBottom:j<b.lines.length-1?'1px solid var(--border)':'none' }}><span style={{ fontWeight:600, minWidth:110, color:'var(--text-2)' }}>{name}</span><span style={{ color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:11 }}>{rest.join(' — ')}</span></div> })}
          </div>
        )
        if (b.type==='files') return (
          <div key={i} style={{ background:'rgba(167,139,250,0.04)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:'var(--r-sm)', padding:'14px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--violet)', fontWeight:700, marginBottom:10 }}>Log Files</div>
            {b.lines.map((l,j) => { const [fname,...rest]=l.split('—').map(s=>s.trim()); return <div key={j} style={{ display:'flex', gap:14, fontSize:12, padding:'5px 0', borderBottom:j<b.lines.length-1?'1px solid var(--border)':'none' }}><span style={{ fontFamily:'var(--mono)', color:'var(--violet)', minWidth:110, fontSize:11 }}>{fname}</span><span style={{ color:'var(--text-3)' }}>{rest.join(' — ')}</span></div> })}
          </div>
        )
        if (b.type==='q') return (
          <div key={i} style={{ background:'var(--surface-2)', borderLeft:'3px solid var(--cyan)', borderRadius:`0 var(--r-sm) var(--r-sm) 0`, padding:'16px 18px' }}>
            <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--cyan)', background:'var(--cyan-dim)', padding:'2px 7px', borderRadius:4, flexShrink:0 }}>{b.num}</span>
              <span style={{ fontWeight:600, lineHeight:1.5, color:'var(--text)' }}>{b.text}</span>
            </div>
            {b.opts.map(o => <div key={o.l} style={{ display:'flex', gap:10, padding:'8px 11px', borderRadius:'var(--r-xs)', background:'var(--surface-3)', marginBottom:5 }}><span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'var(--text-4)', minWidth:18 }}>{o.l}</span><span style={{ fontSize:13, color:'var(--text-3)' }}>{o.t}</span></div>)}
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

/* ── main page ─────────────────────────────────────────────── */
export default function ChallengeDetail() {
  const { id }   = useParams()
  const location = useLocation()
  const [challenge, setChallenge] = useState(null)
  const [vmState, setVmState]     = useState({})   // { [vmTemplateId]: { env, envVm, starting, stopping } }
  const [flagValue, setFlagValue] = useState('')
  const [flagResult, setFlagResult] = useState(null)
  const logRef = useRef(null)
  const [logs, setLogs] = useState(['$ ready — press Start on a VM to begin'])
  const fromRoom = location.state?.room ?? null

  useEffect(() => { api.getChallenge(id).then(setChallenge).catch(() => {}) }, [id])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

  const addLog = line => setLogs(p => [...p, line])

  const startVM = async (vmTpl) => {
    if (!fromRoom?.id) {
      addLog('$ [ERROR] No room context — navigate from a Room page to start VMs')
      return
    }
    setVmState(p => ({ ...p, [vmTpl.id]: { ...p[vmTpl.id], starting: true } }))
    addLog(`$ provisioning ${vmTpl.name} on Proxmox…`)
    try {
      const env = await api.startSingleVM(fromRoom.id, vmTpl.id)
      const envVms = (env.vms ?? []).map(v => ({ ...v, environment_id: env.id }))
      const envVm = envVms.find(v => v.vm_template?.id === vmTpl.id || v.vm_template?.name === vmTpl.name)
      addLog(`$ ✓ ${vmTpl.name} running${envVm?.ip_address ? ' · ' + envVm.ip_address : ''}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { env, envVm, starting: false, stopping: false } }))
    } catch (err) {
      addLog(`$ [ERROR] ${err.message}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...p[vmTpl.id], starting: false } }))
    }
  }

  const stopVM = async (vmTpl) => {
    if (!fromRoom?.id) return
    setVmState(p => ({ ...p, [vmTpl.id]: { ...p[vmTpl.id], stopping: true } }))
    addLog(`$ stopping ${vmTpl.name}…`)
    try {
      await api.stopVM(fromRoom.id, vmTpl.id)
      addLog(`$ ✓ ${vmTpl.name} stopped`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...p[vmTpl.id], envVm: { ...p[vmTpl.id].envVm, status: 'stopped' }, stopping: false } }))
    } catch (err) {
      addLog(`$ [ERROR] ${err.message}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...p[vmTpl.id], stopping: false } }))
    }
  }

  const submitFlag = async () => {
    try {
      const result = await api.submitFlag(id, flagValue)
      setFlagResult(result)
      addLog(result.is_correct ? `$ [✓] Correct! +${result.points_awarded} XP` : '$ [✗] Incorrect — try again')
    } catch (err) {
      setFlagResult({ is_correct: false, message: err.message, points_awarded: 0 })
    }
  }

  if (!challenge) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div className="spinner" />
    </div>
  )

  const lyr   = api.LAB_LAYERS.find(l => l.slug === challenge.lab_layer)
  const isMCQ = /^Q\d+\.\s/m.test(challenge.description) && /^[A-D]\)\s/m.test(challenge.description)
  const cc    = CAT_COLOR[challenge.category?.slug] ?? 'var(--cyan)'

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* Full-bleed hero */}
      <div style={{ marginLeft:-44, marginRight:-44, padding:'0 44px',
        background:`linear-gradient(180deg, ${cc}08 0%, transparent 100%)`,
        borderBottom:'1px solid var(--border)', marginBottom:32 }}>

        {/* Breadcrumb */}
        <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:8, padding:'20px 0 0', fontSize:13, color:'var(--text-4)' }}>
          <Link to="/roadmap" style={{ color:'var(--text-4)' }}>Roadmap</Link>
          {fromRoom && <><span>›</span><Link to={`/rooms/${fromRoom.slug}`} style={{ color:'var(--text-4)' }}>{fromRoom.title}</Link></>}
          <span>›</span>
          <span style={{ color:'var(--text-3)' }}>{challenge.title}</span>
        </div>

        {/* Hero */}
        <div style={{ padding:'24px 0 32px' }}>
          <div className="fade-up-1" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span className={`badge badge-${challenge.category.slug}`}>{challenge.category.name}</span>
            {lyr && <span style={{ fontSize:12, color:'var(--text-4)' }}>{lyr.label}</span>}
            <span style={{ fontSize:12, color:DIFF_COLOR[challenge.difficulty?.slug]??'var(--text-3)', fontWeight:600, textTransform:'capitalize' }}>
              {challenge.difficulty.name}
            </span>
          </div>
          <h1 className="fade-up-2" style={{ fontSize:32, marginBottom:10 }}>{challenge.title}</h1>
          <div className="fade-up-3" style={{ display:'flex', gap:20, fontSize:13, color:'var(--text-4)' }}>
            <span>{challenge.time_limit_minutes} min</span>
            <span style={{ color:'var(--amber)', fontFamily:'var(--mono)', fontWeight:700, fontSize:16 }}>{challenge.points} XP</span>
          </div>
        </div>
      </div>

      {/* Body — 2 columns */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24, alignItems:'start' }}>

        {/* LEFT — briefing + objectives + flag + log */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Mission briefing */}
          <div className="card fade-up">
            <h3 style={{ marginBottom:18, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>
              Mission Briefing
            </h3>
            <DescBody text={challenge.description} />
          </div>

          {/* Objectives */}
          {challenge.objectives && (
            <div className="card fade-up-1">
              <h3 style={{ marginBottom:16, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>Objectives</h3>
              {challenge.objectives.split(';').map((o,i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', border:'1px solid var(--cyan)', color:'var(--cyan)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>
                    {i+1}
                  </div>
                  <span style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.65 }}>{o.trim()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Activity log */}
          <div className="card fade-up-2" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
              {['#F87171','#FBBF24','#34D399'].map(c => <div key={c} style={{ width:9, height:9, borderRadius:'50%', background:c }} />)}
              <span style={{ marginLeft:6, fontSize:10, color:'var(--text-4)', fontFamily:'var(--mono)' }}>lab — activity</span>
            </div>
            <div ref={logRef} style={{ padding:'12px 16px', minHeight:80, maxHeight:140, overflowY:'auto',
              fontFamily:'var(--mono)', fontSize:11, color:'#4ADE80', whiteSpace:'pre-wrap', background:'#03070E' }}>
              {logs.map((l,i) => (
                <div key={i} style={{ marginBottom:2, color:
                  l.includes('[ERROR]') ? 'var(--red)' :
                  l.includes('[✓]')     ? 'var(--green)' :
                  l.includes('[✗]')     ? 'var(--red)' :
                  l.startsWith('$')     ? 'var(--cyan)' : '#4ADE80' }}>
                  {l}
                </div>
              ))}
              <span style={{ animation:'blink 1s step-end infinite', color:'var(--text-4)' }}>█</span>
            </div>
          </div>

          {/* Flag submit */}
          <div className="card fade-up-3">
            <h3 style={{ marginBottom:14, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>
              Submit {isMCQ ? 'Answer' : 'Flag'}
            </h3>
            <div style={{ display:'flex', gap:8 }}>
              <input value={flagValue} onChange={e => setFlagValue(e.target.value)}
                onKeyDown={e => e.key==='Enter' && submitFlag()}
                placeholder={isMCQ ? 'ANSWER_B_C' : 'FLAG{...}'}
                style={{ fontFamily:'var(--mono)', flex:1 }} />
              <button className="btn-primary" style={{ padding:'9px 20px' }} onClick={submitFlag}>Submit</button>
            </div>
            {flagResult && (
              <div style={{ marginTop:12, padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:13,
                background: flagResult.is_correct ? 'var(--green-dim)' : 'var(--red-dim)',
                color:      flagResult.is_correct ? 'var(--green)'     : 'var(--red)',
                border:     `1px solid ${flagResult.is_correct ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
                {flagResult.is_correct ? '✓ Correct!' : '✗ ' + flagResult.message}
                {flagResult.points_awarded > 0 && ` · +${flagResult.points_awarded} XP`}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — VM controls + tags */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* VMs */}
          <div className="card fade-up-1">
            <h3 style={{ marginBottom:16, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>
              Virtual Machines ({challenge.vms.length})
            </h3>
            {challenge.vms.length === 0
              ? <p style={{ fontSize:13, color:'var(--text-4)' }}>No VMs configured.</p>
              : challenge.vms.map(v => {
                  const s = vmState[v.vm_template.id] ?? {}
                  return (
                    <VMCard
                      key={v.vm_template.id}
                      vmTemplate={v.vm_template}
                      env={s.env ?? null}
                      envVm={s.envVm ?? null}
                      onStart={() => startVM(v.vm_template)}
                      onStop={() => stopVM(v.vm_template)}
                      starting={s.starting === true}
                      stopping={s.stopping === true}
                    />
                  )
                })
            }
          </div>

          {/* Tags */}
          {challenge.tags && (
            <div className="card fade-up-2">
              <h3 style={{ marginBottom:12, fontSize:13, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>Tags</h3>
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

          {/* MCQ guide */}
          {isMCQ && (
            <div className="card fade-up-3" style={{ borderColor:'rgba(167,139,250,0.15)' }}>
              <h3 style={{ marginBottom:10, color:'var(--violet)', fontSize:13, fontWeight:600 }}>How to submit</h3>
              <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7, marginBottom:10 }}>
                Investigate the lab machines, then submit your combined answer below.
              </p>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--surface-3)',
                border:'1px solid var(--border-md)', borderRadius:'var(--r-xs)', padding:'7px 11px', color:'var(--violet)' }}>
                Example: ANSWER_B_C
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
