import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const blankForm = {
  title: '', description: '', objectives: '',
  category_id: '', difficulty_id: '', challenge_type: 'standard_flag',
  points: 100, time_limit_minutes: 90, tags: '',
  flag: '', vm_template_ids: [], hints: [],
}

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`

export default function ChallengeCreator() {
  const [tab, setTab] = useState('mine')
  const [myChallenges, setMyChallenges] = useState([])
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [challengeTypes, setChallengeTypes] = useState(['standard_flag'])
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [importPack, setImportPack] = useState('')
  const [importFlag, setImportFlag] = useState('')

  const refresh = () => api.listMyChallenges().then(setMyChallenges).catch(() => {})

  useEffect(() => {
    refresh()
    api.listVmTemplates().then(setTemplates).catch(() => {})
    api.listCategoriesPublic().then(setCategories).catch(() => {})
    api.listDifficultiesPublic().then(setDifficulties).catch(() => {})
    api.listChallengeTypesPublic().then(r => setChallengeTypes(r.registered_types)).catch(() => {})
  }, [])

  const emptyForm = () => ({ ...blankForm, category_id: categories[0]?.id || '', difficulty_id: difficulties[0]?.id || '' })
  const update = k => e => setForm({ ...form, [k]: e.target.value })
  const toggleTemplate = id => setForm(f => ({ ...f, vm_template_ids: f.vm_template_ids.includes(id) ? f.vm_template_ids.filter(t => t !== id) : [...f.vm_template_ids, id] }))
  const addHint = () => setForm(f => ({ ...f, hints: [...f.hints, { content: '', cost: 10 }] }))
  const updateHint = (i, field, value) => setForm(f => { const hints = [...f.hints]; hints[i] = { ...hints[i], [field]: value }; return { ...f, hints } })
  const removeHint = i => setForm(f => ({ ...f, hints: f.hints.filter((_, idx) => idx !== i) }))

  const startNew = () => { setForm(emptyForm()); setEditingId(null); setTab('new') }

  const startEdit = async challenge => {
    setForm({
      title: challenge.title, description: challenge.description,
      objectives: challenge.objectives || '', category_id: challenge.category.id,
      difficulty_id: challenge.difficulty.id, challenge_type: challenge.challenge_type,
      points: challenge.points, time_limit_minutes: challenge.time_limit_minutes,
      tags: challenge.tags || '', flag: '',
      vm_template_ids: challenge.vms.map(v => v.vm_template.id), hints: [],
    })
    setEditingId(challenge.id)
    setTab('new')
  }

  const submit = async e => {
    e.preventDefault(); setMessage('')
    try {
      const payload = { ...form, points: Number(form.points), time_limit_minutes: Number(form.time_limit_minutes) }
      if (editingId) { await api.updateChallenge(editingId, payload); setMessage('Challenge updated.') }
      else { await api.createChallenge(payload); setMessage('Challenge created as draft.') }
      setMsgType('success'); refresh(); setTab('mine')
    } catch (err) { setMessage(err.message); setMsgType('error') }
  }

  const publish = async id => { await api.publishChallenge(id); refresh() }
  const remove = async id => { if (confirm('Delete this challenge?')) { await api.deleteChallenge(id); refresh() } }

  const exportPack = async id => {
    const pack = await api.exportChallenge(id)
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${pack.title.replace(/\s+/g, '_').toLowerCase()}.pack.json`; a.click()
  }

  const doImport = async () => {
    setMessage('')
    try {
      const pack = JSON.parse(importPack)
      await api.importChallenge(pack, importFlag)
      setMessage('Pack imported as a draft.'); setMsgType('success')
      setImportPack(''); setImportFlag(''); refresh(); setTab('mine')
    } catch (err) { setMessage(err.message); setMsgType('error') }
  }

  return (
    <div className="page">
      <style>{ANIM}</style>

      <div style={{ marginBottom: 24, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--combined)', boxShadow: '0 0 8px var(--combined)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--combined)', fontWeight: 700 }}>Creator Studio</span>
        </div>
        <h1>Challenge Creator</h1>
        <p className="subtitle">Build, edit, publish and share challenges as portable packs.</p>
      </div>

      <div className="tab-nav" style={{ animation: 'fadeUp .4s .05s ease both' }}>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My Challenges</button>
        <button className={tab === 'new' ? 'active' : ''} onClick={startNew}>{editingId ? 'Editing…' : 'New Challenge'}</button>
        <button className={tab === 'import' ? 'active' : ''} onClick={() => setTab('import')}>Import Pack</button>
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
          background: msgType === 'success' ? 'var(--mitigation-dim)' : 'var(--offensive-dim)',
          color: msgType === 'success' ? 'var(--mitigation)' : 'var(--offensive)',
          border: `1px solid ${msgType === 'success' ? 'rgba(20,201,168,0.3)' : 'rgba(240,82,74,0.3)'}`,
        }}>{message}</div>
      )}

      {/* ── MY CHALLENGES ── */}
      {tab === 'mine' && (
        <div style={{ animation: 'fadeUp .35s ease both' }}>
          {myChallenges.map(c => (
            <div key={c.id} className="challenge-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={c.is_published ? 'published-pill' : 'draft-pill'}>{c.is_published ? 'Published' : 'Draft'}</span>
                <strong style={{ fontSize: 14 }}>{c.title}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.category.name} · {c.difficulty.name}</span>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{c.points} XP</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => startEdit(c)}>Edit</button>
                {!c.is_published && <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => publish(c.id)}>Publish</button>}
                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => exportPack(c.id)}>Export</button>
                <button className="btn-danger" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => remove(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {myChallenges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>✦</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>No challenges yet</div>
              <button className="btn-primary" style={{ marginTop: 4 }} onClick={startNew}>Create your first →</button>
            </div>
          )}
        </div>
      )}

      {/* ── NEW / EDIT ── */}
      {tab === 'new' && (
        <form onSubmit={submit} style={{ animation: 'fadeUp .35s ease both' }}>
          <div className="form-section">
            <h2>Metadata</h2>
            <div className="form-row"><label>Title</label><input value={form.title} onChange={update('title')} required placeholder="e.g. CAN Bus Injection Attack" /></div>
            <div className="form-row"><label>Description</label><textarea rows={3} value={form.description} onChange={update('description')} required placeholder="What is this challenge about?" /></div>
            <div className="form-row"><label>Objectives</label><textarea rows={2} value={form.objectives} onChange={update('objectives')} placeholder="What will learners practice?" /></div>
            <div className="form-grid">
              <div className="form-row">
                <label>Category</label>
                <select value={form.category_id} onChange={update('category_id')}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Difficulty</label>
                <select value={form.difficulty_id} onChange={update('difficulty_id')}>
                  {difficulties.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Challenge type</label>
                <select value={form.challenge_type} onChange={update('challenge_type')}>
                  {challengeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row"><label>Points</label><input type="number" value={form.points} onChange={update('points')} /></div>
              <div className="form-row"><label>Time limit (min)</label><input type="number" value={form.time_limit_minutes} onChange={update('time_limit_minutes')} /></div>
            </div>
            <div className="form-row"><label>Tags (comma-separated)</label><input value={form.tags} onChange={update('tags')} placeholder="CAN Bus, ECU, OBD-II" /></div>
            <div className="form-row">
              <label>Flag {editingId && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(leave blank to keep current)</span>}</label>
              <input className="mono" value={form.flag} onChange={update('flag')} placeholder="FLAG{...}" required={!editingId} />
            </div>
          </div>

          <div className="form-section">
            <h2>Environment — VM Templates</h2>
            {templates.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No VM templates configured yet. Add them in Admin → Infrastructure.</p>
              : <div className="checkbox-list">
                  {templates.map(t => (
                    <div key={t.id} className={`checkbox-chip ${form.vm_template_ids.includes(t.id) ? 'checked' : ''}`} onClick={() => toggleTemplate(t.id)}>
                      {t.name} <span style={{ opacity: .6, fontSize: 10 }}>({t.zone})</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div className="form-section">
            <h2>Hints</h2>
            {form.hints.map((h, i) => (
              <div key={i} className="hint-row">
                <input placeholder="Hint text" value={h.content} onChange={e => updateHint(i, 'content', e.target.value)} />
                <input type="number" placeholder="Cost" value={h.cost} onChange={e => updateHint(i, 'cost', Number(e.target.value))} style={{ width: 90 }} />
                <button type="button" className="remove-btn" onClick={() => removeHint(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={addHint}>+ Add hint</button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" type="submit" style={{ padding: '11px 28px' }}>{editingId ? 'Save changes' : 'Create draft'}</button>
            <button type="button" className="btn-secondary" style={{ padding: '11px 20px' }} onClick={() => setTab('mine')}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── IMPORT ── */}
      {tab === 'import' && (
        <div className="form-section" style={{ animation: 'fadeUp .35s ease both' }}>
          <h2>Import a challenge pack</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
            Paste a pack exported from this or another deployment. Categories and difficulties are matched by slug and auto-created if missing.
          </p>
          <div className="form-row">
            <label>Pack JSON</label>
            <textarea rows={10} className="mono" value={importPack} onChange={e => setImportPack(e.target.value)} placeholder='{"pack_version": 1, ...}' style={{ fontSize: 12 }} />
          </div>
          <div className="form-row">
            <label>New flag for this copy</label>
            <input className="mono" value={importFlag} onChange={e => setImportFlag(e.target.value)} placeholder="FLAG{...}" />
          </div>
          <button className="btn-primary" onClick={doImport} style={{ padding: '11px 24px' }}>Import as draft</button>
        </div>
      )}
    </div>
  )
}
