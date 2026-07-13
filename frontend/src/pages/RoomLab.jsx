import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

/* ─── helpers ────────────────────────────────────────────────────────────── */
const diffColor = { easy: 'var(--mitigation)', medium: 'var(--warning)', hard: 'var(--offensive)' }

const ANIM = `
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
`

/* ─── MCQ parser (same logic as ChallengeDetail) ────────────────────────── */
function parseDescription(text) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (/^Q\d+\.\s/.test(trimmed)) {
      const qNum = trimmed.match(/^(Q\d+)\./)[1]
      const qText = trimmed.replace(/^Q\d+\.\s*/, '')
      const options = []
      i++
      while (i < lines.length) {
        const m = lines[i].trim().match(/^([A-D])\)\s+(.+)/)
        if (m) { options.push({ letter: m[1], text: m[2] }); i++ } else break
      }
      blocks.push({ type: 'question', num: qNum, text: qText, options })
      continue
    }
    if (/^Submit\s+ANSWER_/i.test(trimmed) || /^Submit\s+FLAG\{/i.test(trimmed)) {
      blocks.push({ type: 'submit', text: trimmed }); i++; continue
    }
    if (/^\s+(Vehicle|OTA|Wazuh|Machine)/.test(line) && line.includes('—')) {
      if (blocks.length && blocks[blocks.length - 1].type === 'access')
        blocks[blocks.length - 1].lines.push(trimmed)
      else blocks.push({ type: 'access', lines: [trimmed] })
      i++; continue
    }
    if (/^\s+(update|battery|install|auth)\.log/.test(line)) {
      if (blocks.length && blocks[blocks.length - 1].type === 'files')
        blocks[blocks.length - 1].lines.push(trimmed)
      else blocks.push({ type: 'files', lines: [trimmed] })
      i++; continue
    }
    if (/^\s+(sudo|python3|journalctl|nano|cat|ssh)\s/.test(line)) {
      blocks.push({ type: 'command', text: trimmed }); i++; continue
    }
    if (trimmed.length > 0) {
      if (blocks.length && blocks[blocks.length - 1].type === 'prose')
        blocks[blocks.length - 1].text += '\n' + trimmed
      else blocks.push({ type: 'prose', text: trimmed })
    }
    i++
  }
  return blocks
}

/* ─── MCQ content renderer ───────────────────────────────────────────────── */
function TaskContent({ challenge }) {
  const blocks = parseDescription(challenge.description)
  const isMCQ = /Q\d+\.\s/.test(challenge.description)

  if (!isMCQ) return (
    <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.85, margin: 0 }}>
      {challenge.description}
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {blocks.map((block, idx) => {
        if (block.type === 'prose') return (
          <p key={idx} style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.85, margin: 0 }}>
            {block.text}
          </p>
        )
        if (block.type === 'command') return (
          <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
            background: '#04070C', border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 14px', color: '#00C2E6' }}>{block.text}</div>
        )
        if (block.type === 'access') return (
          <div key={idx} style={{ background: 'rgba(0,194,230,0.05)', border: '1px solid rgba(0,194,230,0.2)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>Lab Access</div>
            {block.lines.map((l, i) => {
              const parts = l.split('—').map(s => s.trim())
              return (
                <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '4px 0', borderBottom: i < block.lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600, minWidth: 120 }}>{parts[0]}</span>
                  {parts[1] && <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{parts[1]}</span>}
                </div>
              )
            })}
          </div>
        )
        if (block.type === 'files') return (
          <div key={idx} style={{ background: 'rgba(155,124,240,0.05)', border: '1px solid rgba(155,124,240,0.2)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--combined)', fontWeight: 700, marginBottom: 8 }}>Log Files</div>
            {block.lines.map((l, i) => {
              const parts = l.split('—').map(s => s.trim())
              return (
                <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '5px 0', borderBottom: i < block.lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--combined)', minWidth: 110, fontSize: 11 }}>{parts[0]}</span>
                  {parts[1] && <span style={{ color: 'var(--text-muted)' }}>{parts[1]}</span>}
                </div>
              )
            })}
          </div>
        )
        if (block.type === 'question') return (
          <div key={idx} style={{ background: 'rgba(13,24,38,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>{block.num}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{block.text}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {block.options.map(opt => (
                <div key={opt.letter} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(7,13,22,0.5)', border: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', minWidth: 20 }}>{opt.letter}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{opt.text}</span>
                </div>
              ))}
            </div>
          </div>
        )
        if (block.type === 'submit') return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(20,201,168,0.08)', border: '1px solid rgba(20,201,168,0.25)', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 16 }}>🏁</span>
            <span style={{ fontSize: 13, color: 'var(--mitigation)', fontWeight: 600 }}>{block.text}</span>
          </div>
        )
        return null
      })}
    </div>
  )
}

/* ─── VM status panel ───────────────────────────────────────────────────── */
function VMPanel({ vms, envVms, onStartVM, startingVm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vms.map(v => {
        const envVm = envVms.find(e => e.vm_template?.id === v.vm_template_id || e.vm_template?.name === v.vm_template.name)
        const isRunning = envVm?.status === 'running'
        const isStarting = startingVm === v.vm_template.id

        return (
          <div key={v.vm_template.id} style={{
            background: isRunning ? 'rgba(20,201,168,0.07)' : 'rgba(13,24,38,0.7)',
            border: `1px solid ${isRunning ? 'rgba(20,201,168,0.3)' : 'var(--border)'}`,
            borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(10px)',
            transition: 'all .2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: isRunning ? 'rgba(20,201,168,0.15)' : 'var(--accent-dim)',
                  border: `1px solid ${isRunning ? 'rgba(20,201,168,0.35)' : 'rgba(0,194,230,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={isRunning ? 'var(--mitigation)' : 'var(--accent)'} strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{v.vm_template.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {v.vm_template.zone}
                    {isRunning && envVm?.ip_address && (
                      <span style={{ color: 'var(--mitigation)', marginLeft: 8 }}>· {envVm.ip_address}</span>
                    )}
                  </div>
                </div>
              </div>

              {isRunning ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)',
                    boxShadow: '0 0 6px var(--success)', animation: 'pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, color: 'var(--mitigation)', fontWeight: 700 }}>RUNNING</span>
                </div>
              ) : (
                <button
                  onClick={() => onStartVM(v.vm_template)}
                  disabled={isStarting}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: isStarting ? 'wait' : 'pointer',
                    background: isStarting ? 'var(--surface-2)' : 'var(--accent)', color: isStarting ? 'var(--text-muted)' : 'var(--on-accent)',
                    border: 'none', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: isStarting ? 'none' : '0 0 12px rgba(0,194,230,0.3)',
                  }}>
                  {isStarting
                    ? <><div style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Starting…</>
                    : <>▶ Start {v.vm_template.name}</>
                  }
                </button>
              )}
            </div>

            {isRunning && v.vm_template.default_tools && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                Tools: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{v.vm_template.default_tools}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── main export ───────────────────────────────────────────────────────── */
export default function RoomLab() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  // per-challenge environment state: { [challengeId]: { env, envVms, logs, flagValue, flagResult, startingVm } }
  const [taskState, setTaskState] = useState({})

  useEffect(() => { api.getRoom(slug).then(setRoom).catch(() => {}) }, [slug])

  /* helpers to read/write per-task state */
  const ts = (id) => taskState[id] ?? { env: null, envVms: [], logs: ['$ ready — start VMs to begin'], flagValue: '', flagResult: null, startingVm: null }
  const setTs = (id, patch) => setTaskState(prev => ({ ...prev, [id]: { ...ts(id), ...patch } }))
  const addLog = (id, line) => setTs(id, { logs: [...ts(id).logs, line] })

  /* start a single VM for the active challenge */
  const startVM = useCallback(async (challenge, vmTemplate) => {
    const id = challenge.id
    setTs(id, { startingVm: vmTemplate.id })
    addLog(id, `$ starting ${vmTemplate.name} on Proxmox…`)

    try {
      // Build a single-node topology for this VM
      const topology = {
        nodes: [{ node_id: `n_${vmTemplate.id}`, vm_template_id: vmTemplate.id, x: 100, y: 150 }],
        links: [],
      }
      // If an env already exists for this challenge, we can't start twice — skip
      const existing = ts(id).env
      if (existing) {
        addLog(id, `$ environment already running (${existing.id.slice(0, 8)})`)
        setTs(id, { startingVm: null })
        return
      }
      const env = await api.startEnvironment(id, topology)
      const envVms = env.vms ?? []
      const started = envVms.find(v => v.vm_template?.name === vmTemplate.name)
      const ip = started?.ip_address ? ` · IP: ${started.ip_address}` : ''
      addLog(id, `$ ✓ ${vmTemplate.name} is running${ip}`)
      setTs(id, { env, envVms, startingVm: null })
    } catch (err) {
      addLog(id, `$ [ERROR] ${err.message}`)
      setTs(id, { startingVm: null })
    }
  }, [taskState])

  /* start ALL VMs for a challenge at once */
  const startAllVMs = useCallback(async (challenge) => {
    const id = challenge.id
    if (ts(id).env) { addLog(id, '$ environment already running'); return }
    addLog(id, '$ provisioning all VMs on Proxmox…')
    setTs(id, { startingVm: 'ALL' })
    try {
      const topology = {
        nodes: challenge.vms.map((v, i) => ({ node_id: `n_${i}`, vm_template_id: v.vm_template_id ?? v.vm_template?.id, x: 120 + i * 230, y: 160 })),
        links: [],
      }
      const env = await api.startEnvironment(id, topology)
      addLog(id, `$ environment ${env.id.slice(0, 8)} running — ${env.vms.length} VM(s) online`)
      setTs(id, { env, envVms: env.vms ?? [], startingVm: null })
    } catch (err) {
      addLog(id, `$ [ERROR] ${err.message}`)
      setTs(id, { startingVm: null })
    }
  }, [taskState])

  const submitFlag = async (challenge) => {
    const id = challenge.id
    const value = ts(id).flagValue
    try {
      const result = await api.submitFlag(id, value)
      setTs(id, { flagResult: result })
      if (result.is_correct) {
        addLog(id, `$ [✓] Flag accepted — +${result.points_awarded} XP`)
        // auto-advance to next task after short delay
        setTimeout(() => setActiveIdx(i => Math.min(i + 1, (room?.challenges?.length ?? 1) - 1)), 1200)
      } else {
        addLog(id, '$ [✗] Incorrect — try again')
      }
    } catch (err) {
      setTs(id, { flagResult: { is_correct: false, message: err.message, points_awarded: 0 } })
    }
  }

  if (!room) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{ANIM}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading lab…</span>
      </div>
    </div>
  )

  const tasks = room.challenges ?? []
  const activeTask = tasks[activeIdx]?.challenge
  const state = activeTask ? ts(activeTask.id) : null
  const lyr = api.LAB_LAYERS.find(l => l.slug === room.lab_layer)
  const totalXP = tasks.reduce((s, rc) => s + (rc.challenge?.points ?? 0), 0)
  const earnedXP = tasks.reduce((s, rc) => {
    const r = taskState[rc.challenge?.id]?.flagResult
    return s + (r?.is_correct ? (rc.challenge?.points ?? 0) : 0)
  }, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{ANIM}</style>

      {/* ── top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52,
        borderBottom: '1px solid var(--border)', background: 'rgba(13,24,38,0.95)', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={`/rooms/${slug}`} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            ← {room.title}
          </Link>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          {lyr && <span style={{ fontSize: 12, color: lyr.color, fontWeight: 700 }}>{lyr.icon} {lyr.label}</span>}
          <span className={`category-tag tag-${room.category?.color}`}>{room.category?.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontWeight: 700 }}>{earnedXP}</span>
            <span style={{ opacity: .5 }}> / {totalXP} XP</span>
          </div>
          {/* progress bar */}
          <div style={{ width: 100, height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'var(--accent)',
              width: `${totalXP > 0 ? (earnedXP / totalXP) * 100 : 0}%`, transition: 'width .4s ease' }} />
          </div>
        </div>
      </div>

      {/* ── body: sidebar + main ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── left: task sidebar ── */}
        <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)',
          background: 'rgba(13,24,38,0.9)', overflowY: 'auto', padding: '16px 12px' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 12, paddingLeft: 4 }}>
            Tasks — {tasks.length}
          </div>
          {tasks.map((rc, idx) => {
            const c = rc.challenge; if (!c) return null
            const solved = taskState[c.id]?.flagResult?.is_correct
            const active = idx === activeIdx
            return (
              <div key={c.id} onClick={() => setActiveIdx(idx)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 10, marginBottom: 4,
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(0,194,230,0.25)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all .15s' }}>
                {/* status icon */}
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)',
                  background: solved ? 'var(--mitigation-dim)' : active ? 'var(--accent-dim)' : 'var(--surface-2)',
                  color: solved ? 'var(--mitigation)' : active ? 'var(--accent)' : 'var(--text-dim)',
                  border: `1px solid ${solved ? 'rgba(20,201,168,0.3)' : active ? 'rgba(0,194,230,0.3)' : 'var(--border)'}` }}>
                  {solved ? '✓' : String(idx + 1).padStart(2, '0')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{c.points} XP</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── right: active task ── */}
        {activeTask ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* task header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)',
              background: 'rgba(13,24,38,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>
                  Task {activeIdx + 1} of {tasks.length}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{activeTask.title}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: diffColor[activeTask.difficulty?.slug] ?? 'var(--accent)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{activeTask.difficulty?.name}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--warning)' }}>{activeTask.points} XP</span>
              </div>
            </div>

            {/* two-column body */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 340px' }}>

              {/* task content + flag */}
              <div style={{ overflowY: 'auto', padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <TaskContent challenge={activeTask} />

                {/* objectives */}
                {activeTask.objectives && (
                  <div style={{ marginTop: 20, background: 'rgba(13,24,38,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 10 }}>Learning objectives</div>
                    {activeTask.objectives.split(';').map((o, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{o.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* terminal log */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 8 }}>Activity log</div>
                  <div style={{ background: '#04070C', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderBottom: '1px solid var(--border)', background: '#060B12' }}>
                      {['#F0524A','#F5A623','#22C55E'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>lab — activity</span>
                    </div>
                    <div style={{ padding: '10px 14px', minHeight: 90, maxHeight: 160, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4ADE80', whiteSpace: 'pre-wrap' }}>
                      {state.logs.map((l, i) => (
                        <div key={i} style={{ marginBottom: 2, color: l.includes('[ERROR]') ? 'var(--offensive)' : l.includes('[✓]') ? 'var(--success)' : l.includes('[✗]') ? 'var(--offensive)' : l.startsWith('$') ? '#00C2E6' : '#4ADE80' }}>{l}</div>
                      ))}
                      <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--text-dim)' }}>█</span>
                    </div>
                  </div>
                </div>

                {/* flag submit */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 8 }}>Submit answer</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={state.flagValue} onChange={e => setTs(activeTask.id, { flagValue: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && submitFlag(activeTask)}
                      placeholder="ANSWER_B_C or FLAG{...}"
                      style={{ fontFamily: 'var(--font-mono)', flex: 1 }} />
                    <button className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 18px' }}
                      onClick={() => submitFlag(activeTask)}>Submit</button>
                  </div>
                  {state.flagResult && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                      background: state.flagResult.is_correct ? 'var(--mitigation-dim)' : 'var(--offensive-dim)',
                      color: state.flagResult.is_correct ? 'var(--mitigation)' : 'var(--offensive)',
                      border: `1px solid ${state.flagResult.is_correct ? 'rgba(20,201,168,0.3)' : 'rgba(240,82,74,0.3)'}` }}>
                      {state.flagResult.is_correct ? '✓ Correct!' : '✗ ' + state.flagResult.message}
                      {state.flagResult.points_awarded > 0 && ` · +${state.flagResult.points_awarded} XP`}
                    </div>
                  )}
                </div>
              </div>

              {/* VM panel */}
              <div style={{ overflowY: 'auto', padding: '20px 18px', background: 'rgba(7,13,22,0.6)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 12 }}>
                  Virtual Machines — {activeTask.vms?.length ?? 0}
                </div>

                {/* start all button */}
                {(activeTask.vms?.length ?? 0) > 1 && !state.env && (
                  <button onClick={() => startAllVMs(activeTask)}
                    disabled={state.startingVm === 'ALL'}
                    className="btn-primary"
                    style={{ width: '100%', marginBottom: 12, padding: '10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {state.startingVm === 'ALL'
                      ? <><div style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Starting all…</>
                      : '▶ Start all VMs'}
                  </button>
                )}

                <VMPanel
                  vms={activeTask.vms ?? []}
                  envVms={state.envVms}
                  onStartVM={(tpl) => startVM(activeTask, tpl)}
                  startingVm={state.startingVm}
                />

                {/* hints */}
                {activeTask.hints && activeTask.hints.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', fontWeight: 700, marginBottom: 10 }}>Hints</div>
                    <HintPanel challengeId={activeTask.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a task from the sidebar
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── lazy hint loader ───────────────────────────────────────────────────── */
function HintPanel({ challengeId }) {
  const [hints, setHints] = useState([])
  const [revealed, setRevealed] = useState({})
  useEffect(() => { api.getHints(challengeId).then(setHints).catch(() => {}) }, [challengeId])
  if (!hints.length) return null
  return hints.map(h => (
    <div key={h.id} className="hint-item" style={{ marginBottom: 8 }}>
      {revealed[h.id]
        ? <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{h.content}</span>
        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hint #{h.order + 1}</span>
            <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}
              onClick={() => setRevealed(p => ({ ...p, [h.id]: true }))}>
              Unlock {h.cost > 0 && <span style={{ color: 'var(--offensive)', marginLeft: 4 }}>−{h.cost} pts</span>}
            </button>
          </div>
      }
    </div>
  ))
}
