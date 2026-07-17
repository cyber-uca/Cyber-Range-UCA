import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'

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
function VMCard({ vmTemplate, envVm, env, onStart, onStop, starting, stopping }) {
  const running = envVm?.status === 'running'
  const ip = envVm?.ip_address
  const secsLeft = useCountdown(running && env?.expires_at_iso ? env.expires_at_iso : null)
  const urgent = secsLeft !== null && secsLeft < 300
  const warn   = secsLeft !== null && secsLeft < 900
  const [consoleUrl, setConsoleUrl] = useState(null)
  const [loadingConsole, setLoadingConsole] = useState(false)

  const openConsole = async () => {
    // Always fetch a fresh ticket — VNC tickets expire in ~2 min
    if (!envVm?.id) return
    setLoadingConsole(true)
    try {
      const data = await api.getConsoleUrl(envVm.environment_id, envVm.id)
      window.open(data.console_url, '_blank', 'width=1200,height=800')
    } catch {
      if (envVm.proxmox_vmid && envVm.proxmox_node) {
        window.open(`https://192.168.37.20:8006/?console=kvm&novnc=1&vmid=${envVm.proxmox_vmid}&node=${envVm.proxmox_node}`, '_blank')
      }
    } finally { setLoadingConsole(false) }
  }

  return (
    <div style={{
      background: running ? 'rgba(20,201,168,0.07)' : 'rgba(13,24,38,0.75)',
      border:`1px solid ${running ? (urgent ? 'rgba(240,82,74,0.5)' : 'rgba(20,201,168,0.35)') : 'var(--border)'}`,
      borderRadius:12, padding:'14px 16px', transition:'all .2s', marginBottom:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            background: running ? 'rgba(20,201,168,0.15)' : 'rgba(0,194,230,0.08)',
            border:`1px solid ${running ? 'rgba(20,201,168,0.35)' : 'rgba(0,194,230,0.2)'}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={running ? '#14C9A8' : '#00C2E6'} strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>{vmTemplate.name}</div>
            <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)', marginTop:2 }}>
              {vmTemplate.zone}
              {running && ip && <span style={{ color:'#14C9A8', marginLeft:8 }}>· {ip}</span>}
            </div>
          </div>
        </div>
        {running ? (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#14C9A8', boxShadow:'0 0 6px #14C9A8', animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:11, color:'#14C9A8', fontWeight:700 }}>RUNNING</span>
          </div>
        ) : (
          <button onClick={onStart} disabled={starting}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700,
              cursor:starting?'wait':'pointer',
              background:starting?'var(--surface-2)':'var(--cyan)',
              color:starting?'var(--text-4)':'#000',
              border:'none', display:'flex', alignItems:'center', gap:6 }}>
            {starting ? <><Spin /> Starting…</> : <>▶ Start</>}
          </button>
        )}
      </div>
      {running && (
        <div style={{ marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          {secsLeft !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:6,
              background:urgent?'rgba(240,82,74,0.1)':warn?'rgba(245,166,35,0.1)':'rgba(13,24,38,0.5)',
              border:`1px solid ${urgent?'rgba(240,82,74,0.3)':warn?'rgba(245,166,35,0.3)':'var(--border)'}`,
              borderRadius:8, padding:'5px 12px' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                color:urgent?'var(--red)':warn?'var(--amber)':'var(--text-4)' }}>
                {fmt(secsLeft)}
              </span>
            </div>
          )}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={openConsole} disabled={loadingConsole}
              style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer',
                background:'rgba(0,194,230,0.08)', color:'var(--cyan)',
                border:'1px solid rgba(0,194,230,0.35)', display:'flex', alignItems:'center', gap:5 }}>
              {loadingConsole ? <><Spin size={10}/> …</> : <>🖥 Console</>}
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

/* ─── Question renderer ───────────────────────────────────────────────── */
function QuestionBlock({ q, idx, answer, onAnswer, submitted, result }) {
  const isMcq = q.question_type === 'mcq_single' || q.question_type === 'mcq_multi'
  const correct = result?.is_correct
  const border = !submitted ? 'var(--border)' : correct ? 'rgba(20,201,168,0.5)' : 'rgba(240,82,74,0.4)'
  const bg     = !submitted ? 'rgba(13,24,38,0.6)' : correct ? 'rgba(20,201,168,0.06)' : 'rgba(240,82,74,0.05)'

  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderLeft:`3px solid ${submitted ? (correct?'#14C9A8':'var(--red)') : 'var(--cyan)'}`,
      borderRadius:12, padding:'16px 18px', marginBottom:14 }}>
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

      {isMcq && (q.options ?? []).length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {q.options.map(o => {
            const selected = q.question_type === 'mcq_multi'
              ? (answer ?? []).includes(o.id)
              : answer === o.id
            return (
              <div key={o.id} onClick={() => {
                if (submitted) return
                if (q.question_type === 'mcq_multi') {
                  const cur = answer ?? []
                  onAnswer(cur.includes(o.id) ? cur.filter(x => x !== o.id) : [...cur, o.id])
                } else {
                  onAnswer(o.id)
                }
              }} style={{
                display:'flex', gap:10, padding:'9px 12px', borderRadius:8,
                background: selected ? 'rgba(0,194,230,0.1)' : 'rgba(7,13,22,0.5)',
                border:`1px solid ${selected ? 'rgba(0,194,230,0.4)' : 'var(--border)'}`,
                cursor: submitted ? 'default' : 'pointer', transition:'all .15s',
              }}>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12,
                  color: selected ? 'var(--cyan)' : 'var(--text-4)', minWidth:18 }}>
                  {o.text.charAt(0)}
                </span>
                <span style={{ fontSize:13, color: selected ? 'var(--text)' : 'var(--text-4)' }}>
                  {o.text.slice(3)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {(q.question_type === 'text_input' || q.question_type === 'flag' || q.question_type === 'practical') && (
        <input
          value={answer ?? ''}
          onChange={e => !submitted && onAnswer(e.target.value)}
          placeholder={q.question_type === 'flag' ? 'FLAG{...}' : 'Your answer…'}
          disabled={submitted}
          style={{ width:'100%', fontFamily:'var(--mono)', fontSize:12, boxSizing:'border-box' }}
        />
      )}

      {submitted && (
        <div style={{ marginTop:10, fontSize:12,
          color: correct ? '#14C9A8' : 'var(--red)', fontWeight:600 }}>
          {correct ? `✓ Correct! +${result.points_awarded} pts` : `✗ Incorrect`}
          {q.explanation && <span style={{ color:'var(--text-4)', fontWeight:400, marginLeft:8 }}>{q.explanation}</span>}
        </div>
      )}
    </div>
  )
}

/* ─── Main Lab ────────────────────────────────────────────────────────── */
export default function RoomLab() {
  const { slug } = useParams()
  const [room, setRoom] = useState(null)
  const [activeTaskIdx, setActiveTaskIdx] = useState(0)
  const [answers, setAnswers] = useState({})       // questionId → answer value
  const [results, setResults] = useState({})       // questionId → result
  const [vmState, setVmState] = useState({})       // vmTemplateId → { env, envVm, starting, stopping }
  const [logs, setLogs] = useState(['$ ready — start VMs when needed'])
  const logRef = useRef(null)

  // Load room then restore previous progress
  useEffect(() => {
    api.getRoom(slug).then(r => {
      setRoom(r)
      // Load saved answers from backend
      api.getRoomAnswers(r.id).then(savedAnswers => {
        if (!savedAnswers?.length) return
        const restoredResults = {}
        const restoredAnswers = {}
        savedAnswers.forEach(a => {
          // Restore the result (so question shows as submitted)
          restoredResults[a.question_id] = {
            is_correct:     a.is_correct,
            points_awarded: a.points_awarded,
            message:        a.is_correct ? 'Correct!' : 'Incorrect',
          }
          // Restore the answer value so it shows in the input
          if (a.submitted_value != null) {
            restoredAnswers[a.question_id] = a.submitted_value
          }
        })
        setResults(restoredResults)
        setAnswers(prev => ({ ...prev, ...restoredAnswers }))

        // Restore active task — jump to first incomplete task
        const tasks = r.tasks ?? []
        const firstIncomplete = tasks.findIndex(t =>
          (t.questions ?? []).some(q => !restoredResults[q.id]?.is_correct)
        )
        if (firstIncomplete !== -1) setActiveTaskIdx(firstIncomplete)
      }).catch(() => {}) // silently ignore if no progress yet
    }).catch(() => {})
  }, [slug])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

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

  const submitAnswer = async (q) => {
    const val = answers[q.id]
    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return
    try {
      const res = await api.submitAnswer(q.id, val)
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
      <div style={{ height:50, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', borderBottom:'1px solid var(--border)',
        background:'rgba(13,24,38,0.97)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to={`/rooms/${slug}`} style={{ fontSize:12, color:'var(--text-4)' }}>← {room.title}</Link>
          <div style={{ width:1, height:16, background:'var(--border)' }}/>
          <span style={{ fontSize:12, color:'var(--text-4)' }}>{tasks.length} tasks · {room.estimated_minutes} min</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:12, color:'var(--text-4)' }}>
            <span style={{ fontFamily:'var(--mono)', color:'var(--amber)', fontWeight:700 }}>{earnedPts}</span>
            {' / '}{totalPts} pts
          </span>
          <div style={{ width:90, height:4, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, background:'var(--cyan)',
              width:`${totalPts>0?(earnedPts/totalPts)*100:0}%`, transition:'width .4s' }}/>
          </div>
          <button onClick={resetLab} disabled={resetting}
            title="Reset all progress and start the lab again"
            style={{
              padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700,
              cursor: resetting ? 'wait' : 'pointer',
              background:'rgba(240,82,74,0.08)',
              color:'var(--red)',
              border:'1px solid rgba(240,82,74,0.3)',
              display:'flex', alignItems:'center', gap:5,
              opacity: resetting ? 0.6 : 1,
            }}>
            {resetting ? <><Spin size={10}/> Resetting…</> : <>↺ Reset Lab</>}
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* task sidebar */}
        <div style={{ width:240, flexShrink:0, borderRight:'1px solid var(--border)',
          background:'rgba(10,18,30,0.97)', overflowY:'auto', padding:'14px 10px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
            color:'var(--text-4)', fontWeight:700, marginBottom:12, paddingLeft:4 }}>
            Tasks ({tasks.length})
          </div>
          {tasks.map((t, idx) => {
            const qs = t.questions ?? []
            const solved = qs.filter(q => results[q.id]?.is_correct).length
            const active = idx === activeTaskIdx
            return (
              <div key={t.id} onClick={() => setActiveTaskIdx(idx)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px',
                  borderRadius:10, marginBottom:4, cursor:'pointer',
                  background: active ? 'rgba(0,194,230,0.08)' : 'transparent',
                  border:`1px solid ${active ? 'rgba(0,194,230,0.25)' : 'transparent'}`,
                  transition:'all .15s' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800, fontFamily:'var(--mono)',
                  background: solved===qs.length&&qs.length>0 ? 'rgba(20,201,168,0.15)' : active ? 'rgba(0,194,230,0.1)' : 'var(--surface-2)',
                  color: solved===qs.length&&qs.length>0 ? '#14C9A8' : active ? 'var(--cyan)' : 'var(--text-4)',
                  border:`1px solid ${solved===qs.length&&qs.length>0 ? 'rgba(20,201,168,0.3)' : active ? 'rgba(0,194,230,0.3)' : 'var(--border)'}` }}>
                  {solved===qs.length&&qs.length>0 ? '✓' : String(idx+1).padStart(2,'0')}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:active?700:500,
                    color:active?'var(--text)':'var(--text-4)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-4)', marginTop:1 }}>
                    {solved}/{qs.length} questions · {t.points} pts
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
                  <div style={{ background:'rgba(13,24,38,0.55)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
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
                <div style={{ background:'#04070C', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderBottom:'1px solid var(--border)', background:'#060B12' }}>
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
                    starting={s.starting === true}
                    stopping={s.stopping === true}
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
