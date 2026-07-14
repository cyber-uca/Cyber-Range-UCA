import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const blank = { title:'', description:'', objectives:'', category_id:'', difficulty_id:'', challenge_type:'standard_flag', points:100, time_limit_minutes:90, tags:'', flag:'', vm_template_ids:[], hints:[] }

export default function ChallengeCreator() {
  const [tab,            setTab]            = useState('mine')
  const [myChallenges,   setMyChallenges]   = useState([])
  const [templates,      setTemplates]      = useState([])
  const [categories,     setCategories]     = useState([])
  const [difficulties,   setDifficulties]   = useState([])
  const [challengeTypes, setChallengeTypes] = useState(['standard_flag'])
  const [form,           setForm]           = useState(blank)
  const [editingId,      setEditingId]      = useState(null)
  const [message,        setMessage]        = useState('')
  const [msgType,        setMsgType]        = useState('success')
  const [importPack,     setImportPack]     = useState('')
  const [importFlag,     setImportFlag]     = useState('')

  const refresh = () => api.listMyChallenges().then(setMyChallenges).catch(() => {})
  useEffect(() => {
    refresh()
    api.listVmTemplates().then(setTemplates).catch(() => {})
    api.listCategoriesPublic().then(setCategories).catch(() => {})
    api.listDifficultiesPublic().then(setDifficulties).catch(() => {})
    api.listChallengeTypesPublic().then(r => setChallengeTypes(r.registered_types)).catch(() => {})
  }, [])

  const upd  = k => e => setForm(f => ({ ...f, [k]:e.target.value }))
  const mkB  = () => ({ ...blank, category_id:categories[0]?.id||'', difficulty_id:difficulties[0]?.id||'' })
  const togTpl = id => setForm(f => ({ ...f, vm_template_ids:f.vm_template_ids.includes(id)?f.vm_template_ids.filter(t=>t!==id):[...f.vm_template_ids,id] }))
  const addHint = () => setForm(f => ({ ...f, hints:[...f.hints,{content:'',cost:10}] }))
  const updHint = (i,k,v) => setForm(f => { const h=[...f.hints]; h[i]={...h[i],[k]:v}; return {...f,hints:h} })
  const rmHint  = i => setForm(f => ({ ...f, hints:f.hints.filter((_,j)=>j!==i) }))

  const startNew  = () => { setForm(mkB()); setEditingId(null); setTab('new') }
  const startEdit = c => {
    setForm({ title:c.title, description:c.description, objectives:c.objectives||'',
      category_id:c.category.id, difficulty_id:c.difficulty.id, challenge_type:c.challenge_type,
      points:c.points, time_limit_minutes:c.time_limit_minutes, tags:c.tags||'', flag:'',
      vm_template_ids:c.vms.map(v=>v.vm_template.id), hints:[] })
    setEditingId(c.id); setTab('new')
  }

  const submit = async e => {
    e.preventDefault(); setMessage('')
    try {
      const p = { ...form, points:Number(form.points), time_limit_minutes:Number(form.time_limit_minutes) }
      if (editingId) { await api.updateChallenge(editingId,p); setMessage('Challenge updated.') }
      else           { await api.createChallenge(p);           setMessage('Challenge created as draft.') }
      setMsgType('success'); refresh(); setTab('mine')
    } catch(err) { setMessage(err.message); setMsgType('error') }
  }

  const publish    = async id => { await api.publishChallenge(id); refresh() }
  const remove     = async id => { if (confirm('Delete?')) { await api.deleteChallenge(id); refresh() } }
  const exportPack = async id => {
    const pack = await api.exportChallenge(id)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(pack,null,2)],{type:'application/json'}))
    a.download = `${pack.title.replace(/\s+/g,'_').toLowerCase()}.pack.json`; a.click()
  }
  const doImport = async () => {
    setMessage('')
    try { await api.importChallenge(JSON.parse(importPack),importFlag); setMessage('Imported.'); setMsgType('success'); setImportPack(''); setImportFlag(''); refresh(); setTab('mine') }
    catch(err) { setMessage(err.message); setMsgType('error') }
  }

  return (
    <div className="page fade-up">
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>Teaching</p>
        <h1 style={{ fontSize:28, marginBottom:8 }}>Challenge Creator</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>Build, publish and share challenges as portable packs.</p>
      </div>

      <div className="tab-nav">
        <button className={tab==='mine'  ?'active':''} onClick={() => setTab('mine')}>My Challenges</button>
        <button className={tab==='new'   ?'active':''} onClick={startNew}>{editingId?'Editing…':'New Challenge'}</button>
        <button className={tab==='import'?'active':''} onClick={() => setTab('import')}>Import Pack</button>
      </div>

      {message && <div className={msgType==='success'?'alert-success':'alert-error'} style={{ marginBottom:16 }}>{message}</div>}

      {tab==='mine' && (
        <div>
          {myChallenges.map(c => (
            <div key={c.id} className="item-row">
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:'var(--r-xs)',
                  background:c.is_published?'var(--green-dim)':'var(--amber-dim)',
                  color:c.is_published?'var(--green)':'var(--amber)',
                  border:`1px solid ${c.is_published?'rgba(52,211,153,0.2)':'rgba(251,191,36,0.2)'}` }}>
                  {c.is_published?'Published':'Draft'}
                </span>
                <strong style={{ fontSize:14, color:'var(--text)' }}>{c.title}</strong>
                <span style={{ color:'var(--text-4)', fontSize:12 }}>{c.category.name} · {c.difficulty.name}</span>
                <span style={{ fontFamily:'var(--mono)', color:'var(--amber)', fontSize:12, fontWeight:700 }}>{c.points} XP</span>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button className="btn-secondary btn-sm" onClick={() => startEdit(c)}>Edit</button>
                {!c.is_published && <button className="btn-primary btn-sm" onClick={() => publish(c.id)}>Publish</button>}
                <button className="btn-secondary btn-sm" onClick={() => exportPack(c.id)}>Export</button>
                <button className="btn-danger btn-sm" onClick={() => remove(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {myChallenges.length===0 && (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-4)' }}>
              <div style={{ fontSize:15, marginBottom:10 }}>No challenges yet.</div>
              <button className="btn-primary" onClick={startNew}>Create your first →</button>
            </div>
          )}
        </div>
      )}

      {tab==='new' && (
        <form onSubmit={submit}>
          <div className="form-section">
            <h3 style={{ color:'var(--text-2)' }}>Details</h3>
            <div className="form-row"><label>Title</label><input value={form.title} onChange={upd('title')} required placeholder="e.g. CAN Bus Injection" /></div>
            <div className="form-row"><label>Description</label><textarea rows={3} value={form.description} onChange={upd('description')} required placeholder="What is this challenge about?" /></div>
            <div className="form-row"><label>Objectives</label><textarea rows={2} value={form.objectives} onChange={upd('objectives')} placeholder="What will learners practice? (semicolons)" /></div>
            <div className="form-grid">
              <div className="form-row"><label>Category</label><select value={form.category_id} onChange={upd('category_id')}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="form-row"><label>Difficulty</label><select value={form.difficulty_id} onChange={upd('difficulty_id')}>{difficulties.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div className="form-row"><label>Type</label><select value={form.challenge_type} onChange={upd('challenge_type')}>{challengeTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-row"><label>Points</label><input type="number" value={form.points} onChange={upd('points')} /></div>
              <div className="form-row"><label>Time limit (min)</label><input type="number" value={form.time_limit_minutes} onChange={upd('time_limit_minutes')} /></div>
            </div>
            <div className="form-row"><label>Tags</label><input value={form.tags} onChange={upd('tags')} placeholder="CAN Bus, ECU, OBD-II" /></div>
            <div className="form-row">
              <label>Flag {editingId && <span style={{ fontWeight:400, color:'var(--text-4)' }}>(blank = keep current)</span>}</label>
              <input style={{ fontFamily:'var(--mono)' }} value={form.flag} onChange={upd('flag')} placeholder="FLAG{...}" required={!editingId} />
            </div>
          </div>

          <div className="form-section">
            <h3 style={{ color:'var(--text-2)' }}>VM Templates</h3>
            {templates.length===0
              ? <p style={{ color:'var(--text-4)', fontSize:13 }}>No VM templates — add them in Admin → Infrastructure.</p>
              : <div className="chip-list">{templates.map(t => <div key={t.id} className={`chip${form.vm_template_ids.includes(t.id)?' on':''}`} onClick={() => togTpl(t.id)}>{t.name}</div>)}</div>
            }
          </div>

          <div className="form-section">
            <h3 style={{ color:'var(--text-2)' }}>Hints</h3>
            {form.hints.map((h,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                <input placeholder="Hint text" value={h.content} onChange={e => updHint(i,'content',e.target.value)} />
                <input type="number" value={h.cost} onChange={e => updHint(i,'cost',Number(e.target.value))} style={{ width:90 }} />
                <button type="button" className="btn-danger btn-sm" onClick={() => rmHint(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn-ghost btn-sm" onClick={addHint}>+ Add hint</button>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-primary" type="submit">{editingId?'Save changes':'Create draft'}</button>
            <button type="button" className="btn-secondary" onClick={() => setTab('mine')}>Cancel</button>
          </div>
        </form>
      )}

      {tab==='import' && (
        <div className="form-section">
          <h3 style={{ color:'var(--text-2)' }}>Import a challenge pack</h3>
          <p style={{ color:'var(--text-4)', fontSize:13, marginBottom:16, lineHeight:1.7 }}>
            Paste JSON exported from this platform or another deployment.
          </p>
          <div className="form-row"><label>Pack JSON</label><textarea rows={10} style={{ fontFamily:'var(--mono)', fontSize:12 }} value={importPack} onChange={e => setImportPack(e.target.value)} placeholder={'{"pack_version": 1, ...}'} /></div>
          <div className="form-row"><label>New flag</label><input style={{ fontFamily:'var(--mono)' }} value={importFlag} onChange={e => setImportFlag(e.target.value)} placeholder="FLAG{...}" /></div>
          <button className="btn-primary" onClick={doImport}>Import as draft</button>
        </div>
      )}
    </div>
  )
}
