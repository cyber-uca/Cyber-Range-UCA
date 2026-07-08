import React, { useEffect, useState, useRef } from 'react'
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
    setNodes((prev) => [...prev, {
      node_id: `n${nodeCounter}`,
      vm_template_id: template.id,
      name: template.name,
      zone: template.zone,
      x, y,
      status: 'pending',
      ip: null,
    }])
  }

  const moveNode = (nodeId, x, y) => {
    setNodes((prev) => prev.map((n) => (n.node_id === nodeId ? { ...n, x, y } : n)))
  }

  const addLink = (sourceId, targetId) => {
    setLinks((prev) => [...prev, { source_node_id: sourceId, target_node_id: targetId }])
  }

  const startEnvironment = async () => {
    setStarting(true)
    setTerminalLines((prev) => [...prev, '$ provisioning environment on Proxmox…'])
    try {
      const topology = {
        nodes: nodes.map((n) => ({ node_id: n.node_id, vm_template_id: n.vm_template_id, x: n.x, y: n.y })),
        links,
      }
      const env = await api.startEnvironment(challengeId, topology)
      setEnvironment(env)
      // Reflect assigned IPs / running status back onto the canvas nodes
      setNodes((prev) => prev.map((n, i) => {
        const match = env.vms[i]
        return match ? { ...n, status: match.status, ip: match.ip_address } : n
      }))
      setTerminalLines((prev) => [...prev, `$ environment ${env.id.slice(0, 8)} is running (${env.vms.length} VMs)`])
    } catch (err) {
      setTerminalLines((prev) => [...prev, `$ error: ${err.message}`])
    } finally {
      setStarting(false)
    }
  }

  const resetEnvironment = async () => {
    if (!environment) return
    setTerminalLines((prev) => [...prev, '$ resetting environment…'])
    const env = await api.resetEnvironment(environment.id)
    setEnvironment(env)
    setNodes((prev) => prev.map((n, i) => {
      const match = env.vms[i]
      return match ? { ...n, status: match.status, ip: match.ip_address } : n
    }))
    setTerminalLines((prev) => [...prev, '$ environment reset complete'])
  }

  const revealHint = (hint) => {
    setRevealedHints((prev) => ({ ...prev, [hint.id]: true }))
  }

  const submitFlag = async () => {
    const result = await api.submitFlag(challengeId, flagValue)
    setFlagResult(result)
  }

  if (!challenge) return <div className="page">Loading…</div>

  return (
    <div className="workspace">
      {/* LEFT: Environment builder */}
      <div className="ws-panel">
        <div className="ws-panel-header">
          <h2>Environment Builder</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => navigate(`/challenges/${challengeId}`)}>← Exit</button>
            <button className="btn-primary" onClick={startEnvironment} disabled={starting || !!environment}>
              {starting ? 'Starting…' : environment ? 'Environment running' : 'Start Environment'}
            </button>
            <button className="btn-secondary" onClick={resetEnvironment} disabled={!environment}>Reset</button>
          </div>
        </div>
        <div className="canvas-area">
          <VMLibrary templates={templates} />
          <VMCanvas nodes={nodes} links={links} onAddNode={addNode} onMoveNode={moveNode} onAddLink={addLink} />
        </div>
      </div>

      {/* RIGHT: Challenge content */}
      <div className="ws-panel">
        <div className="ws-panel-header">
          <h2>{challenge.title}</h2>
          <span className={`category-tag tag-${challenge.category.color}`}>{challenge.category.name}</span>
        </div>
        <div className="ws-panel-body">
          <p>{challenge.description}</p>

          <h2 style={{ marginTop: 20 }}>Terminal</h2>
          <div className="terminal">
            {terminalLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>

          <h2 style={{ marginTop: 20 }}>Hints</h2>
          {hints.map((h) => (
            <div key={h.id} className="hint-item">
              {revealedHints[h.id] ? (
                <span>{h.content}</span>
              ) : (
                <button className="btn-secondary" onClick={() => revealHint(h)}>
                  Unlock hint <span className="cost">−{h.cost} pts</span>
                </button>
              )}
            </div>
          ))}
          {hints.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No hints for this challenge.</p>}

          <h2 style={{ marginTop: 20 }}>Submit flag</h2>
          <div className="flag-row">
            <input
              placeholder="FLAG{...}"
              value={flagValue}
              onChange={(e) => setFlagValue(e.target.value)}
            />
            <button className="btn-primary" onClick={submitFlag}>Submit</button>
          </div>
          {flagResult && (
            <p style={{ color: flagResult.is_correct ? 'var(--mitigation)' : 'var(--offensive)', marginTop: 10 }}>
              {flagResult.message} {flagResult.points_awarded > 0 && `(+${flagResult.points_awarded} pts)`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
