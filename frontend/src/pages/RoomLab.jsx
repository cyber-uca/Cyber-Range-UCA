import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth, useThemeCtx } from '../App.jsx'

const ANIM = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
`

function Spin({ size=12 }) {
  return <div style={{ width:size, height:size, border:'2px solid currentColor',
    borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }} />
}

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
function fmt(secs) {
  if (secs === null) return null
  return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`
}

/* ─── VM Card ─────────────────────────────────────────────────────────── */
function VMCard({ vmTemplate, envVm, env, onStart, onStop, onPause, onResume, starting, stopping, pausing, resuming }) {
  const running = envVm?.status === 'running'
  const paused  = envVm?.status === 'paused'
  const provisioning = envVm?.status === 'provisioning' || starting
  const ip = envVm?.ip_address
  const pausedSecsLeft = paused ? env?.time_remaining_seconds : null
  const secsLeft = useCountdown(running && !paused && env?.expires_at_iso ? env.expires_at_iso : null)
  const urgent = secsLeft !== null && secsLeft < 300
  const warn   = secsLeft !== null && secsLeft < 900

  // Auto-stop when timer expires
  const autoStopRef = React.useRef(false)
  useEffect(() => {
    if (secsLeft === 0 && running && !autoStopRef.current) {
      autoStopRef.current = true
      addLog('$ ⏰ Time expired — stopping VM automatically')
      onStop()
    }
  }, [secsLeft, running])
  const [consoleUrl, setConsoleUrl] = useState(null)
  const [loadingConsole, setLoadingConsole] = useState(false)

  const openConsole = async () => {
    if (!envVm?.id) return
    setLoadingConsole(true)
    try {
      const env = await api.getEnvironment(envVm.environment_id).catch(() => null)
      const freshVm = env?.vms?.find(v => v.id === envVm.id) ?? envVm
      const data = await api.getConsoleUrl(freshVm.environment_id ?? envVm.environment_id, freshVm.id)
      // Set PVEAuthCookie on /proxmox path so nginx-proxied noVNC can authenticate
      if (data.pve_ticket && data.console_url?.startsWith('/proxmox')) {
        // Extract proxy path prefix (/proxmox/, /proxmox-pve2/, /proxmox-pve3/)
        const proxyPath = data.console_url.split('?')[0]
        document.cookie = `PVEAuthCookie=${encodeURIComponent(data.pve_ticket)}; path=${proxyPath}; SameSite=Lax`
        await new Promise(r => setTimeout(r, 50))
      }
      window.open(data.console_url, '_blank', 'width=1200,height=800')
    } catch(err) {
      if (err.message?.includes('410') || err.message?.toLowerCase().includes('no longer exists')) {
        alert('This VM was deleted on Proxmox. Click Stop then Start again.')
      } else if (envVm.proxmox_vmid && envVm.proxmox_node) {
        window.open(`https://192.168.37.20:8006/?console=kvm&novnc=1&vmid=${envVm.proxmox_vmid}&node=${envVm.proxmox_node}`, '_blank')
      }
    } finally { setLoadingConsole(false) }
  }

  return (
    <div style={{
      background: running ? 'rgba(20,201,168,0.07)' : 'var(--surface-2)',
      border:`1px solid ${running ? (urgent ? 'rgba(240,82,74,0.5)' : 'rgba(20,201,168,0.35)') : 'var(--border)'}`,
      borderRadius:12, padding:'14px 16px', transition:'all .2s', marginBottom:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:'1 1 auto', minWidth:0 }}>
          <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            background: running ? 'rgba(20,201,168,0.15)' : 'rgba(0,194,230,0.08)',
            border:`1px solid ${running ? 'rgba(20,201,168,0.35)' : 'rgba(0,194,230,0.2)'}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={running ? '#14C9A8' : '#00C2E6'} strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div style={{ minWidth:0, flex:'1 1 auto' }}>
            <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={vmTemplate.name}>
              {vmTemplate.name}
            </div>
            <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)', marginTop:2,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {vmTemplate.zone}
              {running && ip && <span style={{ color:'#14C9A8', marginLeft:8 }}>· {ip}</span>}
            </div>
          </div>
        </div>
        {running ? (
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#14C9A8', boxShadow:'0 0 6px #14C9A8', animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:11, color:'#14C9A8', fontWeight:700 }}>RUNNING</span>
          </div>
        ) : paused ? (
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)', boxShadow:'0 0 6px var(--amber)' }} />
            <span style={{ fontSize:11, color:'var(--amber)', fontWeight:700 }}>PAUSED</span>
          </div>
        ) : provisioning ? (
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, color:'var(--text-4)' }}>
            <Spin />
            <span style={{ fontSize:11, fontWeight:700 }}>STARTING…</span>
          </div>
        ) : (
          <button onClick={onStart} disabled={starting}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700,
              cursor:starting?'wait':'pointer',
              background:starting?'var(--surface-2)':'var(--cyan)',
              color:starting?'var(--text-4)':'#000',
              border:'none', display:'flex', alignItems:'center', gap:6, flexShrink:0, whiteSpace:'nowrap' }}>
            {starting ? <><Spin /> Starting…</> : <>▶ Start</>}
          </button>
        )}
      </div>
      {running && (
        <div style={{ marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          {secsLeft !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:6,
              background:urgent?'rgba(240,82,74,0.1)':warn?'rgba(245,166,35,0.1)':'var(--surface-2)',
              border:`1px solid ${urgent?'rgba(240,82,74,0.3)':warn?'rgba(245,166,35,0.3)':'var(--border)'}`,
              borderRadius:8, padding:'5px 12px' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                color:urgent?'var(--red)':warn?'var(--amber)':'var(--text-4)' }}>
                {fmt(secsLeft)}
              </span>
              <span style={{ fontSize:10, color:'var(--text-4)' }}>until auto-destroy</span>
            </div>
          )}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={openConsole} disabled={loadingConsole}
              style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer',
                background:'rgba(0,194,230,0.08)', color:'var(--cyan)',
                border:'1px solid rgba(0,194,230,0.35)', display:'flex', alignItems:'center', gap:5 }}>
              {loadingConsole ? <><Spin size={10}/> …</> : <>🖥 Console</>}
            </button>
            <button onClick={onPause} disabled={pausing}
              style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700,
                cursor:pausing?'wait':'pointer',
                background:'rgba(245,166,35,0.08)', color:'var(--amber)',
                border:'1px solid rgba(245,166,35,0.35)', display:'flex', alignItems:'center', gap:5 }}>
              {pausing ? <><Spin size={10}/> …</> : <>⏸ Pause</>}
            </button>
            <button onClick={onStop} disabled={stopping}
              style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700,
                cursor:stopping?'wait':'pointer',
                background:stopping?'var(--surface-2)':'rgba(240,82,74,0.08)',
                color:stopping?'var(--text-4)':'var(--red)',
                border:`1px solid ${stopping?'var(--border)':'rgba(240,82,74,0.35)'}`,
                display:'flex', alignItems:'center', gap:5 }}>
              {stopping ? <><Spin size={10}/> …</> : <>⏹ Stop</>}
            </button>
          </div>
        </div>
      )}
      {paused && (
        <div style={{ marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6,
            background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.3)',
            borderRadius:8, padding:'5px 12px' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--amber)' }}>
              ⏸ Paused — {pausedSecsLeft != null ? `${fmt(pausedSecsLeft)} left before auto-destroy` : 'timer frozen'}
            </span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={onResume} disabled={resuming}
              style={{ padding:'6px 14px', borderRadius:7, fontSize:11, fontWeight:700,
                cursor:resuming?'wait':'pointer',
                background:'rgba(20,201,168,0.1)', color:'#14C9A8',
                border:'1px solid rgba(20,201,168,0.35)', display:'flex', alignItems:'center', gap:5 }}>
              {resuming ? <><Spin size={10}/> …</> : <>▶ Resume</>}
            </button>
            <button onClick={onStop} disabled={stopping}
              style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700,
                cursor:stopping?'wait':'pointer',
                background:stopping?'var(--surface-2)':'rgba(240,82,74,0.08)',
                color:stopping?'var(--text-4)':'var(--red)',
                border:`1px solid ${stopping?'var(--border)':'rgba(240,82,74,0.35)'}`,
                display:'flex', alignItems:'center', gap:5 }}>
              {stopping ? <><Spin size={10}/> …</> : <>⏹ Stop</>}
            </button>
          </div>
        </div>
      )}
      {running && vmTemplate.default_tools && (
        <div style={{ marginTop:10, fontSize:11, color:'var(--text-4)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
          Tools: <span style={{ fontFamily:'var(--mono)' }}>{vmTemplate.default_tools}</span>
        </div>
      )}
    </div>
  )
}

/* ─── Matching question block ─────────────────────────────────────────── */
function MatchingBlock({ q, answer, onAnswer, submitted, correct }) {
  const [selectedLeft, setSelectedLeft] = useState(null)
  const opts      = q.options ?? []
  const leftOpts  = opts.filter(o => o.match_key?.startsWith('L_')).sort((a,b) => a.sort_order - b.sort_order)
  const rightOpts = opts.filter(o => o.match_key?.startsWith('R_')).sort((a,b) => a.sort_order - b.sort_order)

  // Stable shuffle of right column (based on question id so same each load)
  const shuffled = React.useMemo(() => {
    if (submitted) return rightOpts
    const seed = parseInt(q.id.replace(/-/g,'').slice(-8), 16) || 0
    return [...rightOpts].sort((a, b) => {
      const ha = parseInt(a.id.replace(/-/g,'').slice(-4),16) ^ seed
      const hb = parseInt(b.id.replace(/-/g,'').slice(-4),16) ^ seed
      return ha - hb
    })
  }, [q.id, submitted])

  const userPairs  = (answer && typeof answer === 'object' && !Array.isArray(answer)) ? answer : {}
  const vd         = q.validation_data ?? {}
  const correctMap = Object.fromEntries((vd.pairs ?? []).map(p => [p.left_id, p.right_id]))

  const handleLeft  = (id) => { if (!submitted) setSelectedLeft(prev => prev === id ? null : id) }
  const handleRight = (id) => {
    if (submitted || !selectedLeft) return
    onAnswer({ ...userPairs, [selectedLeft]: id })
    setSelectedLeft(null)
  }

  if (leftOpts.length === 0) return (
    <p style={{ color:'var(--text-4)', fontSize:12 }}>No matching pairs defined yet.</p>
  )

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 32px 1fr', gap:'6px 8px', alignItems:'start' }}>
        {/* Headers */}
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', paddingBottom:4 }}>Premise</div>
        <div />
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.08em', paddingBottom:4 }}>Match</div>

        {/* Left items */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {leftOpts.map(lo => {
            const sel      = selectedLeft === lo.id
            const paired   = userPairs[lo.id]
            const pairedRO = rightOpts.find(r => r.id === paired)
            const isRight  = submitted && correctMap[lo.id] === paired
            const isWrong  = submitted && paired && !isRight
            return (
              <div key={lo.id} onClick={() => handleLeft(lo.id)} style={{
                padding:'8px 12px', borderRadius:8, cursor: submitted ? 'default' : 'pointer',
                fontSize:13, fontWeight:500, transition:'all .15s', minHeight:36,
                background: isRight ? 'rgba(20,201,168,0.1)' : isWrong ? 'rgba(240,82,74,0.08)' : sel ? 'rgba(0,194,230,0.12)' : 'rgba(7,13,22,0.5)',
                border:`1px solid ${isRight ? 'rgba(20,201,168,0.4)' : isWrong ? 'rgba(240,82,74,0.35)' : sel ? 'rgba(0,194,230,0.5)' : 'var(--border)'}`,
                color: isRight ? '#14C9A8' : isWrong ? 'var(--red)' : sel ? 'var(--cyan)' : 'var(--text)',
              }}>
                {lo.text}
                {pairedRO && !submitted && (
                  <span style={{ fontSize:10, color:'var(--text-4)', marginLeft:8 }}>→ {pairedRO.text}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Arrow col */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {leftOpts.map(lo => {
            const hasPair = !!userPairs[lo.id]
            return (
              <div key={lo.id} style={{ height:36, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, color: hasPair ? 'var(--cyan)' : 'var(--border-md)' }}>
                →
              </div>
            )
          })}
        </div>

        {/* Right items (shuffled) */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {shuffled.map(ro => {
            const isPaired   = Object.values(userPairs).includes(ro.id)
            const canSelect  = !submitted && selectedLeft && !isPaired
            const isRight    = submitted && Object.entries(correctMap).some(([lid,rid]) => rid===ro.id && userPairs[lid]===ro.id)
            const isWrong    = submitted && isPaired && !isRight
            return (
              <div key={ro.id} onClick={() => handleRight(ro.id)} style={{
                padding:'8px 12px', borderRadius:8, minHeight:36,
                cursor: canSelect ? 'pointer' : submitted ? 'default' : isPaired ? 'default' : 'not-allowed',
                fontSize:13, fontWeight:500, transition:'all .15s',
                opacity: !submitted && isPaired && selectedLeft ? 0.45 : 1,
                background: isRight ? 'rgba(20,201,168,0.1)' : isWrong ? 'rgba(240,82,74,0.08)' : canSelect ? 'rgba(0,194,230,0.06)' : 'rgba(7,13,22,0.5)',
                border:`1px solid ${isRight ? 'rgba(20,201,168,0.4)' : isWrong ? 'rgba(240,82,74,0.35)' : canSelect ? 'rgba(0,194,230,0.3)' : 'var(--border)'}`,
                color: isRight ? '#14C9A8' : isWrong ? 'var(--red)' : 'var(--text)',
              }}>
                {ro.text}
              </div>
            )
          })}
        </div>
      </div>

      {/* Help text */}
      {!submitted && (
        <p style={{ fontSize:11, color:'var(--text-4)', marginTop:8 }}>
          {selectedLeft ? '↑ Now click the matching item on the right →' : 'Click a premise on the left, then click its match on the right'}
        </p>
      )}

      {/* Correct pairs reveal */}
      {submitted && !correct && (vd.pairs??[]).length > 0 && (
        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8,
          background:'rgba(20,201,168,0.05)', border:'1px solid rgba(20,201,168,0.2)' }}>
          <div style={{ fontSize:11, color:'#14C9A8', fontWeight:700, marginBottom:6 }}>Correct pairings:</div>
          {(vd.pairs??[]).map(p => {
            const lo = leftOpts.find(o=>o.id===p.left_id)
            const ro = rightOpts.find(o=>o.id===p.right_id)
            return lo && ro ? (
              <div key={p.left_id} style={{ fontSize:12, color:'var(--text-3)', marginBottom:3 }}>
                <span style={{color:'var(--text)'}}>{lo.text}</span>
                <span style={{color:'var(--cyan)',margin:'0 6px'}}>→</span>
                <span style={{color:'#14C9A8'}}>{ro.text}</span>
              </div>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Question renderer ───────────────────────────────────────────────── */
function QuestionBlock({ q, idx, answer, onAnswer, submitted, result }) {
  const isMcq    = q.question_type === 'mcq_single' || q.question_type === 'mcq_multi'
  const correct  = result?.is_correct
  const border   = !submitted ? 'var(--border)' : correct ? 'rgba(20,201,168,0.5)' : 'rgba(240,82,74,0.4)'
  const bg = !submitted ? 'var(--surface-2)' : correct ? 'rgba(20,201,168,0.06)' : 'rgba(240,82,74,0.05)'

  // Determine which option is correct (for reveal after wrong answer)
  const correctOptId = q.validation_data?.correct_option_id
  const correctIdx   = q.validation_data?.correct_option_index
  const correctOpt   = isMcq ? (
    (q.options ?? []).find(o => o.id === correctOptId) ??
    (correctIdx != null ? (q.options ?? []).sort((a,b) => a.sort_order - b.sort_order)[correctIdx] : null)
  ) : null

  return (
    <div style={{ background:bg, border:`1px solid ${border}`,
      borderLeft:`3px solid ${submitted ? (correct?'#14C9A8':'var(--red)') : 'var(--cyan)'}`,
      borderRadius:12, padding:'16px 18px', marginBottom:14 }}>

      {/* Question header */}
      <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, color:'var(--cyan)',
          background:'rgba(0,194,230,0.1)', padding:'2px 8px', borderRadius:6, flexShrink:0 }}>
          Q{idx+1}
        </span>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.5 }}>{q.text}</span>
          {q.is_mandatory && <span style={{ marginLeft:8, fontSize:10, color:'var(--amber)', fontWeight:700 }}>required</span>}
          <span style={{ marginLeft:8, fontSize:10, color:'var(--text-4)' }}>{q.points} pts</span>
        </div>
      </div>

      {/* MCQ options */}
      {isMcq && (q.options ?? []).length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {q.options.map(o => {
            const selected   = q.question_type === 'mcq_multi'
              ? (answer ?? []).includes(o.id) : answer === o.id
            const isCorrectOpt = submitted && !correct && o.id === correctOpt?.id
            const isWrongPick  = submitted && !correct && selected && o.id !== correctOpt?.id
            return (
              <div key={o.id} onClick={() => {
                if (submitted) return
                if (q.question_type === 'mcq_multi') {
                  const cur = answer ?? []
                  onAnswer(cur.includes(o.id) ? cur.filter(x => x !== o.id) : [...cur, o.id])
                } else { onAnswer(o.id) }
              }} style={{
                display:'flex', gap:10, padding:'9px 12px', borderRadius:8,
                background: isCorrectOpt ? 'rgba(20,201,168,0.1)'
                  : isWrongPick  ? 'rgba(240,82,74,0.08)'
                  : selected     ? 'var(--lab-opt-bg-selected)' : 'var(--lab-opt-bg)',
                border:`1px solid ${
                  isCorrectOpt ? 'rgba(20,201,168,0.5)'
                  : isWrongPick  ? 'rgba(240,82,74,0.4)'
                  : selected     ? 'var(--lab-opt-border-sel)' : 'var(--lab-opt-border)'}`,
                cursor: submitted ? 'default' : 'pointer', transition:'all .15s',
                position:'relative',
              }}>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, minWidth:18,
                  color: isCorrectOpt ? '#14C9A8' : isWrongPick ? 'var(--red)' : selected ? 'var(--cyan)' : 'var(--lab-opt-text-muted)' }}>
                  {o.text.charAt(0)}
                </span>
                <span style={{ fontSize:13, flex:1,
                  color: isCorrectOpt ? '#14C9A8' : isWrongPick ? 'var(--red)' : selected ? 'var(--text)' : 'var(--lab-opt-text)' }}>
                  {o.text.slice(3)}
                </span>
                {isCorrectOpt && <span style={{ fontSize:10, color:'#14C9A8', fontWeight:700, flexShrink:0 }}>← correct</span>}
                {isWrongPick  && <span style={{ fontSize:10, color:'var(--red)', fontWeight:700, flexShrink:0 }}>← your answer</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Matching question */}
      {q.question_type === 'matching' && (
        <MatchingBlock
          q={q}
          answer={answer}
          onAnswer={onAnswer}
          submitted={submitted}
          correct={correct}
        />
      )}
      {(q.question_type === 'text_input' || q.question_type === 'flag' || q.question_type === 'practical') && (
        <input value={answer ?? ''} onChange={e => !submitted && onAnswer(e.target.value)}
          placeholder={q.question_type === 'flag' ? 'FLAG{...}' : 'Your answer…'}
          disabled={submitted}
          style={{ width:'100%', fontFamily:'var(--mono)', fontSize:12, boxSizing:'border-box' }} />
      )}

      {/* Result feedback */}
      {submitted && (
        <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8,
          background: correct ? 'rgba(20,201,168,0.06)' : 'rgba(240,82,74,0.06)',
          border:`1px solid ${correct ? 'rgba(20,201,168,0.2)' : 'rgba(240,82,74,0.2)'}` }}>
          <div style={{ fontSize:12, color: correct ? '#14C9A8' : 'var(--red)', fontWeight:700, marginBottom: result?.explanation ? 4 : 0 }}>
            {correct ? `✓ Correct! +${result.points_awarded} pts` : '✗ Incorrect — the correct answer is highlighted above.'}
          </div>
          {result?.explanation && (
            <div style={{ fontSize:12, color:'var(--text-4)', lineHeight:1.6 }}>{result.explanation}</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Main Lab ────────────────────────────────────────────────────────── */
export default function RoomLab() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { theme, toggle } = useThemeCtx()
  const [room, setRoom] = useState(null)
  const [activeTaskIdx, setActiveTaskIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [vmState, setVmState] = useState({})
  const [logs, setLogs] = useState(['$ ready — start VMs when needed'])
  const logRef = useRef(null)

  // Reconciles local VM state with whatever the server last reported —
  // used both for the initial restore-on-load and on every heartbeat tick,
  // so a status change that happened server-side (auto-pause, another tab
  // resuming/stopping the VM, etc.) actually reaches the front instead of
  // only ever flowing one way.
  const syncFromEnv = useCallback((env, isInitialLoad) => {
    if (!env?.vms?.length) return
    setVmState(prev => {
      const next = { ...prev }
      let changed = false
      env.vms.forEach(v => {
        const tplId = v.vm_template.id
        const cur = next[tplId] ?? {}
        if (['running', 'paused', 'provisioning'].includes(v.status)) {
          if (cur.envVm?.status !== v.status || cur.env?.time_remaining_seconds !== env.time_remaining_seconds || isInitialLoad) {
            next[tplId] = {
              ...cur, env, envVm: { ...v, environment_id: env.id },
              starting: v.status === 'provisioning', stopping: false, pausing: false, resuming: false,
            }
            changed = true
          }
        } else if (cur.envVm && cur.envVm.status !== v.status) {
          next[tplId] = { ...cur, envVm: { ...cur.envVm, status: v.status } }
          changed = true
        }
      })
      return changed ? next : prev
    })
    if (isInitialLoad) setLogs(p => [...p, '$ restored VM(s) from your previous session'])
  }, [])

  // Reset all state and reload progress when user or room changes
  useEffect(() => {
    // Clear previous user's state immediately
    setRoom(null)
    setActiveTaskIdx(0)
    setAnswers({})
    setResults({})
    setVmState({})
    setLogs(['$ ready — start VMs when needed'])

    api.getRoom(slug).then(r => {
      setRoom(r)
      // Load saved answers for THIS user from backend
      api.getRoomAnswers(r.id).then(savedAnswers => {
        if (!savedAnswers?.length) return
        const restoredResults = {}
        const restoredAnswers = {}
        savedAnswers.forEach(a => {
          restoredResults[a.question_id] = {
            is_correct:     a.is_correct,
            points_awarded: a.points_awarded,
            message:        a.is_correct ? 'Correct!' : 'Incorrect',
          }
          if (a.submitted_value != null) {
            restoredAnswers[a.question_id] = a.submitted_value
          }
        })
        setResults(restoredResults)
        setAnswers(restoredAnswers)

        // Jump to first incomplete task
        const tasks = r.tasks ?? []
        const firstIncomplete = tasks.findIndex(t =>
          (t.questions ?? []).some(q => !restoredResults[q.id]?.is_correct)
        )
        if (firstIncomplete !== -1) setActiveTaskIdx(firstIncomplete)
      }).catch(() => {})

      // Restore any VM(s) already running/paused/still-cloning from a
      // previous visit — otherwise a reload shows blank "Start" buttons and
      // clicking Start again would clone a duplicate VM on top of the old
      // one (or, for one still mid-clone, on top of that in-flight one).
      api.getMyEnvironment(r.id).then(env => syncFromEnv(env, true)).catch(() => {})
    }).catch(() => {})
  }, [slug, user?.id, syncFromEnv])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

  // While this page is open, tell the backend we're still here. If the tab
  // is closed or the user navigates away, this interval stops and the
  // backend reaps the running VM(s) shortly after — instead of holding
  // Proxmox resources until the full room timer expires. The response also
  // carries the environment's real status, so an out-of-band change (e.g.
  // auto-pause, or another tab pausing/resuming) reaches this page too.
  useEffect(() => {
    if (!room?.id) return
    const ping = () => api.heartbeat(room.id).then(res => syncFromEnv(res?.env)).catch(() => {})
    ping()
    const id = setInterval(ping, 20000)
    return () => clearInterval(id)
  }, [room?.id, syncFromEnv])

  const [resetting, setResetting] = useState(false)

  const resetLab = async () => {
    if (!room) return
    if (!confirm('Reset all progress for this lab? All your answers will be deleted and you can start again.')) return
    setResetting(true)
    try {
      await api.resetRoomProgress(room.id)
      setAnswers({})
      setResults({})
      setActiveTaskIdx(0)
      setLogs(['$ lab reset — start fresh'])
    } catch (err) {
      alert('Reset failed: ' + err.message)
    } finally {
      setResetting(false)
    }
  }

  const addLog = useCallback((line) => setLogs(p => [...p, line]), [])

  const startVM = async (vmTpl) => {
    setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), starting:true } }))
    addLog(`$ provisioning ${vmTpl.name}…`)
    try {
      const env = await api.startSingleVM(room.id, vmTpl.id)
      const envVms = (env.vms ?? []).map(v => ({ ...v, environment_id: env.id }))
      const envVm = envVms.find(v => v.vm_template?.id === vmTpl.id || v.vm_template?.name === vmTpl.name)
      addLog(`$ ✓ ${vmTpl.name} running${envVm?.ip_address ? ' · ' + envVm.ip_address : ''}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { env, envVm, starting:false, stopping:false } }))
    } catch(err) {
      addLog(`$ [ERROR] ${err.message}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), starting:false } }))
    }
  }

  const stopVM = async (vmTpl) => {
    setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), stopping:true } }))
    addLog(`$ stopping ${vmTpl.name}…`)
    try {
      await api.stopVM(room.id, vmTpl.id)
      addLog(`$ ✓ ${vmTpl.name} stopped`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), envVm:{ ...p[vmTpl.id]?.envVm, status:'stopped' }, stopping:false } }))
    } catch(err) {
      addLog(`$ [ERROR] ${err.message}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), stopping:false } }))
    }
  }

  const pauseVM = async (vmTpl) => {
    setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), pausing:true } }))
    addLog(`$ pausing ${vmTpl.name}…`)
    try {
      const env = await api.pauseVM(room.id, vmTpl.id)
      addLog(`$ ✓ ${vmTpl.name} paused — timer frozen`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), env, envVm:{ ...p[vmTpl.id]?.envVm, status:'paused' }, pausing:false } }))
    } catch(err) {
      addLog(`$ [ERROR] ${err.message}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), pausing:false } }))
    }
  }

  const resumeVM = async (vmTpl) => {
    setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), resuming:true } }))
    addLog(`$ resuming ${vmTpl.name}…`)
    try {
      const env = await api.resumeVM(room.id, vmTpl.id)
      const envVms = (env.vms ?? []).map(v => ({ ...v, environment_id: env.id }))
      const envVm  = envVms.find(v => v.vm_template?.id === vmTpl.id || v.vm_template?.name === vmTpl.name)
      addLog(`$ ✓ ${vmTpl.name} resumed — timer restarted`)
      setVmState(p => ({ ...p, [vmTpl.id]: { env, envVm, pausing:false, resuming:false, starting:false, stopping:false } }))
    } catch(err) {
      addLog(`$ [ERROR] ${err.message}`)
      setVmState(p => ({ ...p, [vmTpl.id]: { ...(p[vmTpl.id]??{}), resuming:false } }))
    }
  }

  const submitAnswer = async (q) => {
    const val = answers[q.id]
    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return
    // For matching, val is an object {left_id: right_id} — send as data not value
    const isMatching = q.question_type === 'matching'
    if (isMatching && (typeof val !== 'object' || Object.keys(val).length === 0)) return
    try {
      const body = isMatching
        ? { value: null, data: { pairs: Object.entries(val).map(([left_id, right_id]) => ({ left_id, right_id })) } }
        : { value: val }
      const res = await fetch(`/api/progress/questions/${q.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body),
      }).then(r => r.json())
      setResults(p => ({ ...p, [q.id]: res }))
      addLog(res.is_correct ? `$ [✓] Q${q.sort_order+1} correct +${res.points_awarded} pts` : `$ [✗] Q${q.sort_order+1} incorrect`)
    } catch(err) {
      addLog(`$ [ERROR] ${err.message}`)
    }
  }

  if (!room) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{ANIM}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'2px solid var(--cyan)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 12px' }}/>
        <span style={{ color:'var(--text-4)', fontSize:13 }}>Loading lab…</span>
      </div>
    </div>
  )

  const tasks   = room.tasks ?? []
  const task    = tasks[activeTaskIdx]
  const vms     = room.vm_assignments ?? []
  const totalPts = tasks.reduce((s,t) => s + (t.points ?? 0), 0)
  const earnedPts = Object.entries(results).reduce((s,[,r]) => s + (r.is_correct ? (r.points_awarded ?? 0) : 0), 0)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <style>{ANIM}</style>

      {/* topbar */}
      <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', borderBottom:'1px solid var(--border)',
        background:'var(--surface)', backdropFilter:'blur(20px)',
        position:'sticky', top:0, zIndex:100,
        boxShadow:'0 1px 0 var(--border), 0 4px 20px rgba(0,0,0,0.4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to={`/rooms/${slug}`}
            style={{ fontSize:12, color:'var(--text-4)', display:'flex', alignItems:'center', gap:5,
              textDecoration:'none', transition:'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--cyan)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-4)'}>
            ← {room.title}
          </Link>
          <div style={{ width:1, height:16, background:'var(--border)' }}/>
          <span style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)' }}>
            {tasks.length} tasks · {room.estimated_minutes}m
          </span>
          {/* Live indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ position:'relative', width:8, height:8 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'var(--green)',
                animation:'glow-ping 1.8s ease-out infinite', opacity:0.5 }} />
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)',
                boxShadow:'0 0 6px var(--green)' }} />
            </div>
            <span style={{ fontSize:10, color:'var(--text-4)', fontFamily:'var(--mono)', letterSpacing:'.06em' }}>LIVE</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {/* Score */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:13, color:'var(--amber)' }}>
              {earnedPts}
            </span>
            <span style={{ fontSize:12, color:'var(--text-4)' }}>/ {totalPts} pts</span>
          </div>
          {/* Progress bar */}
          <div style={{ width:100, height:4, borderRadius:999, background:'var(--surface-3)', overflow:'hidden', position:'relative' }}>
            <div className="lab-progress-fill" style={{
              height:'100%', borderRadius:999,
              width:`${totalPts > 0 ? (earnedPts / totalPts) * 100 : 0}%`,
              transition:'width .5s cubic-bezier(.16,1,.3,1)',
            }}/>
          </div>
          {/* Reset */}
          <button onClick={resetLab} disabled={resetting}
            title="Reset all progress"
            style={{ padding:'5px 11px', borderRadius:7, fontSize:11, fontWeight:700,
              cursor: resetting ? 'wait' : 'pointer',
              background:'rgba(248,113,113,0.08)', color:'var(--red)',
              border:'1px solid rgba(248,113,113,0.2)',
              display:'flex', alignItems:'center', gap:4, opacity: resetting ? 0.6 : 1 }}>
            {resetting ? <><Spin size={10}/> Resetting…</> : '↺ Reset'}
          </button>

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ marginLeft: 4 }}
          >
            <div className="theme-toggle-thumb">
              <span className="theme-toggle-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
            </div>
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* task sidebar */}
        <div className="lab-task-sidebar" style={{ width:240, flexShrink:0, borderRight:'1px solid var(--border)',
          background:'var(--surface)', overflowY:'auto', padding:'16px 10px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
            color:'var(--text-4)', fontWeight:700, marginBottom:14, paddingLeft:4,
            display:'flex', alignItems:'center', gap:6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Tasks
          </div>
          {tasks.map((t, idx) => {
            const qs = t.questions ?? []
            const solved = qs.filter(q => results[q.id]?.is_correct).length
            const complete = qs.length > 0 && solved === qs.length
            const active = idx === activeTaskIdx
            return (
              <div key={t.id} onClick={() => setActiveTaskIdx(idx)}
                className="lab-task-item"
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px',
                  borderRadius:10, marginBottom:4, cursor:'pointer',
                  background: active ? 'rgba(34,211,238,0.07)' : 'transparent',
                  border:`1px solid ${active ? 'rgba(34,211,238,0.2)' : 'transparent'}`,
                  transition:'all .15s' }}>
                {/* step indicator */}
                <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:complete ? 12 : 11, fontWeight:800, fontFamily:'var(--mono)',
                  background: complete ? 'rgba(20,201,168,0.15)' : active ? 'rgba(34,211,238,0.1)' : 'var(--surface-2)',
                  color: complete ? '#14C9A8' : active ? 'var(--cyan)' : 'var(--text-4)',
                  border:`1px solid ${complete ? 'rgba(20,201,168,0.35)' : active ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                  boxShadow: complete ? '0 0 8px rgba(20,201,168,0.15)' : 'none',
                  transition:'all .2s' }}>
                  {complete ? '✓' : String(idx + 1).padStart(2, '0')}
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:12, fontWeight: active ? 700 : 500,
                    color: complete ? '#14C9A8' : active ? 'var(--text)' : 'var(--text-3)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    marginBottom:2 }}>
                    {t.title}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, color: complete ? 'rgba(20,201,168,0.7)' : 'var(--text-4)' }}>
                      {solved}/{qs.length}
                    </span>
                    {qs.length > 0 && (
                      <div style={{ flex:1, height:2, borderRadius:999, background:'var(--surface-3)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:999,
                          background: complete ? '#14C9A8' : 'var(--cyan)',
                          width:`${(solved / qs.length) * 100}%`, transition:'width .3s' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* main content */}
        {!task ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-4)' }}>
            Select a task
          </div>
        ) : (
          <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 320px' }}>

            {/* center — task + questions */}
            <div style={{ overflowY:'auto', padding:'22px 28px', borderRight:'1px solid var(--border)' }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>
                  Task {activeTaskIdx+1} of {tasks.length}
                </div>
                <h2 style={{ margin:'0 0 8px', fontSize:18, fontWeight:800 }}>{task.title}</h2>
                {task.description && (
                  <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.75, margin:'0 0 16px' }}>{task.description}</p>
                )}
                {task.objectives && (
                  <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
                    <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-4)', fontWeight:700, marginBottom:8 }}>Objectives</div>
                    {task.objectives.split(';').filter(Boolean).map((o,i) => (
                      <div key={i} style={{ display:'flex', gap:8, marginBottom:5 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--cyan)', marginTop:5, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:'var(--text-4)', lineHeight:1.6 }}>{o.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions */}
              {(task.questions ?? []).map((q, qi) => (
                <div key={q.id}>
                  <QuestionBlock
                    q={q} idx={qi}
                    answer={answers[q.id]}
                    onAnswer={val => setAnswers(p => ({ ...p, [q.id]: val }))}
                    submitted={!!results[q.id]}
                    result={results[q.id]}
                  />
                  {!results[q.id] && (
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:-8, marginBottom:16 }}>
                      <button className="btn-primary" style={{ padding:'8px 20px', fontSize:12 }}
                        onClick={() => submitAnswer(q)}>
                        Submit Answer
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Activity log */}
              <div style={{ marginTop:22 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-4)', fontWeight:700, marginBottom:8 }}>Activity log</div>
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
                    {['#F0524A','#F5A623','#22C55E'].map(c=><div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>)}
                    <span style={{ marginLeft:6, fontSize:10, color:'var(--text-4)', fontFamily:'var(--mono)' }}>lab</span>
                  </div>
                  <div ref={logRef} style={{ padding:'10px 14px', minHeight:80, maxHeight:150, overflowY:'auto',
                    fontFamily:'var(--mono)', fontSize:11, color:'#4ADE80', whiteSpace:'pre-wrap' }}>
                    {logs.map((l,i) => (
                      <div key={i} style={{ marginBottom:2, color:
                        l.includes('[ERROR]')?'var(--red)':
                        l.includes('[✓]')?'#14C9A8':
                        l.includes('[✗]')?'var(--red)':
                        l.startsWith('$')?'#00C2E6':'#4ADE80' }}>{l}</div>
                    ))}
                    <span style={{ animation:'blink 1s step-end infinite', color:'var(--text-4)' }}>█</span>
                  </div>
                </div>
              </div>
            </div>

            {/* right — VMs */}
            <div style={{ overflowY:'auto', padding:'20px 16px', background:'rgba(7,13,22,0.65)' }}>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em',
                color:'var(--text-4)', fontWeight:700, marginBottom:14 }}>
                Virtual Machines ({vms.length})
              </div>
              {vms.length === 0 && (
                <p style={{ color:'var(--text-4)', fontSize:12 }}>No VMs assigned to this room.</p>
              )}
              {vms.map(a => {
                const vm = a.vm_template
                const s = vmState[vm.id] ?? {}
                return (
                  <VMCard key={vm.id}
                    vmTemplate={vm}
                    env={s.env}
                    envVm={s.envVm}
                    onStart={() => startVM(vm)}
                    onStop={() => stopVM(vm)}
                    onPause={() => pauseVM(vm)}
                    onResume={() => resumeVM(vm)}
                    starting={s.starting === true}
                    stopping={s.stopping === true}
                    pausing={s.pausing === true}
                    resuming={s.resuming === true}
                  />
                )
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
