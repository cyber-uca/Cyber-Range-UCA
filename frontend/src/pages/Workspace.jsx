import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import VMLibrary from '../components/VMLibrary.jsx'
import VMCanvas from '../components/VMCanvas.jsx'

let nodeCounter = 0

export default function Workspace() {
  const { id: challengeId } = useParams()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [templates, setTemplates] = useState([])
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [environment, setEnvironment] = useState(null)
  const [starting, setStarting] = useState(false)
  const [hints, setHints] = useState([])
  const [revealedHints, setRevealedHints] = useState({})
  const [flagValue, setFlagValue] = useState('')
  const [flagResult, setFlagResult] = useState(null)
  const [terminalLines, setTerminalLines] = useState(['$ waiting for environment to start…'])

  useEffect(() => {
    api.getChallenge(challengeId).then(setChallenge)
    api.listVmTemplates().then(setTemplates)
    api.getHints(challengeId).then(setHints)
  }, [challengeId])

  const addNode = (template, x, y) => {
    nodeCounter += 1
    setNodes(prev => [...prev, { node_id: `n${nodeCounter}`, vm_template_id: template.id, name: template.name, zone: template.zone, x, y, status: 'pending', ip: null }])
  }
  const moveNode = (nodeId, x, y) => setNodes(prev => prev.map(n => n.node_id === nodeId ? { ...n, x, y } : n))
  const addLink = (sourceId, targetId) => setLinks(prev => [...prev, { source_node_id: sourceId, target_node_id: targetId }])

  const startEnvironment = async () => {
    setStarting(true)
    setTerminalLines(prev => [...prev, '$ provisioning environment on Proxmox…'])
    try {
      const topology = { nodes: nodes.map(n => ({ node_id: n.node_id, vm_template_id: n.vm_template_id, x: n.x, y: n.y })), links }
      const env = await api.startEnvironment(challengeId, topology)
      setEnvironment(env)
      setNodes(prev => prev.map((n, i) => { const m = env.vms[i]; return m ? { ...n, status: m.status, ip: m.ip_address } : n }))
      setTerminalLines(prev => [...prev, `$ environment ${env.id.slice(0, 8)} is running (${env.vms.length} VM${env.vms.length !== 1 ? 's' : ''})`])
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ [ERROR] ${err.message}`])
    } finally { setStarting(false) }
  }

  const resetEnvironment = async () => {
    if (!environment) return
    setTerminalLines(prev => [...prev, '$ resetting environment…'])
    try {
      const env = await api.resetEnvironment(environment.id)
      setEnvironment(env)
      setNodes(prev => prev.map((n, i) => { const m = env.vms[i]; return m ? { ...n, status: m.status, ip: m.ip_address } : n }))
      setTerminalLines(prev => [...prev, '$ environment reset complete'])
    } catch (err) { setTerminalLines(prev => [...prev, `$ [ERROR] ${err.message}`]) }
  }

  const submitFlag = async () => {
    try {
      const result = await api.submitFlag(challengeId, flagValue)
      setFlagResult(result)
      if (result.is_correct) setTerminalLines(prev => [...prev, `$ [✓] Flag accepted — +${result.points_awarded} XP`])
      else setTerminalLines(prev => [...prev, '$ [✗] Incorrect flag — try again'])
    } catch (err) { setFlagResult({ is_correct: false, message: err.message, points_awarded: 0 }) }
  }

  if (!challenge) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading lab…</span>
      </div>
    </div>
  )

  const envRunning = !!environment && environment.status === 'running'

  return (
    <div className="workspace" style={{ background: 'var(--bg)' }}>
      {/* ── LEFT: Environment builder ── */}
      <div className="ws-panel">
        <div className="ws-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {envRunning && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />}
            <h2>{envRunning ? 'Environment Running' : 'Environment Builder'}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => navigate(`/challenges/${challengeId}`)}>← Exit</button>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={startEnvironment} disabled={starting || !!environment}>
              {starting ? 'Starting…' : environment ? '✓ Running' : 'Start Environment'}
            </button>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={resetEnvironment} disabled={!environment}>Reset</button>
          </div>
        </div>
        <div className="canvas-area">
          <VMLibrary templates={templates} />
          <VMCanvas nodes={nodes} links={links} onAddNode={addNode} onMoveNode={moveNode} onAddLink={addLink} />
        </div>
      </div>

      {/* ── RIGHT: Challenge panel ── */}
      <div className="ws-panel" style={{ background: 'rgba(7,13,22,0.95)' }}>
        <div className="ws-panel-header">
          <h2 style={{ color: 'var(--text)', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{challenge.title}</h2>
          <span className={`category-tag tag-${challenge.category.color}`}>{challenge.category.name}</span>
        </div>
        <div className="ws-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Description */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>Description</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{challenge.description}</p>
          </div>

          {/* Terminal */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>Terminal</div>
            <div style={{ background: '#04070C', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: '#060B12' }}>
                {['#F0524A', '#F5A623', '#22C55E'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>lab — bash</span>
              </div>
              <div style={{ padding: '12px 16px', minHeight: 130, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#4ADE80', whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 180 }}>
                {terminalLines.map((l, i) => (
                  <div key={i} style={{ marginBottom: 2, color: l.startsWith('$ [ERROR]') ? 'var(--offensive)' : l.startsWith('$ [✓]') ? 'var(--success)' : l.startsWith('$ [✗]') ? 'var(--offensive)' : l.startsWith('$') ? '#00C2E6' : '#4ADE80' }}>{l}</div>
                ))}
                <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--text-dim)' }}>█</span>
                <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
              </div>
            </div>
          </div>

          {/* Hints */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>Hints ({hints.length})</div>
            {hints.map(h => (
              <div key={h.id} className="hint-item">
                {revealedHints[h.id]
                  ? <span style={{ color: 'var(--text)', lineHeight: 1.6 }}>{h.content}</span>
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Hint #{Object.keys(revealedHints).length + 1}</span>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setRevealedHints(p => ({ ...p, [h.id]: true }))}>
                        Unlock <span className="cost" style={{ color: 'var(--offensive)' }}>−{h.cost} pts</span>
                      </button>
                    </div>
                }
              </div>
            ))}
            {hints.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0 }}>No hints for this challenge.</p>}
          </div>

          {/* Flag submission */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>Submit flag</div>
            <div className="flag-row">
              <input placeholder="FLAG{...}" value={flagValue} onChange={e => setFlagValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitFlag()}
                style={{ fontFamily: 'var(--font-mono)' }} />
              <button className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 18px' }} onClick={submitFlag}>Submit</button>
            </div>
            {flagResult && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: flagResult.is_correct ? 'var(--mitigation-dim)' : 'var(--offensive-dim)',
                color: flagResult.is_correct ? 'var(--mitigation)' : 'var(--offensive)',
                border: `1px solid ${flagResult.is_correct ? 'rgba(20,201,168,0.3)' : 'rgba(240,82,74,0.3)'}`,
              }}>
                {flagResult.message}{flagResult.points_awarded > 0 && ` · +${flagResult.points_awarded} XP`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
