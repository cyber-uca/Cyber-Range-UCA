import React, { useRef, useState } from 'react'

/**
 * Nodes: [{ node_id, vm_template_id, name, zone, x, y, status, ip }]
 * Links: [{ source_node_id, target_node_id }]
 *
 * Drag VM templates in from the library to drop them; click two nodes in
 * sequence to draw a network link between them (linking mode toggled by
 * the "Connect" button).
 */
export default function VMCanvas({ nodes, links, onAddNode, onMoveNode, onAddLink }) {
  const canvasRef = useRef(null)
  const [linking, setLinking] = useState(false)
  const [linkSource, setLinkSource] = useState(null)
  const [draggingId, setDraggingId] = useState(null)

  const onDrop = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) return
    const template = JSON.parse(raw)
    const rect = canvasRef.current.getBoundingClientRect()
    onAddNode(template, e.clientX - rect.left - 65, e.clientY - rect.top - 30)
  }

  const onNodeMouseDown = (nodeId, e) => {
    if (linking) {
      if (!linkSource) {
        setLinkSource(nodeId)
      } else if (linkSource !== nodeId) {
        onAddLink(linkSource, nodeId)
        setLinkSource(null)
      }
      return
    }
    setDraggingId(nodeId)
  }

  const onCanvasMouseMove = (e) => {
    if (!draggingId) return
    const rect = canvasRef.current.getBoundingClientRect()
    onMoveNode(draggingId, e.clientX - rect.left - 65, e.clientY - rect.top - 30)
  }

  const onCanvasMouseUp = () => setDraggingId(null)

  const nodeById = (id) => nodes.find((n) => n.node_id === id)

  return (
    <div
      className="canvas"
      ref={canvasRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseUp}
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {links.map((l, i) => {
          const a = nodeById(l.source_node_id)
          const b = nodeById(l.target_node_id)
          if (!a || !b) return null
          return (
            <line
              key={i}
              x1={a.x + 65} y1={a.y + 30}
              x2={b.x + 65} y2={b.y + 30}
              stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3"
            />
          )
        })}
      </svg>

      {nodes.map((n) => (
        <div
          key={n.node_id}
          className="canvas-node"
          style={{
            left: n.x, top: n.y,
            borderColor: linkSource === n.node_id ? 'var(--offensive)' : 'var(--accent)',
          }}
          onMouseDown={(e) => onNodeMouseDown(n.node_id, e)}
        >
          <div className="node-title">
            <span className={`status-dot status-${n.status === 'running' ? 'running' : 'pending'}`} />
            {n.name}
          </div>
          <div className="node-ip">{n.zone}</div>
          {n.ip && <div className="node-ip">{n.ip}</div>}
        </div>
      ))}

      {nodes.length === 0 && (
        <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          Drag VMs from the library on the left onto this canvas to build your environment topology.
        </div>
      )}

      <div className="canvas-toolbar">
        <button
          className={linking ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setLinking(!linking); setLinkSource(null) }}
        >
          {linking ? 'Click two VMs to link…' : 'Connect VMs'}
        </button>
      </div>
    </div>
  )
}
