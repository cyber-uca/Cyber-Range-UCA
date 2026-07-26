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
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: '🚀',
    color: '#34D399',
    colorDim: 'rgba(52,211,153,0.1)',
    colorBorder: 'rgba(52,211,153,0.2)',
    desc: 'New here? Start with this.',
    content: gettingStarted,
    adminOnly: false,
  },
  {
    id: 'platform-guide',
    label: 'Platform Guide',
    icon: '🗺️',
    color: '#22D3EE',
    colorDim: 'rgba(34,211,238,0.1)',
    colorBorder: 'rgba(34,211,238,0.2)',
    desc: 'How the platform works.',
    content: platformGuide,
    adminOnly: false,
  },
  {
    id: 'ics-concepts',
    label: 'ICS / OT Concepts',
    icon: '⚙️',
    color: '#FBBF24',
    colorDim: 'rgba(251,191,36,0.1)',
    colorBorder: 'rgba(251,191,36,0.2)',
    desc: 'Background knowledge for the labs.',
    content: icsConcepts,
    adminOnly: false,
  },
  {
    id: 'tools-reference',
    label: 'Tools Reference',
    icon: '🛠️',
    color: '#60A5FA',
    colorDim: 'rgba(96,165,250,0.1)',
    colorBorder: 'rgba(96,165,250,0.2)',
    desc: 'Every tool, where it lives.',
    content: toolsRef,
    adminOnly: false,
  },
  {
    id: 'attack-techniques',
    label: 'Attack Techniques',
    icon: '⚔️',
    color: '#F87171',
    colorDim: 'rgba(248,113,113,0.1)',
    colorBorder: 'rgba(248,113,113,0.2)',
    desc: 'MITRE ATT&CK for ICS mapped.',
    content: attackTech,
    adminOnly: false,
  },
  {
    id: 'risk-compliance',
    label: 'Risk & Compliance',
    icon: '📋',
    color: '#A78BFA',
    colorDim: 'rgba(167,139,250,0.1)',
    colorBorder: 'rgba(167,139,250,0.2)',
    desc: 'IEC 62443, NIST, risk taxonomy.',
    content: riskCompliance,
    adminOnly: false,
  },
  {
    id: 'admin-guide',
    label: 'Admin Guide',
    icon: '🔧',
    color: '#2DD4BF',
    colorDim: 'rgba(45,212,191,0.1)',
    colorBorder: 'rgba(45,212,191,0.2)',
    desc: 'Run the platform without touching code.',
    content: adminGuide,
    adminOnly: true,
  },
]

// Rough reading time from word count
function readingTime(text) {
  const words = text.trim().split(/\s+/).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

// ── Inline markdown renderer ───────────────────────────────────────────────
function renderMarkdown(raw) {
  const lines = raw.split('\n')
  const elements = []
  let i = 0
  let key = 0
  const k = () => key++

  function inline(text) {
    const parts = []
    const re = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
    let last = 0, m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      const t = m[0]
      if (t.startsWith('`'))
        parts.push(<code key={k()} className="doc-inline-code">{t.slice(1, -1)}</code>)
      else if (t.startsWith('**'))
        parts.push(<strong key={k()} className="doc-strong">{t.slice(2, -2)}</strong>)
      else {
        const lm = t.match(/\[([^\]]+)\]\(([^)]+)\)/)
        if (lm) parts.push(<a key={k()} href={lm[2]} target="_blank" rel="noopener noreferrer" className="doc-link">{lm[1]}</a>)
      }
      last = m.index + t.length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '')          { i++; continue }
    if (/^---+$/.test(line.trim())) { elements.push(<div key={k()} className="doc-divider"><span /></div>); i++; continue }

    if (line.startsWith('# '))  { elements.push(<h1 key={k()} className="doc-h1">{inline(line.slice(2))}</h1>);  i++; continue }
    if (line.startsWith('## ')) { elements.push(<h2 key={k()} className="doc-h2"><span className="doc-h2-mark" />{inline(line.slice(3))}</h2>); i++; continue }
    if (line.startsWith('### ')){ elements.push(<h3 key={k()} className="doc-h3">{inline(line.slice(4))}</h3>); i++; continue }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={k()} className="doc-blockquote">
          <span className="doc-blockquote-icon">ℹ</span>
          <span>{inline(line.slice(2))}</span>
        </blockquote>
      )
      i++; continue
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      elements.push(
        <div key={k()} className="doc-code-block">
          <div className="doc-code-header">
            <div className="doc-code-dots">
              <span /><span /><span />
            </div>
            {lang && <span className="doc-code-lang">{lang}</span>}
            <span className="doc-code-copy" title="Copy">⎘</span>
          </div>
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      )
      continue
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={k()} className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr>{headers.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items = []
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, '')); i++ }
      elements.push(
        <ul key={k()} className="doc-ul">
          {items.map((item, j) => <li key={j}><span className="doc-li-dot" />
            <span>{inline(item)}</span></li>)}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      elements.push(
        <ol key={k()} className="doc-ol">
          {items.map((item, j) => <li key={j}><span className="doc-li-num">{j + 1}</span>
            <span>{inline(item)}</span></li>)}
        </ol>
      )
      continue
    }

    // Paragraph
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
    ) { paraLines.push(lines[i]); i++ }

    if (paraLines.length) {
      elements.push(<p key={k()} className="doc-p">{inline(paraLines.join(' '))}</p>)
    }
  }

  return elements
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Documentation() {
  const { user } = useAuth()
  const isPrivileged = user?.role === 'admin' || user?.role === 'tutor'
  const sections = ALL_SECTIONS.filter(s => !s.adminOnly || isPrivileged)

  const [activeId, setActiveId] = useState(sections[0].id)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const contentRef = useRef(null)

  const active = sections.find(s => s.id === activeId) || sections[0]

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [activeId])

  function select(id) { setActiveId(id); setMobileNavOpen(false) }

  return (
    <div className="doc-shell">

      {/* Mobile toggle */}
      <button className="doc-mob-toggle" onClick={() => setMobileNavOpen(o => !o)}>
        <span className="doc-mob-toggle-icon" style={{ color: active.color }}>
          {mobileNavOpen ? '✕' : active.icon}
        </span>
        <span>{active.label}</span>
        <span className="doc-mob-toggle-arrow">{mobileNavOpen ? '▲' : '▼'}</span>
      </button>

      {/* Sidebar */}
      <aside className={`doc-sidebar${mobileNavOpen ? ' open' : ''}`}>
        <div className="doc-sidebar-header">
          <div className="doc-sidebar-wordmark">
            <span className="doc-sidebar-mark">AR</span>
            <div>
              <div className="doc-sidebar-title">Documentation</div>
              <div className="doc-sidebar-sub">AutoRange Cyber Range</div>
            </div>
          </div>
        </div>

        <nav className="doc-nav">
          {sections.map((s, idx) => {
            const isActive = activeId === s.id
            return (
              <button
                key={s.id}
                className={`doc-nav-item${isActive ? ' active' : ''}`}
                onClick={() => select(s.id)}
                style={isActive ? {
                  '--nav-color': s.color,
                  '--nav-dim': s.colorDim,
                  '--nav-border': s.colorBorder,
                } : {}}
              >
                <span className="doc-nav-icon-wrap"
                  style={{ background: isActive ? s.colorDim : undefined,
                           border: `1px solid ${isActive ? s.colorBorder : 'transparent'}` }}>
                  {s.icon}
                </span>
                <div className="doc-nav-text">
                  <span className="doc-nav-label">{s.label}</span>
                  <span className="doc-nav-desc">{s.desc}</span>
                </div>
                {s.adminOnly && <span className="doc-nav-badge">Admin</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Overlay */}
      {mobileNavOpen && <div className="doc-overlay" onClick={() => setMobileNavOpen(false)} />}

      {/* Content */}
      <main className="doc-content" ref={contentRef}>

        {/* Section hero banner */}
        <div className="doc-hero" style={{
          '--hero-color': active.color,
          '--hero-dim': active.colorDim,
          '--hero-border': active.colorBorder,
        }}>
          <div className="doc-hero-icon">{active.icon}</div>
          <div className="doc-hero-text">
            <div className="doc-hero-label">{active.label}</div>
            <div className="doc-hero-meta">
              <span>{readingTime(active.content)}</span>
              {active.adminOnly && <span className="doc-hero-badge">Admin only</span>}
            </div>
          </div>
        </div>

        <div className="doc-content-inner">
          {renderMarkdown(active.content)}
        </div>
      </main>
    </div>
  )
}
