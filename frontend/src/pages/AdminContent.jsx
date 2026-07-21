import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'

/* ── tiny helpers ─────────────────────────────────────────────── */
const STATUS_COLOR = { published: 'var(--green)', draft: 'var(--amber)', archived: 'var(--text-4)' }
const DIFF_COLOR   = { beginner: 'var(--green)', intermediate: 'var(--amber)', advanced: 'var(--red)', expert: 'var(--red)' }

function Badge({ status }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
      padding: '2px 7px', borderRadius: 999,
      background: `${STATUS_COLOR[status] ?? 'var(--text-4)'}18`,
      color: STATUS_COLOR[status] ?? 'var(--text-4)',
      border: `1px solid ${STATUS_COLOR[status] ?? 'var(--text-4)'}30`,
    }}>{status}</span>
  )
}

function Spinner() {
  return <div style={{ width: 20, height: 20, border: '2px solid var(--border-md)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
}

function ModalOverlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border-md)',
        borderRadius: 'var(--r-lg)', padding: 28, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

/* ── Path modal ───────────────────────────────────────────────── */
function PathModal({ initial, onSave, onClose }) {
  const blank = { title: '', slug: '', description: '', icon: '🛡️', color: 'var(--cyan)', sort_order: 0 }
  const [form, setForm] = useState(initial ?? blank)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { setErr('Title and slug are required'); return }
    setSaving(true); setErr('')
    try {
      await onSave(form)
      onClose()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 20 }}>{initial ? 'Edit Path' : 'New Path'}</h3>
      <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Slug (URL key)"><input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} /></Field>
      <Field label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10 }}>
        <Field label="Icon (emoji)"><input value={form.icon} onChange={e => set('icon', e.target.value)} /></Field>
        <Field label="Color (CSS var or hex)"><input value={form.color} onChange={e => set('color', e.target.value)} /></Field>
        <Field label="Order"><input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} /></Field>
      </div>
      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </ModalOverlay>
  )
}

/* ── Module modal ─────────────────────────────────────────────── */
function ModuleModal({ pathId, initial, onSave, onClose }) {
  const blank = { title: '', slug: '', description: '', sort_order: 0 }
  const [form, setForm] = useState(initial ?? blank)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { setErr('Title and slug are required'); return }
    setSaving(true); setErr('')
    try { await onSave(form); onClose() }
    catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 20 }}>{initial ? 'Edit Module' : 'New Module'}</h3>
      <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Slug"><input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} /></Field>
      <Field label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} /></Field>
      <Field label="Sort Order"><input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} /></Field>
      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </ModalOverlay>
  )
}

/* ── Room modal ───────────────────────────────────────────────── */
function RoomModal({ initial, vmTemplates, onSave, onClose }) {
  const blank = { title: '', slug: '', description: '', story: '', objectives: '', difficulty: 'beginner', estimated_minutes: 60, xp_reward: 100, tags: '', mitre_attack: '', sort_order: 0, vm_template_ids: [] }
  const [form, setForm] = useState(initial ? { ...initial, vm_template_ids: (initial.vm_assignments ?? []).map(a => a.vm_template.id) } : blank)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleVm = id => set('vm_template_ids', form.vm_template_ids.includes(id) ? form.vm_template_ids.filter(x => x !== id) : [...form.vm_template_ids, id])

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { setErr('Title and slug are required'); return }
    setSaving(true); setErr('')
    try { await onSave(form); onClose() }
    catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 20 }}>{initial ? 'Edit Room' : 'New Room'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} /></Field>
        <Field label="Slug"><input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} /></Field>
      </div>
      <Field label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} /></Field>
      <Field label="Story / Background"><textarea value={form.story ?? ''} onChange={e => set('story', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} /></Field>
      <Field label="Objectives (semicolon-separated)"><input value={form.objectives ?? ''} onChange={e => set('objectives', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        <Field label="Difficulty">
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
            {['beginner','intermediate','advanced','expert'].map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Est. Minutes"><input type="number" value={form.estimated_minutes} onChange={e => set('estimated_minutes', +e.target.value)} /></Field>
        <Field label="XP Reward"><input type="number" value={form.xp_reward} onChange={e => set('xp_reward', +e.target.value)} /></Field>
        <Field label="Sort Order"><input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Tags (comma-separated)"><input value={form.tags ?? ''} onChange={e => set('tags', e.target.value)} /></Field>
        <Field label="MITRE ATT&CK"><input value={form.mitre_attack ?? ''} onChange={e => set('mitre_attack', e.target.value)} /></Field>
      </div>
      <Field label="VM Templates">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {(vmTemplates ?? []).map(vm => {
            const on = form.vm_template_ids.includes(vm.id)
            return (
              <button key={vm.id} onClick={() => toggleVm(vm.id)} style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: on ? 'var(--cyan-dim)' : 'var(--surface-3)',
                color: on ? 'var(--cyan)' : 'var(--text-4)',
                border: `1px solid ${on ? 'rgba(34,211,238,.4)' : 'var(--border)'}`,
              }}>{vm.name}</button>
            )
          })}
          {!(vmTemplates ?? []).length && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>No VM templates defined yet</span>}
        </div>
      </Field>
      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </ModalOverlay>
  )
}

/* ── Task modal ───────────────────────────────────────────────── */
function TaskModal({ initial, onSave, onClose }) {
  const blank = { title: '', description: '', objectives: '', sort_order: 0, estimated_minutes: 20, points: 100, completion_rule: 'all_mandatory', min_score_pct: 80 }
  const [form, setForm] = useState(initial ?? blank)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return }
    setSaving(true); setErr('')
    try { await onSave(form); onClose() }
    catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 20 }}>{initial ? 'Edit Task' : 'New Task'}</h3>
      <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Description"><textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} /></Field>
      <Field label="Objectives (semicolon-separated)"><input value={form.objectives ?? ''} onChange={e => set('objectives', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        <Field label="Points"><input type="number" value={form.points} onChange={e => set('points', +e.target.value)} /></Field>
        <Field label="Est. Minutes"><input type="number" value={form.estimated_minutes} onChange={e => set('estimated_minutes', +e.target.value)} /></Field>
        <Field label="Min Score %"><input type="number" value={form.min_score_pct} onChange={e => set('min_score_pct', +e.target.value)} /></Field>
        <Field label="Sort Order"><input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} /></Field>
      </div>
      <Field label="Completion Rule">
        <select value={form.completion_rule} onChange={e => set('completion_rule', e.target.value)}>
          <option value="all_mandatory">All mandatory questions</option>
          <option value="any">Any question</option>
          <option value="min_score">Minimum score</option>
        </select>
      </Field>
      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </ModalOverlay>
  )
}

/* ── Question modal ───────────────────────────────────────────── */
function QuestionModal({ initial, onSave, onClose }) {
  const blank = { question_type: 'mcq_single', text: '', explanation: '', points: 20, is_mandatory: true, sort_order: 0, validation_data: '', options: [] }

  // When editing, compute is_correct for each option from validation_data
  const initForm = () => {
    if (!initial) return blank
    const vd = initial.validation_data ?? {}
    const correctId  = vd.correct_option_id
    const correctIds = vd.correct_option_ids ?? []
    const opts = (initial.options ?? []).map(o => ({
      ...o,
      is_correct: o.id === correctId || correctIds.includes(o.id),
    }))
    // For non-MCQ, extract the plain answer string from validation_data
    const plainAnswer = typeof initial.validation_data === 'object' && initial.validation_data
      ? (initial.validation_data.answer ?? initial.validation_data.flag_hash ?? '')
      : (initial.validation_data ?? '')
    return {
      ...initial,
      options: opts,
      validation_data: initial.question_type?.startsWith('mcq') ? '' : plainAnswer,
    }
  }

  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addOption    = () => set('options', [...(form.options ?? []), { text: '', is_correct: false, sort_order: (form.options ?? []).length }])
  const updateOption = (i, key, val) => set('options', form.options.map((o, idx) => idx === i ? { ...o, [key]: val } : o))
  const removeOption = (i) => set('options', form.options.filter((_, idx) => idx !== i))

  const isMcq = form.question_type?.startsWith('mcq')

  const save = async () => {
    if (!form.text.trim()) { setErr('Question text is required'); return }
    if (isMcq && (!form.options || form.options.length < 2)) { setErr('MCQ questions need at least 2 options'); return }
    setSaving(true); setErr('')
    const payload = {
      question_type:  form.question_type,
      text:           form.text,
      explanation:    form.explanation,
      points:         form.points,
      is_mandatory:   form.is_mandatory,
      sort_order:     form.sort_order,
      validation_data: isMcq ? null : (form.validation_data ? { answer: form.validation_data } : null),
      options: isMcq ? form.options.map((o, i) => ({ text: o.text, is_correct: !!o.is_correct, sort_order: i })) : [],
    }
    try { await onSave(payload); onClose() }
    catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 20 }}>{initial ? 'Edit Question' : 'New Question'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: 10 }}>
        <Field label="Type">
          <select value={form.question_type} onChange={e => set('question_type', e.target.value)}>
            <option value="mcq_single">MCQ Single</option>
            <option value="mcq_multi">MCQ Multi</option>
            <option value="text_input">Text Input</option>
            <option value="flag">Flag</option>
            <option value="practical">Practical</option>
          </select>
        </Field>
        <Field label="Points"><input type="number" value={form.points} onChange={e => set('points', +e.target.value)} /></Field>
        <Field label="Order"><input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} /></Field>
        <Field label="Mandatory">
          <select value={form.is_mandatory ? 'yes' : 'no'} onChange={e => set('is_mandatory', e.target.value === 'yes')}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>
      <Field label="Question Text"><textarea value={form.text} onChange={e => set('text', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} /></Field>
      <Field label="Explanation (shown after answer)"><textarea value={form.explanation ?? ''} onChange={e => set('explanation', e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} /></Field>
      {!isMcq && <Field label="Expected Answer / Flag"><input value={form.validation_data ?? ''} onChange={e => set('validation_data', e.target.value)} placeholder="e.g. FLAG{...} or exact answer" /></Field>}
      {isMcq && (
        <Field label="Options">
          {form.question_type === 'mcq_single' && (
            <p style={{ fontSize:11, color:'var(--text-4)', margin:'0 0 8px' }}>
              Select the radio button next to the correct answer.
            </p>
          )}
          {form.question_type === 'mcq_multi' && (
            <p style={{ fontSize:11, color:'var(--text-4)', margin:'0 0 8px' }}>
              Click the ✓ / ✗ button to mark one or more options as correct.
            </p>
          )}
          {(form.options ?? []).map((o, i) => {
            const isCorrect = !!o.is_correct
            return (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8,
                padding: '8px 10px', borderRadius: 8,
                background: isCorrect ? 'rgba(20,201,168,0.08)' : 'rgba(13,24,38,0.4)',
                border: `1px solid ${isCorrect ? 'rgba(20,201,168,0.4)' : 'var(--border)'}`,
                transition: 'all .15s',
              }}>
                {/* Correct indicator — radio for single, toggle button for multi */}
                {form.question_type === 'mcq_single' ? (
                  <input
                    type="radio"
                    name="correct_option"
                    checked={isCorrect}
                    onChange={() => {
                      // For single: uncheck all, check only this one
                      set('options', form.options.map((opt, idx) => ({
                        ...opt, is_correct: idx === i
                      })))
                    }}
                    style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: '#14C9A8' }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => updateOption(i, 'is_correct', !isCorrect)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none',
                      background: isCorrect ? 'rgba(20,201,168,0.2)' : 'rgba(240,82,74,0.15)',
                      color: isCorrect ? '#14C9A8' : 'var(--red)',
                    }}>
                    {isCorrect ? '✓' : '✗'}
                  </button>
                )}

                {/* Option text */}
                <input
                  value={o.text}
                  onChange={e => updateOption(i, 'text', e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: 'var(--text)', padding: '2px 0' }}
                />

                {/* Correct / Incorrect label */}
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                  color: isCorrect ? '#14C9A8' : 'var(--text-4)',
                  minWidth: 52, textAlign: 'right', flexShrink: 0,
                }}>
                  {isCorrect ? '✓ CORRECT' : '✗ WRONG'}
                </span>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-4)',
                    cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0,
                    lineHeight: 1 }}
                  title="Remove option">
                  ×
                </button>
              </div>
            )
          })}
          <button className="btn-ghost btn-sm" onClick={addOption} style={{ marginTop: 4 }}>
            + Add option
          </button>
          {/* Validation hint */}
          {isMcq && form.options?.length > 0 && !form.options.some(o => o.is_correct) && (
            <p style={{ color: 'var(--amber)', fontSize: 11, marginTop: 6 }}>
              ⚠ No correct option selected — please mark at least one answer as correct.
            </p>
          )}
        </Field>
      )}
      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </ModalOverlay>
  )
}

/* ══════════════════════════════════════════════════════════════════
   PANEL: PATHS
══════════════════════════════════════════════════════════════════ */
function PathsPanel({ selectedPath, onSelect }) {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { mode:'create'|'edit', item? }
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.listPaths().then(data => { setPaths(data ?? []); setLoading(false) }).catch(e => { setErr(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (form) => {
    if (modal.mode === 'create') await api.adminCreatePath(form)
    else await api.adminUpdatePath(modal.item.id, form)
    load()
  }

  const del = async (p) => {
    if (!confirm(`Delete path "${p.title}"? This will cascade-delete all modules and rooms.`)) return
    await api.adminDeletePath(p.id).catch(e => alert(e.message))
    load()
    if (selectedPath?.id === p.id) onSelect(null)
  }

  const togglePublish = async (p) => {
    const fn = p.status === 'published' ? api.adminUnpublishPath : api.adminPublishPath
    await fn(p.id).catch(e => alert(e.message))
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Paths</h2>
        <button className="btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>+ New Path</button>
      </div>
      {err && <p style={{ color: 'var(--red)', fontSize: 12 }}>{err}</p>}
      {loading ? <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}><Spinner /></div> : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paths.length === 0 && <p style={{ color: 'var(--text-4)', fontSize: 13, textAlign:'center', paddingTop: 40 }}>No paths yet. Create one to get started.</p>}
          {paths.map(p => (
            <div key={p.id} onClick={() => onSelect(p)} style={{
              padding: '10px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all .15s',
              background: selectedPath?.id === p.id ? 'var(--cyan-dim)' : 'var(--surface-2)',
              border: `1px solid ${selectedPath?.id === p.id ? 'rgba(34,211,238,.35)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{p.icon ?? '🛡️'}</span>
                <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{p.title}</span>
                <Badge status={p.status} />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-4)', marginBottom: 8 }}>{p.description}</p>
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button className="btn-ghost btn-sm" style={{ fontSize: 10, padding:'2px 8px' }} onClick={() => setModal({ mode: 'edit', item: p })}>Edit</button>
                <button className="btn-ghost btn-sm" style={{ fontSize: 10, padding:'2px 8px', color: p.status === 'published' ? 'var(--amber)' : 'var(--green)' }} onClick={() => togglePublish(p)}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                <button className="btn-ghost btn-sm" style={{ fontSize: 10, padding:'2px 8px', color:'var(--red)' }} onClick={() => del(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <PathModal initial={modal.item} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   PANEL: MODULES
══════════════════════════════════════════════════════════════════ */
function ModulesPanel({ path, selectedModule, onSelect }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  const load = useCallback(() => {
    if (!path) return
    setLoading(true)
    api.getPath(path.slug)
      .then(data => { setModules(data.modules ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [path?.slug])

  useEffect(() => { setModules([]); load() }, [load])

  const save = async (form) => {
    if (modal.mode === 'create') await api.adminCreateModule(path.id, form)
    else await api.adminUpdateModule(modal.item.id, form)
    load()
  }

  const del = async (m) => {
    if (!confirm(`Delete module "${m.title}"? All rooms inside will be deleted.`)) return
    await api.adminDeleteModule(m.id).catch(e => alert(e.message))
    load()
    if (selectedModule?.id === m.id) onSelect(null)
  }

  const togglePublish = async (m) => {
    const fn = m.status === 'published' ? api.adminUnpublishModule : api.adminPublishModule
    await fn(m.id).catch(e => alert(e.message))
    load()
  }

  if (!path) return (
    <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'var(--text-4)', fontSize:13 }}>← Select a path</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
        <div>
          <h2 style={{ margin:0, fontSize:15, fontWeight:700 }}>Modules</h2>
          <p style={{ margin:0, fontSize:11, color:'var(--text-4)' }}>{path.title}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setModal({ mode:'create' })}>+ New Module</button>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}><Spinner /></div> : (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          {modules.length === 0 && <p style={{ color:'var(--text-4)', fontSize:13, textAlign:'center', paddingTop:40 }}>No modules yet.</p>}
          {modules.map(m => (
            <div key={m.id} onClick={() => onSelect(m)} style={{
              padding:'10px 14px', borderRadius:'var(--r-md)', cursor:'pointer', transition:'all .15s',
              background: selectedModule?.id === m.id ? 'var(--cyan-dim)' : 'var(--surface-2)',
              border:`1px solid ${selectedModule?.id === m.id ? 'rgba(34,211,238,.35)' : 'var(--border)'}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{m.title}</span>
                <Badge status={m.status} />
              </div>
              <p style={{ margin:'0 0 8px', fontSize:11, color:'var(--text-4)' }}>{m.description}</p>
              <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px' }} onClick={() => setModal({ mode:'edit', item:m })}>Edit</button>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px', color: m.status==='published' ? 'var(--amber)' : 'var(--green)' }} onClick={() => togglePublish(m)}>{m.status==='published' ? 'Unpublish' : 'Publish'}</button>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px', color:'var(--red)' }} onClick={() => del(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <ModuleModal pathId={path.id} initial={modal.item} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   PANEL: ROOMS
══════════════════════════════════════════════════════════════════ */
function RoomsPanel({ module, selectedRoom, onSelect }) {
  const [rooms, setRooms] = useState([])
  const [vmTemplates, setVmTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  const load = useCallback(() => {
    if (!module) return
    setLoading(true)
    const roomsPromise = module.rooms
      ? Promise.resolve(module.rooms)
      : api.listRooms({ module_id: module.id })
    Promise.all([roomsPromise, api.listVmTemplates().catch(() => [])])
      .then(([rs, vms]) => { setRooms(rs ?? []); setVmTemplates(vms ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [module?.id])

  useEffect(() => { setRooms([]); load() }, [load])

  const save = async (form) => {
    if (modal.mode === 'create') await api.adminCreateRoom(module.id, form)
    else await api.adminUpdateRoom(modal.item.id, form)
    load()
  }

  const del = async (r) => {
    if (!confirm(`Delete room "${r.title}"?`)) return
    await api.adminDeleteRoom(r.id).catch(e => alert(e.message))
    load()
    if (selectedRoom?.id === r.id) onSelect(null)
  }

  const togglePublish = async (r) => {
    const fn = r.status === 'published' ? api.adminUnpublishRoom : api.adminPublishRoom
    await fn(r.id).catch(e => alert(e.message))
    load()
  }

  if (!module) return (
    <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'var(--text-4)', fontSize:13 }}>← Select a module</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
        <div>
          <h2 style={{ margin:0, fontSize:15, fontWeight:700 }}>Rooms</h2>
          <p style={{ margin:0, fontSize:11, color:'var(--text-4)' }}>{module.title}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setModal({ mode:'create' })}>+ New Room</button>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}><Spinner /></div> : (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          {rooms.length === 0 && <p style={{ color:'var(--text-4)', fontSize:13, textAlign:'center', paddingTop:40 }}>No rooms yet.</p>}
          {rooms.map(r => (
            <div key={r.id} onClick={() => onSelect(r)} style={{
              padding:'10px 14px', borderRadius:'var(--r-md)', cursor:'pointer', transition:'all .15s',
              background: selectedRoom?.id === r.id ? 'var(--cyan-dim)' : 'var(--surface-2)',
              border:`1px solid ${selectedRoom?.id === r.id ? 'rgba(34,211,238,.35)' : 'var(--border)'}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{r.title}</span>
                <span style={{ fontSize:10, color: DIFF_COLOR[r.difficulty] ?? 'var(--text-4)', fontWeight:700 }}>{r.difficulty}</span>
                <Badge status={r.status} />
              </div>
              <div style={{ display:'flex', gap:12, marginBottom:8 }}>
                <span style={{ fontSize:11, color:'var(--text-4)' }}>⏱ {r.estimated_minutes}m</span>
                <span style={{ fontSize:11, color:'var(--text-4)' }}>✦ {r.xp_reward} XP</span>
                <span style={{ fontSize:11, color:'var(--text-4)' }}>Tasks: {r.task_count ?? 0}</span>
              </div>
              <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px' }} onClick={() => setModal({ mode:'edit', item:r })}>Edit</button>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px', color: r.status==='published' ? 'var(--amber)' : 'var(--green)' }} onClick={() => togglePublish(r)}>{r.status==='published' ? 'Unpublish' : 'Publish'}</button>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px', color:'var(--red)' }} onClick={() => del(r)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <RoomModal initial={modal.item} vmTemplates={vmTemplates} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   PANEL: TASKS + QUESTIONS
══════════════════════════════════════════════════════════════════ */
function TasksPanel({ room }) {
  const [roomData, setRoomData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [taskModal, setTaskModal] = useState(null)
  const [qModal, setQModal] = useState(null)
  const [expanded, setExpanded] = useState({})

  const load = useCallback(() => {
    if (!room) return
    setLoading(true)
    api.getRoom(room.slug).then(d => { setRoomData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [room?.slug])

  useEffect(() => { setRoomData(null); load() }, [load])

  const saveTask = async (form) => {
    if (taskModal.mode === 'create') await api.adminCreateTask(room.id, form)
    else await api.adminUpdateTask(taskModal.item.id, form)
    load()
  }

  const delTask = async (t) => {
    if (!confirm(`Delete task "${t.title}"?`)) return
    await api.adminDeleteTask(t.id).catch(e => alert(e.message))
    load()
  }

  const saveQ = async (form) => {
    if (qModal.item) await api.adminUpdateQuestion(qModal.item.id, form)
    else await api.adminCreateQuestion(qModal.taskId, form)
    setRoomData(null)  // force panel to show spinner while reloading
    load()
  }

  const delQ = async (q) => {
    if (!confirm('Delete this question?')) return
    await api.adminDeleteQuestion(q.id).catch(e => alert(e.message))
    load()
  }

  if (!room) return (
    <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'var(--text-4)', fontSize:13 }}>← Select a room</p>
    </div>
  )

  const tasks = roomData?.tasks ?? []

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
        <div>
          <h2 style={{ margin:0, fontSize:15, fontWeight:700 }}>Tasks &amp; Questions</h2>
          <p style={{ margin:0, fontSize:11, color:'var(--text-4)' }}>{room.title}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setTaskModal({ mode:'create' })}>+ New Task</button>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}><Spinner /></div> : (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
          {tasks.length === 0 && <p style={{ color:'var(--text-4)', fontSize:13, textAlign:'center', paddingTop:40 }}>No tasks yet.</p>}
          {tasks.map(t => (
            <div key={t.id} style={{ border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', background:'var(--surface-2)', display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:12, padding:0 }}>
                  {expanded[t.id] ? '▾' : '▸'}
                </button>
                <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{t.title}</span>
                <span style={{ fontSize:11, color:'var(--text-4)' }}>{(t.questions ?? []).length} Q · {t.points} pts</span>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px' }} onClick={() => setTaskModal({ mode:'edit', item:t })}>Edit</button>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px' }} onClick={() => setQModal({ taskId:t.id })}>+ Q</button>
                <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 8px', color:'var(--red)' }} onClick={() => delTask(t)}>Del</button>
              </div>
              {expanded[t.id] && (
                <div style={{ padding:'8px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                  {!(t.questions ?? []).length && <p style={{ color:'var(--text-4)', fontSize:11, margin:0 }}>No questions yet. Click + Q to add one.</p>}
                  {(t.questions ?? []).map((q, qi) => (
                    <div key={q.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', background:'var(--surface-3)', borderRadius:'var(--r-sm)' }}>
                      <span style={{ fontSize:11, color:'var(--text-4)', minWidth:18 }}>{qi+1}.</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:12, fontWeight:500, color:'var(--text-2)' }}>{q.text}</p>
                        <div style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
                          <span style={{ fontSize:10, color:'var(--text-4)' }}>{q.question_type}</span>
                          <span style={{ fontSize:10, color:'var(--text-4)' }}>{q.points} pts</span>
                          {q.is_mandatory && <span style={{ fontSize:10, color:'var(--amber)' }}>mandatory</span>}
                          {(q.options ?? []).length > 0 && <span style={{ fontSize:10, color:'var(--text-4)' }}>{q.options.length} options</span>}
                        </div>
                      </div>
                      <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 6px', flexShrink:0 }} onClick={() => setQModal({ taskId:t.id, item:q })}>Edit</button>
                      <button className="btn-ghost btn-sm" style={{ fontSize:10, padding:'2px 6px', color:'var(--red)', flexShrink:0 }} onClick={() => delQ(q)}>Del</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {taskModal && <TaskModal initial={taskModal.item} onSave={saveTask} onClose={() => setTaskModal(null)} />}
      {qModal && <QuestionModal initial={qModal.item} onSave={saveQ} onClose={() => setQModal(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   ROOT PAGE EXPORT
══════════════════════════════════════════════════════════════════ */
export default function AdminContent() {
  const [selectedPath, setSelectedPath] = useState(null)
  const [selectedModule, setSelectedModule] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)

  const selectPath = (p) => { setSelectedPath(p); setSelectedModule(null); setSelectedRoom(null) }
  const selectModule = (m) => { setSelectedModule(m); setSelectedRoom(null) }

  const col = {
    flex: '0 0 270px', borderRight: '1px solid var(--border)',
    padding: '20px 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  }
  const last = {
    flex: 1, padding: '20px 14px', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', minWidth: 0,
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Content Management</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-4)', fontSize: 13 }}>
          Paths → Modules → Rooms → Tasks → Questions
        </p>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={col}><PathsPanel selectedPath={selectedPath} onSelect={selectPath} /></div>
        <div style={col}><ModulesPanel path={selectedPath} selectedModule={selectedModule} onSelect={selectModule} /></div>
        <div style={col}><RoomsPanel module={selectedModule} selectedRoom={selectedRoom} onSelect={r => setSelectedRoom(r)} /></div>
        <div style={last}><TasksPanel room={selectedRoom} /></div>
      </div>
    </div>
  )
}
