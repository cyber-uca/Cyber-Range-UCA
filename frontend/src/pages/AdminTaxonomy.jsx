import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const COLORS = ['coral','blue','teal','purple']
const C_MAP  = { coral:'var(--red)', blue:'var(--blue)', teal:'var(--teal)', purple:'var(--purple)' }

export default function AdminTaxonomy() {
  const [categories,  setCategories]  = useState([])
  const [difficulties,setDifficulties]= useState([])
  const [catForm,  setCatForm]  = useState({ slug:'', name:'', color:'teal', description:'', sort_order:0 })
  const [diffForm, setDiffForm] = useState({ slug:'', name:'', sort_order:0 })
  const [error, setError] = useState('')

  const refresh = () => {
    api.listCategories().then(setCategories).catch(() => {})
    api.listDifficulties().then(setDifficulties).catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  const addCat  = async e => { e.preventDefault(); setError(''); try { await api.createCategory(catForm);  setCatForm({ slug:'', name:'', color:'teal', description:'', sort_order:0 }); refresh() } catch(err) { setError(err.message) } }
  const addDiff = async e => { e.preventDefault(); setError(''); try { await api.createDifficulty(diffForm);setDiffForm({ slug:'', name:'', sort_order:0 }); refresh() } catch(err) { setError(err.message) } }
  const delCat  = async id => { try { await api.deleteCategory(id);   refresh() } catch(err) { setError(err.message) } }
  const delDiff = async id => { try { await api.deleteDifficulty(id); refresh() } catch(err) { setError(err.message) } }

  return (
    <div className="page fade-up">
      <div className="page-header">
        <h1>Categories &amp; Difficulties</h1>
        <p className="lead" style={{ marginTop:6 }}>
          Add or remove entries here and they instantly appear everywhere — no redeploy needed.
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Categories */}
        <div>
          <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0 }}>Categories</h3>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{categories.length}</span>
            </div>
            {categories.length === 0
              ? <div style={{ padding:20, color:'var(--text-muted)', fontSize:13 }}>No categories yet.</div>
              : <table className="data-table">
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id}>
                        <td><span className={`badge badge-${c.slug}`}>{c.name}</span></td>
                        <td style={{ color:'var(--text-dim)', fontSize:12, fontFamily:'var(--mono)' }}>{c.slug}</td>
                        <td><button className="btn-danger btn-sm" onClick={() => delCat(c.id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
          <div className="form-section">
            <h3>Add a category</h3>
            <form onSubmit={addCat}>
              <div className="form-row"><label>Name</label><input value={catForm.name} onChange={e => setCatForm({...catForm,name:e.target.value})} required placeholder="e.g. Forensics" /></div>
              <div className="form-row"><label>Slug</label><input value={catForm.slug} onChange={e => setCatForm({...catForm,slug:e.target.value})} required placeholder="forensics" style={{ fontFamily:'var(--mono)' }} /></div>
              <div className="form-row">
                <label>Color</label>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setCatForm({...catForm,color:c})}
                      style={{ padding:'5px 12px', borderRadius:999, fontSize:12, cursor:'pointer',
                        background: catForm.color===c ? `${C_MAP[c]}18` : 'var(--surface-2)',
                        color: C_MAP[c],
                        border: `1px solid ${catForm.color===c ? C_MAP[c]+'60' : 'var(--border)'}`,
                        fontWeight: catForm.color===c ? 700 : 400 }}>{c}</div>
                  ))}
                </div>
              </div>
              <div className="form-row"><label>Description</label><input value={catForm.description} onChange={e => setCatForm({...catForm,description:e.target.value})} placeholder="Short description" /></div>
              <button className="btn-primary" type="submit">Add category</button>
            </form>
          </div>
        </div>

        {/* Difficulties */}
        <div>
          <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0 }}>Difficulties</h3>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{difficulties.length}</span>
            </div>
            {difficulties.length === 0
              ? <div style={{ padding:20, color:'var(--text-muted)', fontSize:13 }}>No difficulties yet.</div>
              : <table className="data-table">
                  <tbody>
                    {difficulties.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight:600 }}>{d.name}</td>
                        <td style={{ color:'var(--text-dim)', fontSize:12, fontFamily:'var(--mono)' }}>order: {d.sort_order}</td>
                        <td><button className="btn-danger btn-sm" onClick={() => delDiff(d.id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
          <div className="form-section">
            <h3>Add a difficulty</h3>
            <form onSubmit={addDiff}>
              <div className="form-row"><label>Name</label><input value={diffForm.name} onChange={e => setDiffForm({...diffForm,name:e.target.value})} required placeholder="e.g. Expert" /></div>
              <div className="form-row"><label>Slug</label><input value={diffForm.slug} onChange={e => setDiffForm({...diffForm,slug:e.target.value})} required placeholder="expert" style={{ fontFamily:'var(--mono)' }} /></div>
              <div className="form-row"><label>Sort order</label><input type="number" value={diffForm.sort_order} onChange={e => setDiffForm({...diffForm,sort_order:Number(e.target.value)})} /></div>
              <button className="btn-primary" type="submit">Add difficulty</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
