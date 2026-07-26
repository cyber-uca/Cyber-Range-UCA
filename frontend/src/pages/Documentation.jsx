import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App.jsx'

import gettingStarted from '../docs/01-getting-started.md?raw'
import platformGuide  from '../docs/02-platform-guide.md?raw'
import icsConcepts    from '../docs/03-ics-concepts.md?raw'
import toolsRef       from '../docs/04-tools-reference.md?raw'
import attackTech     from '../docs/05-attack-techniques.md?raw'
import riskCompliance from '../docs/06-risk-compliance.md?raw'
import adminGuide     from '../docs/07-admin-guide.md?raw'

const ALL_SECTIONS = [
  { id: 'getting-started',   label: 'Getting Started',   content: gettingStarted,  adminOnly: false },
  { id: 'platform-guide',    label: 'Platform Guide',    content: platformGuide,   adminOnly: false },
  { id: 'ics-concepts',      label: 'ICS / OT Concepts', content: icsConcepts,     adminOnly: false },
  { id: 'tools-reference',   label: 'Tools Reference',   content: toolsRef,        adminOnly: false },
  { id: 'attack-techniques', label: 'Attack Techniques', content: attackTech,      adminOnly: false },
  { id: 'risk-compliance',   label: 'Risk & Compliance', content: riskCompliance,  adminOnly: false },
  { id: 'admin-guide',       label: 'Admin Guide',       content: adminGuide,      adminOnly: true  },
]

function readingTime(text) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200)) + ' min read'
}

// ── Inline markdown renderer ───────────────────────────────────────────────
function renderMarkdown(raw) {
  const lines = raw.split('\n')
  const out = []
  let i = 0, key = 0
  const k = () => key++

  function inline(text) {
    const parts = []
    const re = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
    let last = 0, m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      const t = m[0]
      if (t.startsWith('`'))
        parts.push(<code key={k()} className="doc-ic">{t.slice(1, -1)}</code>)
      else if (t.startsWith('**'))
        parts.push(<strong key={k()}>{t.slice(2, -2)}</strong>)
      else {
        const lm = t.match(/\[([^\]]+)\]\(([^)]+)\)/)
        if (lm) parts.push(<a key={k()} href={lm[2]} target="_blank" rel="noopener noreferrer">{lm[1]}</a>)
      }
      last = m.index + t.length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
  }

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i++; continue }

    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={k()} className="doc-hr" />)
      i++; continue
    }

    if (line.startsWith('# '))   { out.push(<h1 key={k()} className="doc-h1">{inline(line.slice(2))}</h1>);  i++; continue }
    if (line.startsWith('## '))  { out.push(<h2 key={k()} className="doc-h2">{inline(line.slice(3))}</h2>);  i++; continue }
    if (line.startsWith('### ')) { out.push(<h3 key={k()} className="doc-h3">{inline(line.slice(4))}</h3>);  i++; continue }

    if (line.startsWith('> ')) {
      out.push(<div key={k()} className="doc-callout">{inline(line.slice(2))}</div>)
      i++; continue
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      out.push(
        <div key={k()} className="doc-code">
          {lang && <div className="doc-code-bar">{lang}</div>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      )
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      out.push(
        <div key={k()} className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr>{headers.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^[-*] /.test(line)) {
      const items = []
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, '')); i++ }
      out.push(<ul key={k()} className="doc-ul">{items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>)
      continue
    }

    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      out.push(<ol key={k()} className="doc-ol">{items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ol>)
      continue
    }

    const paraLines = []
    while (
      i < lines.length && lines[i].trim() &&
      !lines[i].startsWith('#') && !lines[i].startsWith('```') &&
      !lines[i].startsWith('---') && !lines[i].startsWith('> ') &&
      !/^[-*] /.test(lines[i]) && !/^\d+\. /.test(lines[i]) &&
      !lines[i].includes('|')
    ) { paraLines.push(lines[i]); i++ }

    if (paraLines.length) out.push(<p key={k()} className="doc-p">{inline(paraLines.join(' '))}</p>)
  }
  return out
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Documentation() {
  const { user } = useAuth()
  const isPrivileged = user?.role === 'admin' || user?.role === 'tutor'
  const sections = ALL_SECTIONS.filter(s => !s.adminOnly || isPrivileged)

  const [activeId, setActiveId] = useState(sections[0].id)
  const contentRef = useRef(null)
  const tabsRef = useRef(null)
  const active = sections.find(s => s.id === activeId) || sections[0]

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [activeId])

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector('.doc-tab.active')
      if (activeTab) activeTab.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [activeId])

  return (
    <div className="doc-page">

      {/* ── Tab bar ── */}
      <div className="doc-tabs-wrap" ref={tabsRef}>
        <div className="doc-tabs">
          {sections.map(s => (
            <button
              key={s.id}
              className={`doc-tab${activeId === s.id ? ' active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              {s.label}
              {s.adminOnly && <span className="doc-tab-admin">Admin</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="doc-scroll" ref={contentRef}>
        <div className="doc-body">
          <div className="doc-reading-time">{readingTime(active.content)}</div>
          {renderMarkdown(active.content)}
        </div>
      </div>

    </div>
  )
}
