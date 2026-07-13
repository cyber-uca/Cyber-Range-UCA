import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'

const ANIM = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
`
const diffColor = { easy:'var(--mitigation)', medium:'var(--warning)', hard:'var(--offensive)' }

/* ─── tiny spinner ─────────────────────────────────────────────────────── */
function Spin({ size=12 }) {
  return <div style={{ width:size, height:size, border:'2px solid currentColor',
    borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }} />
}

/* ─── MCQ parser ──────────────────────────────────────────────────────── */
function parseDesc(text) {
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
    if (/^\s+(Vehicle|OTA|Wazuh|Machine|accrisk|icsim|riskroom)/.test(raw) && raw.includes('—')) {
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

/* ─── MCQ renderer ─────────────────────────────────────────────────────── */
function TaskBody({ challenge }) {
  const blocks = parseDesc(challenge.description)
  const isMCQ = /^Q\d+\.\s/m.test(challenge.description)
  if (!isMCQ) return (
    <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.85, margin:0 }}>
      {challenge.description}
    </p>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {blocks.map((b,i) => {
        if (b.type==='prose') return (
          <p key={i} style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.85, margin:0 }}>{b.text}</p>
        )
        if (b.type==='cmd') return (
          <div key={i} style={{ fontFamily:'var(--font-mono)', fontSize:12, background:'#04070C',
            border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', color:'#00C2E6' }}>{b.text}</div>
        )
        if (b.type==='access') return (
          <div key={i} style={{ background:'rgba(0,194,230,0.05)', border:'1px solid rgba(0,194,230,0.2)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--accent)', fontWeight:700, marginBottom:8 }}>Lab Access</div>
            {b.lines.map((l,j) => {
              const [name, ...rest] = l.split('—').map(s=>s.trim())
              return (
                <div key={j} style={{ display:'flex', gap:12, fontSize:12, padding:'4px 0', borderBottom: j<b.lines.length-1?'1px solid var(--border)':'none' }}>
                  <span style={{ color:'var(--text)', fontWeight:600, minWidth:110 }}>{name}</span>
                  <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:11 }}>{rest.join(' — ')}</span>
                </div>
              )
            })}
          </div>
        )
        if (b.type==='files') return (
          <div key={i} style={{ background:'rgba(155,124,240,0.05)', border:'1px solid rgba(155,124,240,0.2)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--combined)', fontWeight:700, marginBottom:8 }}>Log Files</div>
            {b.lines.map((l,j) => {
              const [fname, ...rest] = l.split('—').map(s=>s.trim())
              return (
                <div key={j} style={{ display:'flex', gap:12, fontSize:12, padding:'5px 0', borderBottom: j<b.lines.length-1?'1px solid var(--border)':'none' }}>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--combined)', minWidth:100, fontSize:11 }}>{fname}</span>
                  <span style={{ color:'var(--text-muted)' }}>{rest.join(' — ')}</span>
                </div>
              )
            })}
          </div>
        )
        if (b.type==='q') return (
          <div key={i} style={{ background:'rgba(13,24,38,0.6)', border:'1px solid var(--border)', borderLeft:'3px solid var(--accent)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:800, color:'var(--accent)', background:'var(--accent-dim)', padding:'2px 8px', borderRadius:6, flexShrink:0 }}>{b.num}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.5 }}>{b.text}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {b.opts.map(o => (
                <div key={o.l} style={{ display:'flex', gap:10, padding:'8px 12px', borderRadius:8, background:'rgba(7,13,22,0.5)', border:'1px solid var(--border)' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:12, color:'var(--text-muted)', minWidth:18 }}>{o.l}</span>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>{o.t}</span>
                </div>
              ))}
            </div>
          </div>
        )
        if (b.type==='submit') return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(20,201,168,0.08)', border:'1px solid rgba(20,201,168,0.25)', borderRadius:10, padding:'12px 16px' }}>
            <span style={{ fontSize:16 }}>🏁</span>
            <span style={{ fontSize:13, color:'var(--mitigation)', fontWeight:600 }}>{b.text}</span>
          </div>
        )
        return null
      })}
    </div>
  )
}

/* ─── VM card ──────────────────────────────────────────────────────────── */
function VMCard({ vmTemplate, envVm, onStart, starting }) {
  const running = envVm?.status === 'running'
  const ip = envVm?.ip_address
  const [consoleUrl, setConsoleUrl] = useState(null)
  const [loadingConsole, setLoadingConsole] = useState(false)

  const openConsole = async () => {
    // If we already have the URL, just open it
    if (consoleUrl) { window.open(consoleUrl, '_blank'); return }
    if (!envVm?.id) return
    setLoadingConsole(true)
    try {
      // We need the environment id — stored on envVm parent env
      const data = await api.getConsoleUrl(envVm.environment_id, envVm.id)
      setConsoleUrl(data.console_url)
      window.open(data.console_url, '_blank')
    } catch (err) {
      // Fallback: build URL directly from proxmox_vmid + node if available
      if (envVm.proxmox_vmid && envVm.proxmox_node) {
        const url = `https://192.168.37.20:8006/?console=kvm&novnc=1&vmid=${envVm.proxmox_vmid}&node=${envVm.proxmox_node}&lang=en`
        setConsoleUrl(url)
        window.open(url, '_blank')
      }
    } finally { setLoadingConsole(false) }
  }

  return (
    <div style={{
      background: running ? 'rgba(20,201,168,0.07)' : 'rgba(13,24,38,0.75)',
      border: `1px solid ${running ? 'rgba(20,201,168,0.35)' : 'var(--border)'}`,
      borderRadius:12, padding:'14px 16px', transition:'all .2s',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            background: running ? 'rgba(20,201,168,0.15)' : 'var(--accent-dim)',
            border: `1px solid ${running ? 'rgba(20,201,168,0.35)' : 'rgba(0,194,230,0.2)'}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={running ? 'var(--mitigation)' : 'var(--accent)'} strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>{vmTemplate.name}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
              {vmTemplate.zone}
              {running && ip && <span style={{ color:'var(--mitigation)', marginLeft:8 }}>· {ip}</span>}
              {running && envVm?.proxmox_vmid && (
                <span style={{ color:'var(--text-dim)', marginLeft:8 }}>vmid:{envVm.proxmox_vmid}</span>
              )}
            </div>
          </div>
        </div>

        {running ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success)',
                boxShadow:'0 0 6px var(--success)', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:11, color:'var(--mitigation)', fontWeight:700 }}>RUNNING</span>
            </div>
            <button
              onClick={openConsole}
              disabled={loadingConsole}
              style={{ padding:'6px 14px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer',
                background:'var(--accent-dim)', color:'var(--accent)',
                border:'1px solid rgba(0,194,230,0.35)', display:'flex', alignItems:'center', gap:5 }}>
              {loadingConsole ? <><Spin size={10}/> Opening…</> : <>🖥 Open Console</>}
            </button>
          </div>
        ) : (
          <button onClick={onStart} disabled={starting}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, cursor: starting ? 'wait' : 'pointer',
              background: starting ? 'var(--surface-2)' : 'var(--accent)',
              color: starting ? 'var(--text-muted)' : 'var(--on-accent)',
              border:'none', display:'flex', alignItems:'center', gap:6,
              boxShadow: starting ? 'none' : '0 0 12px rgba(0,194,230,0.3)' }}>
            {starting ? <><Spin /> Starting…</> : <>▶ Start {vmTemplate.name}</>}
          </button>
        )}
      </div>
      {running && vmTemplate.default_tools && (
        <div style={{ marginTop:10, fontSize:11, color:'var(--text-dim)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
          Tools: <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{vmTemplate.default_tools}</span>
        </div>
      )}
    </div>
  )
}

/* ─── hints ─────────────────────────────────────────────────────────────── */
function Hints({ challengeId }) {
  const [hints, setHints] = useState([])
  const [shown, setShown] = useState({})
  useEffect(() => { api.getHints(challengeId).then(setHints).catch(()=>{}) }, [challengeId])
  if (!hints.length) return null
  return (
    <div style={{ marginTop:20 }}>
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:700, marginBottom:10 }}>Hints</div>
      {hints.map(h => (
        <div key={h.id} className="hint-item" style={{ marginBottom:8 }}>
          {shown[h.id]
            ? <span style={{ fontSize:13, color:'var(--text)', lineHeight:1.6 }}>{h.content}</span>
            : <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Hint #{h.order+1}</span>
                <button className="btn-secondary" style={{ fontSize:11, padding:'5px 12px' }}
                  onClick={() => setShown(p => ({...p,[h.id]:true}))}>
                  Reveal {h.cost > 0 && <span style={{ color:'var(--offensive)', marginLeft:4 }}>−{h.cost} pts</span>}
                </button>
              </div>
          }
        </div>
      ))}
    </div>
  )
}

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function RoomLab() {
  const { slug } = useParams()
  const [room, setRoom] = useState(null)
  const [challenges, setChallenges] = useState({})   // id → full ChallengeDetail
  const [activeIdx, setActiveIdx] = useState(0)
  // per-challenge: { env, envVms, logs, starting, flagValue, flagResult }
  const [ts, setTs] = useState({})
  const logRef = useRef(null)

  // fetch room
  useEffect(() => { api.getRoom(slug).then(setRoom).catch(()=>{}) }, [slug])

  // fetch full challenge detail for every task as soon as room loads
  useEffect(() => {
    if (!room) return
    room.challenges.forEach(rc => {
      if (!rc.challenge) return
      api.getChallenge(rc.challenge.id).then(full => {
        setChallenges(p => ({...p, [full.id]: full}))
      }).catch(()=>{})
    })
  }, [room])

  const get = id => ts[id] ?? { env:null, envVms:[], logs:['$ ready — use Start buttons to provision VMs'], starting:null, flagValue:'', flagResult:null }
  const put = (id, patch) => setTs(p => ({...p, [id]: {...get(id), ...patch}}))
  const log = (id, line) => setTs(p => {
    const prev = p[id] ?? get(id)
    return {...p, [id]: {...prev, logs:[...prev.logs, line]}}
  })

  // scroll log to bottom whenever it updates
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [ts])

  /* start one VM independently */
  const startVM = async (challenge, vmTpl) => {
    const id = challenge.id
    const s = get(id)
    // if env already exists, this VM is already provisioned — nothing to do
    if (s.env) { log(id, `$ ${vmTpl.name} is already part of a running environment`); return }
    put(id, { starting: vmTpl.id })
    log(id, `$ provisioning ${vmTpl.name} (VMID ${vmTpl.proxmox_template_id ?? '?'}) on Proxmox…`)
    try {
      const topology = {
        nodes:[{ node_id:`n0`, vm_template_id: vmTpl.id, x:100, y:150 }],
        links:[],
      }
      const env = await api.startEnvironment(id, topology)
      const vm = env.vms?.[0]
      const ip = vm?.ip_address ? ` · ${vm.ip_address}` : ''
      log(id, `$ ✓ ${vmTpl.name} running${ip}`)
      // attach environment_id to each vm so the console endpoint can use it
      const envVms = (env.vms ?? []).map(v => ({ ...v, environment_id: env.id }))
      put(id, { env, envVms, starting:null })
    } catch(err) {
      log(id, `$ [ERROR] ${err.message}`)
      put(id, { starting:null })
    }
  }

  /* submit flag */
  const submitFlag = async (challenge) => {
    const id = challenge.id
    const val = get(id).flagValue
    try {
      const result = await api.submitFlag(id, val)
      put(id, { flagResult: result })
      if (result.is_correct) {
        log(id, `$ [✓] Correct! +${result.points_awarded} XP`)
        setTimeout(() => setActiveIdx(i => Math.min(i+1, (room?.challenges?.length??1)-1)), 1000)
      } else {
        log(id, `$ [✗] Incorrect — try again`)
      }
    } catch(err) {
      put(id, { flagResult:{ is_correct:false, message:err.message, points_awarded:0 }})
    }
  }

  /* ── loading ── */
  if (!room) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{ANIM}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'2px solid var(--accent)', borderTopColor:'transparent',
          borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 12px' }}/>
        <span style={{ color:'var(--text-muted)', fontSize:13 }}>Loading lab…</span>
      </div>
    </div>
  )

  const tasks    = room.challenges ?? []
  const rc       = tasks[activeIdx]
  const card     = rc?.challenge
  const full     = card ? challenges[card.id] : null
  const state    = card ? get(card.id) : null
  const lyr      = api.LAB_LAYERS.find(l => l.slug === room.lab_layer)
  const totalXP  = tasks.reduce((s,r) => s + (r.challenge?.points??0), 0)
  const earnedXP = tasks.reduce((s,r) => {
    const res = r.challenge ? ts[r.challenge.id]?.flagResult : null
    return s + (res?.is_correct ? (r.challenge?.points??0) : 0)
  }, 0)
  const vms = full?.vms ?? []

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <style>{ANIM}</style>

      {/* ── topbar ── */}
      <div style={{ height:50, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', borderBottom:'1px solid var(--border)',
        background:'rgba(13,24,38,0.97)', backdropFilter:'blur(16px)',
        position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to={`/rooms/${slug}`} style={{ fontSize:12, color:'var(--text-muted)' }}>← {room.title}</Link>
          <div style={{ width:1, height:16, background:'var(--border)' }}/>
          {lyr && <span style={{ fontSize:12, color:lyr.color, fontWeight:700 }}>{lyr.icon} {lyr.label}</span>}
          <span className={`category-tag tag-${room.category?.color}`}>{room.category?.name}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>
            <span style={{ fontFamily:'var(--font-mono)', color:'var(--warning)', fontWeight:700 }}>{earnedXP}</span>
            {' / '}{totalXP} XP
          </span>
          <div style={{ width:90, height:4, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, background:'var(--accent)',
              width:`${totalXP>0?(earnedXP/totalXP)*100:0}%`, transition:'width .4s' }}/>
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* left sidebar — task list */}
        <div style={{ width:240, flexShrink:0, borderRight:'1px solid var(--border)',
          background:'rgba(10,18,30,0.97)', overflowY:'auto', padding:'14px 10px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
            color:'var(--text-dim)', fontWeight:700, marginBottom:12, paddingLeft:4 }}>
            Tasks ({tasks.length})
          </div>
          {tasks.map((r,idx) => {
            const c = r.challenge; if(!c) return null
            const solved = ts[c.id]?.flagResult?.is_correct
            const active = idx===activeIdx
            return (
              <div key={c.id} onClick={()=>setActiveIdx(idx)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 10px',
                  borderRadius:10, marginBottom:4, cursor:'pointer',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(0,194,230,0.25)' : 'transparent'}`,
                  transition:'all .15s' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800, fontFamily:'var(--font-mono)',
                  background: solved ? 'var(--mitigation-dim)' : active ? 'var(--accent-dim)' : 'var(--surface-2)',
                  color: solved ? 'var(--mitigation)' : active ? 'var(--accent)' : 'var(--text-dim)',
                  border: `1px solid ${solved ? 'rgba(20,201,168,0.3)' : active ? 'rgba(0,194,230,0.3)' : 'var(--border)'}` }}>
                  {solved ? '✓' : String(idx+1).padStart(2,'0')}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight: active?700:500,
                    color: active?'var(--text)':'var(--text-muted)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginTop:1 }}>
                    {c.points} XP
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* main area */}
        {!card ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
            Select a task
          </div>
        ) : (
          <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 320px' }}>

            {/* center — content */}
            <div style={{ overflowY:'auto', padding:'22px 28px', borderRight:'1px solid var(--border)' }}>
              {/* task header */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:'var(--text-dim)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>
                  Task {activeIdx+1} of {tasks.length}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>{card.title}</h2>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background: diffColor[card.difficulty?.slug]??'var(--accent)' }}/>
                      <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{card.difficulty?.name}</span>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', color:'var(--warning)', fontWeight:700, fontSize:14 }}>{card.points} XP</span>
                  </div>
                </div>
              </div>

              {/* MCQ body */}
              {full
                ? <TaskBody challenge={full}/>
                : <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text-dim)', fontSize:13 }}>
                    <Spin size={14}/> Loading task…
                  </div>
              }

              {/* objectives */}
              {full?.objectives && (
                <div style={{ marginTop:20, background:'rgba(13,24,38,0.55)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:700, marginBottom:10 }}>What you will learn</div>
                  {full.objectives.split(';').map((o,i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)', marginTop:5, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{o.trim()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* activity log */}
              <div style={{ marginTop:22 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:700, marginBottom:8 }}>Activity log</div>
                <div style={{ background:'#04070C', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderBottom:'1px solid var(--border)', background:'#060B12' }}>
                    {['#F0524A','#F5A623','#22C55E'].map(c=><div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>)}
                    <span style={{ marginLeft:6, fontSize:10, color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>lab</span>
                  </div>
                  <div ref={logRef} style={{ padding:'10px 14px', minHeight:80, maxHeight:150, overflowY:'auto',
                    fontFamily:'var(--font-mono)', fontSize:11, color:'#4ADE80', whiteSpace:'pre-wrap' }}>
                    {state.logs.map((l,i) => (
                      <div key={i} style={{ marginBottom:2, color:
                        l.includes('[ERROR]') ? 'var(--offensive)' :
                        l.includes('[✓]') ? 'var(--success)' :
                        l.includes('[✗]') ? 'var(--offensive)' :
                        l.startsWith('$') ? '#00C2E6' : '#4ADE80' }}>{l}</div>
                    ))}
                    <span style={{ animation:'blink 1s step-end infinite', color:'var(--text-dim)' }}>█</span>
                  </div>
                </div>
              </div>

              {/* flag submit */}
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:700, marginBottom:8 }}>Submit answer</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={state.flagValue}
                    onChange={e => put(card.id,{flagValue:e.target.value})}
                    onKeyDown={e => e.key==='Enter' && full && submitFlag(full)}
                    placeholder="ANSWER_B_C  or  FLAG{...}"
                    style={{ fontFamily:'var(--font-mono)', flex:1 }}/>
                  <button className="btn-primary" style={{ whiteSpace:'nowrap', padding:'10px 20px' }}
                    onClick={() => full && submitFlag(full)}>Submit</button>
                </div>
                {state.flagResult && (
                  <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, fontSize:13,
                    background: state.flagResult.is_correct ? 'var(--mitigation-dim)' : 'var(--offensive-dim)',
                    color: state.flagResult.is_correct ? 'var(--mitigation)' : 'var(--offensive)',
                    border:`1px solid ${state.flagResult.is_correct ? 'rgba(20,201,168,0.3)':'rgba(240,82,74,0.3)'}` }}>
                    {state.flagResult.is_correct ? '✓ Correct!' : '✗ '+state.flagResult.message}
                    {state.flagResult.points_awarded>0 && ` · +${state.flagResult.points_awarded} XP`}
                  </div>
                )}
              </div>

              {/* hints */}
              {full && <Hints challengeId={full.id}/>}
            </div>

            {/* right — VMs */}
            <div style={{ overflowY:'auto', padding:'20px 16px', background:'rgba(7,13,22,0.65)' }}>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em',
                color:'var(--text-dim)', fontWeight:700, marginBottom:14 }}>
                Virtual Machines ({vms.length})
              </div>

              {vms.length === 0 && !full && (
                <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--text-dim)', fontSize:12 }}>
                  <Spin size={12}/> Loading VM list…
                </div>
              )}

              {vms.length === 0 && full && (
                <p style={{ color:'var(--text-dim)', fontSize:12 }}>No VMs configured for this task.</p>
              )}

              {vms.map(v => (
                <div key={v.vm_template.id} style={{ marginBottom:10 }}>
                  <VMCard
                    vmTemplate={v.vm_template}
                    envVm={state.envVms.find(e => e.vm_template?.id===v.vm_template.id || e.vm_template?.name===v.vm_template.name)}
                    onStart={() => full && startVM(full, v.vm_template)}
                    starting={state.starting === v.vm_template.id}
                  />
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
