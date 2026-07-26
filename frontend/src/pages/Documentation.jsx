import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App.jsx'

// ── Markdown imports ──────────────────────────────────────────────────────
import gettingStarted  from '../docs/01-getting-started.md?raw'
import platformGuide   from '../docs/02-platform-guide.md?raw'
import icsConcepts     from '../docs/03-ics-concepts.md?raw'
import toolsRef        from '../docs/04-tools-reference.md?raw'
import attackTech      from '../docs/05-attack-techniques.md?raw'
import riskCompliance  from '../docs/06-risk-compliance.md?raw'
import adminGuide      from '../docs/07-admin-guide.md?raw'

// ── Nav definition ────────────────────────────────────────────────────────
const ALL_SECTIONS = [
  { id: 'getting-started', label: 'Getting Started',    icon: '🚀', content: gettingStarted,  adminOnly: false },
  { id: 'platform-guide',  label: 'Platform Guide',     icon: '🗺️', content: platformGuide,   adminOnly: false },
  { id: 'ics-concepts',    label: 'ICS / OT Concepts',  icon: '⚙️', content: icsConcepts,     adminOnly: false },
  { id: 'tools-reference', label: 'Tools Reference',    icon: '🛠️', content: toolsRef,        adminOnly: false },
  { id: 'attack-techniques', label: 'Attack Techniques',icon: '⚔️', content: attackTech,      adminOnly: false },
  { id: 'risk-compliance', label: 'Risk & Compliance',  icon: '📋', content: riskCompliance,  adminOnly: false },
  { id: 'admin-guide',     label: 'Admin Guide',        icon: '🔧', content: adminGuide,      adminOnly: true  },
]

// ── Lightweight markdown renderer ─────────────────────────────────────────
function renderMarkdown(raw) {
  const lines = raw.split('\n')
  const elements = []
  let i = 0
  let key = 0

  const nextKey = () => key++

  // Inline: bold, inline code, links
  function inlineRender(text) {
    // Split on **bold**, `code`, and [text](url)
    const parts = []
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
    let last = 0
    let m
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      const t = m[0]
      if (t.startsWith('`')) {
        parts.push(<code key={nextKey()} className="doc-inline-code">{t.slice(1, -1)}</code>)
      } else if (t.startsWith('**')) {
        parts.push(<strong key={nextKey()}>{t.slice(2, -2)}</strong>)
      } else {
        const linkMatch = t.match(/\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
          parts.push(<a key={nextKey()} href={linkMatch[2]} target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>)
        }
      }
      last = m.index + t.length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // ── Blank line
    if (line.trim() === '') { i++; continue }

    // ── HR
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={nextKey()} className="doc-hr" />)
      i++; continue
    }

    // ── Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={nextKey()} className="doc-h1">{inlineRender(line.slice(2))}</h1>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={nextKey()} className="doc-h2">{inlineRender(line.slice(3))}</h2>)
      i++; continue
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={nextKey()} className="doc-h3">{inlineRender(line.slice(4))}</h3>)
      i++; continue
    }

    // ── Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={nextKey()} className="doc-blockquote">
          {inlineRender(line.slice(2))}
        </blockquote>
      )
      i++; continue
    }

    // ── Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <div key={nextKey()} className="doc-code-block">
          {lang && <span className="doc-code-lang">{lang}</span>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      )
      continue
    }

    // ── Table (line contains | and next line is separator)
    if (line.includes('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean)
      i += 2 // skip header + separator
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={nextKey()} className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>{headerCells.map((c, j) => <th key={j}>{inlineRender(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>{row.map((c, ci) => <td key={ci}>{inlineRender(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // ── Unordered list
    if (/^[-*] /.test(line)) {
      const items = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      elements.push(
        <ul key={nextKey()} className="doc-ul">
          {items.map((item, j) => <li key={j}>{inlineRender(item)}</li>)}
        </ul>
      )
      continue
    }

    // ── Ordered list
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={nextKey()} className="doc-ol">
          {items.map((item, j) => <li key={j}>{inlineRender(item)}</li>)}
        </ol>
      )
      continue
    }

    // ── Paragraph (collect consecutive non-special lines)
    const paraLines = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('---') &&
      !lines[i].startsWith('> ') &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !lines[i].includes('|')
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length) {
      elements.push(
        <p key={nextKey()} className="doc-p">
          {inlineRender(paraLines.join(' '))}
        </p>
      )
    }
  }

  return elements
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Documentation() {
  const { user } = useAuth()
  const isPrivileged = user?.role === 'admin' || user?.role === 'tutor'

  const sections = ALL_SECTIONS.filter(s => !s.adminOnly || isPrivileged)

  const [activeId, setActiveId] = useState(sections[0].id)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const contentRef = useRef(null)

  const active = sections.find(s => s.id === activeId) || sections[0]

  // Scroll content to top when section changes
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [activeId])

  function selectSection(id) {
    setActiveId(id)
    setMobileNavOpen(false)
  }

  return (
    <div className="doc-shell">

      {/* ── Mobile nav toggle ── */}
      <button
        className="doc-mobile-nav-toggle"
        onClick={() => setMobileNavOpen(o => !o)}
        aria-label="Toggle docs navigation"
      >
        <span>{mobileNavOpen ? '✕' : '☰'}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{active.label}</span>
      </button>

      {/* ── Left sidebar ── */}
      <aside className={`doc-sidebar${mobileNavOpen ? ' open' : ''}`}>
        <div className="doc-sidebar-header">
          <div className="doc-sidebar-title">Documentation</div>
          <div className="doc-sidebar-sub">AutoRange Cyber Range</div>
        </div>

        <nav className="doc-nav">
          {sections.map(s => (
            <button
              key={s.id}
              className={`doc-nav-item${activeId === s.id ? ' active' : ''}${s.adminOnly ? ' admin-only' : ''}`}
              onClick={() => selectSection(s.id)}
            >
              <span className="doc-nav-icon">{s.icon}</span>
              <span className="doc-nav-label">{s.label}</span>
              {s.adminOnly && <span className="doc-nav-badge">Admin</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Overlay for mobile ── */}
      {mobileNavOpen && (
        <div className="doc-overlay" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* ── Main content ── */}
      <main className="doc-content" ref={contentRef}>
        <div className="doc-content-inner">
          {renderMarkdown(active.content)}
        </div>
      </main>
    </div>
  )
}
