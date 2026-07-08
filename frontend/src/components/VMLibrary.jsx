import React from 'react'

export default function VMLibrary({ templates }) {
  const onDragStart = (e, template) => {
    e.dataTransfer.setData('application/json', JSON.stringify(template))
  }

  return (
    <div className="vm-library">
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
        VM Library
      </div>
      {templates.map((t) => (
        <div
          key={t.id}
          className="vm-library-item"
          draggable
          onDragStart={(e) => onDragStart(e, t)}
          title={t.description}
        >
          <div>{t.name}</div>
          <div className="zone">{t.zone}</div>
        </div>
      ))}
      {templates.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No VM templates.</div>}
    </div>
  )
}
