import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const ANIM = `@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`
const COLOR_OPTIONS = ['coral', 'blue', 'teal', 'purple']
const colorMap = { coral: 'var(--offensive)', blue: 'var(--defensive)', teal: 'var(--mitigation)', purple: 'var(--combined)' }

export default function AdminTaxonomy() {
  const [categories, setCategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [catForm, setCatForm] = useState({ slug: '', name: '', color: 'coral', description: '', sort_order: 0 })
  const [diffForm, setDiffForm] = useState({ slug: '', name: '', sort_order: 0 })
  const [error, setError] = useState('')

  const refresh = () => {
    api.listCategories().then(setCategories).catch(() => {})
    api.listDifficulties().then(setDifficulties).catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  const addCategory = async e => {
    e.preventDefault(); setError('')
    try { await api.createCategory(catForm); setCatForm({ slug: '', name: '', color: 'coral', description: '', sort_order: 0 }); refresh() }
    catch (err) { setError(err.message) }
  }
  const removeCategory = async id => { try { await api.deleteCategory(id); refresh() } catch (err) { setError(err.message) } }

  const addDifficulty = async e => {
    e.preventDefault(); setError('')
    try { await api.createDifficulty(diffForm); setDiffForm({ slug: '', name: '', sort_order: 0 }); refresh() }
    catch (err) { setError(err.message) }
  }
  const removeDifficulty = async id => { try { await api.deleteDifficulty(id); refresh() } catch (err) { setError(err.message) } }

  return (
    <div className="page">
      <style>{ANIM}</style>

      <div style={{ marginBottom: 28, animation: 'fadeUp .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mitigation)', boxShadow: '0 0 8px var(--mitigation)' }} />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--mitigation)', fontWeight: 700 }}>Admin · Taxonomy</span>
        </div>
        <h1>Categories &amp; Difficulties</h1>
        <p className="subtitle">Add a category or difficulty here and it instantly appears across the platform — no code changes, no redeploy.</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── CATEGORIES ── */}
        <div style={{ animation: 'fadeUp .4s .05s ease both' }}>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(12px)', marginBottom: 14 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Categories</h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{categories.length} total</span>
            </div>
            {categories.length === 0
              ? <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No categories yet.</div>
              : <table className="data-table">
                  <thead><tr><th>Name</th><th>Color</th><th></th></tr></thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id}>
                        <td><span className={`category-tag tag-${c.color}`}>{c.name}</span></td>
                        <td><span style={{ fontSize: 11, color: colorMap[c.color] || 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.color}</span></td>
                        <td><button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => removeCategory(c.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
          <div className="form-section">
            <h2>Add a category</h2>
            <form onSubmit={addCategory}>
              <div className="form-row"><label>Name</label><input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required placeholder="e.g. Forensics" /></div>
              <div className="form-row"><label>Slug</label><input className="mono" value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="forensics" required /></div>
              <div className="form-row">
                <label>Color</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {COLOR_OPTIONS.map(c => (
                    <div key={c} onClick={() => setCatForm({ ...catForm, color: c })}
                      style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                        background: catForm.color === c ? `${colorMap[c]}20` : 'var(--surface-2)',
                        color: colorMap[c], border: `1px solid ${catForm.color === c ? colorMap[c] + '60' : 'var(--border)'}`,
                        fontWeight: catForm.color === c ? 700 : 400 }}>{c}</div>
                  ))}
                </div>
              </div>
              <div className="form-row"><label>Description</label><input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Short description" /></div>
              <button className="btn-primary" type="submit" style={{ padding: '9px 20px' }}>Add category</button>
            </form>
          </div>
        </div>

        {/* ── DIFFICULTIES ── */}
        <div style={{ animation: 'fadeUp .4s .08s ease both' }}>
          <div style={{ background: 'rgba(13,24,38,0.7)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(12px)', marginBottom: 14 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Difficulties</h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{difficulties.length} total</span>
            </div>
            {difficulties.length === 0
              ? <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No difficulties yet.</div>
              : <table className="data-table">
                  <thead><tr><th>Name</th><th>Order</th><th></th></tr></thead>
                  <tbody>
                    {difficulties.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.sort_order}</td>
                        <td><button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => removeDifficulty(d.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
          <div className="form-section">
            <h2>Add a difficulty</h2>
            <form onSubmit={addDifficulty}>
              <div className="form-row"><label>Name</label><input value={diffForm.name} onChange={e => setDiffForm({ ...diffForm, name: e.target.value })} required placeholder="e.g. Expert" /></div>
              <div className="form-row"><label>Slug</label><input className="mono" value={diffForm.slug} onChange={e => setDiffForm({ ...diffForm, slug: e.target.value })} placeholder="expert" required /></div>
              <div className="form-row"><label>Sort order</label><input type="number" value={diffForm.sort_order} onChange={e => setDiffForm({ ...diffForm, sort_order: Number(e.target.value) })} /></div>
              <button className="btn-primary" type="submit" style={{ padding: '9px 20px' }}>Add difficulty</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
