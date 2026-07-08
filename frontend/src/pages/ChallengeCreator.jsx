import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const blankForm = {
  title: '', description: '', objectives: '',
  category_id: '', difficulty_id: '', challenge_type: 'standard_flag',
  points: 100, time_limit_minutes: 90, tags: '',
  flag: '', vm_template_ids: [], hints: [],
}

export default function ChallengeCreator() {
  const [tab, setTab] = useState('mine') // 'mine' | 'new' | 'import'
  const [myChallenges, setMyChallenges] = useState([])
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [challengeTypes, setChallengeTypes] = useState(['standard_flag'])
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [importPack, setImportPack] = useState('')
  const [importFlag, setImportFlag] = useState('')

  const refresh = () => {
    api.listMyChallenges().then(setMyChallenges).catch(() => {})
  }

  useEffect(() => {
    refresh()
    api.listVmTemplates().then(setTemplates).catch(() => {})
    api.listCategoriesPublic().then(setCategories).catch(() => {})
    api.listDifficultiesPublic().then(setDifficulties).catch(() => {})
    api.listChallengeTypesPublic().then((r) => setChallengeTypes(r.registered_types)).catch(() => {})
  }, [])

  const emptyForm = () => ({
    ...blankForm,
    category_id: categories[0]?.id || '',
    difficulty_id: difficulties[0]?.id || '',
  })

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const toggleTemplate = (id) => {
    setForm((f) => ({
      ...f,
      vm_template_ids: f.vm_template_ids.includes(id)
        ? f.vm_template_ids.filter((t) => t !== id)
        : [...f.vm_template_ids, id],
    }))
  }

  const addHint = () => setForm((f) => ({ ...f, hints: [...f.hints, { content: '', cost: 10 }] }))
  const updateHint = (i, field, value) => setForm((f) => {
    const hints = [...f.hints]
    hints[i] = { ...hints[i], [field]: value }
    return { ...f, hints }
  })
  const removeHint = (i) => setForm((f) => ({ ...f, hints: f.hints.filter((_, idx) => idx !== i) }))

  const startNew = () => { setForm(emptyForm()); setEditingId(null); setTab('new') }

  const startEdit = async (challenge) => {
    setForm({
      title: challenge.title,
      description: challenge.description,
      objectives: challenge.objectives || '',
      category_id: challenge.category.id,
      difficulty_id: challenge.difficulty.id,
      challenge_type: challenge.challenge_type,
      points: challenge.points,
      time_limit_minutes: challenge.time_limit_minutes,
      tags: challenge.tags || '',
      flag: '', // leave blank = keep existing flag on update
      vm_template_ids: challenge.vms.map((v) => v.vm_template.id),
      hints: [],
    })
    setEditingId(challenge.id)
    setTab('new')
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const payload = { ...form, points: Number(form.points), time_limit_minutes: Number(form.time_limit_minutes) }
      if (editingId) {
        await api.updateChallenge(editingId, payload)
        setMessage('Challenge updated.')
      } else {
        await api.createChallenge(payload)
        setMessage('Challenge created as draft.')
      }
      refresh()
      setTab('mine')
    } catch (err) {
      setMessage(err.message)
    }
  }

  const publish = async (id) => { await api.publishChallenge(id); refresh() }
  const remove = async (id) => { if (confirm('Delete this challenge?')) { await api.deleteChallenge(id); refresh() } }

  const exportPack = async (id) => {
    const pack = await api.exportChallenge(id)
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pack.title.replace(/\s+/g, '_').toLowerCase()}.pack.json`
    a.click()
  }

  const doImport = async () => {
    setMessage('')
    try {
      const pack = JSON.parse(importPack)
      await api.importChallenge(pack, importFlag)
      setMessage('Pack imported as a draft.')
      setImportPack(''); setImportFlag('')
      refresh()
      setTab('mine')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="page">
      <h1>Challenge Creator</h1>
      <p className="subtitle">Build, edit, publish, and share challenges as portable packs.</p>

      <div className="tab-nav">
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My challenges</button>
        <button className={tab === 'new' ? 'active' : ''} onClick={startNew}>{editingId ? 'Editing…' : 'New challenge'}</button>
        <button className={tab === 'import' ? 'active' : ''} onClick={() => setTab('import')}>Import pack</button>
      </div>

      {message && <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 16 }}>{message}</p>}

      {tab === 'mine' && (
        <div>
          {myChallenges.map((c) => (
            <div key={c.id} className="challenge-row">
              <div>
                <span className={c.is_published ? 'published-pill' : 'draft-pill'} style={{ marginRight: 10 }}>
                  {c.is_published ? 'Published' : 'Draft'}
                </span>
                <strong>{c.title}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 10, fontSize: 12 }}>
                  {c.category.name} · {c.difficulty.name} · {c.points} pts
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-secondary" onClick={() => startEdit(c)}>Edit</button>
                {!c.is_published && <button className="btn-primary" onClick={() => publish(c.id)}>Publish</button>}
                <button className="btn-secondary" onClick={() => exportPack(c.id)}>Export</button>
                <button className="btn-danger" onClick={() => remove(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {myChallenges.length === 0 && <p style={{ color: 'var(--text-muted)' }}>You haven't created any challenges yet.</p>}
        </div>
      )}

      {tab === 'new' && (
        <form onSubmit={submit}>
          <div className="form-section">
            <h2>Metadata</h2>
            <div className="form-row"><label>Title</label><input value={form.title} onChange={update('title')} required /></div>
            <div className="form-row"><label>Description</label><textarea rows={3} value={form.description} onChange={update('description')} required /></div>
            <div className="form-row"><label>Objectives</label><textarea rows={2} value={form.objectives} onChange={update('objectives')} /></div>
            <div className="form-grid">
              <div className="form-row">
                <label>Category</label>
                <select value={form.category_id} onChange={update('category_id')}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Difficulty</label>
                <select value={form.difficulty_id} onChange={update('difficulty_id')}>
                  {difficulties.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Challenge type</label>
                <select value={form.challenge_type} onChange={update('challenge_type')}>
                  {challengeTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row"><label>Points</label><input type="number" value={form.points} onChange={update('points')} /></div>
              <div className="form-row"><label>Time limit (min)</label><input type="number" value={form.time_limit_minutes} onChange={update('time_limit_minutes')} /></div>
            </div>
            <div className="form-row"><label>Tags (comma-separated)</label><input value={form.tags} onChange={update('tags')} placeholder="CAN Bus, ECU, OBD-II" /></div>
            <div className="form-row">
              <label>Flag {editingId && '(leave blank to keep the current flag)'}</label>
              <input className="mono" value={form.flag} onChange={update('flag')} placeholder="FLAG{...}" required={!editingId} />
            </div>
          </div>

          <div className="form-section">
            <h2>Environment (VM templates)</h2>
            <div className="checkbox-list">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`checkbox-chip ${form.vm_template_ids.includes(t.id) ? 'checked' : ''}`}
                  onClick={() => toggleTemplate(t.id)}
                >
                  {t.name} <span style={{ color: 'var(--text-muted)' }}>({t.zone})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Hints</h2>
            {form.hints.map((h, i) => (
              <div key={i} className="hint-row">
                <input placeholder="Hint text" value={h.content} onChange={(e) => updateHint(i, 'content', e.target.value)} />
                <input type="number" placeholder="Cost" value={h.cost} onChange={(e) => updateHint(i, 'cost', Number(e.target.value))} />
                <button type="button" className="remove-btn" onClick={() => removeHint(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addHint}>+ Add hint</button>
          </div>

          <button className="btn-primary" type="submit">{editingId ? 'Save changes' : 'Create draft'}</button>
        </form>
      )}

      {tab === 'import' && (
        <div className="form-section">
          <h2>Import a challenge pack</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
            Paste a pack exported from this or another deployment. VM templates are matched by name —
            templates that don't exist here are skipped, not failing the import.
          </p>
          <div className="form-row">
            <label>Pack JSON</label>
            <textarea rows={10} className="mono" value={importPack} onChange={(e) => setImportPack(e.target.value)} placeholder='{"pack_version": 1, ...}' />
          </div>
          <div className="form-row">
            <label>New flag for this copy</label>
            <input className="mono" value={importFlag} onChange={(e) => setImportFlag(e.target.value)} placeholder="FLAG{...}" />
          </div>
          <button className="btn-primary" onClick={doImport}>Import as draft</button>
        </div>
      )}
    </div>
  )
}
