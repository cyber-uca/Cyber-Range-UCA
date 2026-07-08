import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const COLOR_OPTIONS = ['coral', 'blue', 'teal', 'purple']

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

  const addCategory = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createCategory(catForm)
      setCatForm({ slug: '', name: '', color: 'coral', description: '', sort_order: 0 })
      refresh()
    } catch (err) { setError(err.message) }
  }

  const removeCategory = async (id) => {
    try { await api.deleteCategory(id); refresh() } catch (err) { setError(err.message) }
  }

  const addDifficulty = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createDifficulty(diffForm)
      setDiffForm({ slug: '', name: '', sort_order: 0 })
      refresh()
    } catch (err) { setError(err.message) }
  }

  const removeDifficulty = async (id) => {
    try { await api.deleteDifficulty(id); refresh() } catch (err) { setError(err.message) }
  }

  return (
    <div className="page">
      <h1>Categories &amp; Difficulties</h1>
      <p className="subtitle">
        These used to be a fixed list in the code. Now they're rows in a table — add one here and it
        appears in the Challenge Library filters, the Dashboard, and the Challenge Creator immediately,
        with no code change and no redeploy.
      </p>
      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h2>Categories</h2>
          <table className="data-table" style={{ marginBottom: 16 }}>
            <thead><tr><th>Name</th><th>Color</th><th></th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td><span className={`category-tag tag-${c.color}`}>{c.name}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.color}</td>
                  <td><button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => removeCategory(c.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-section">
            <h2>Add a category</h2>
            <form onSubmit={addCategory}>
              <div className="form-row"><label>Name</label><input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required /></div>
              <div className="form-row"><label>Slug (machine key)</label><input className="mono" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} placeholder="forensics" required /></div>
              <div className="form-row">
                <label>Color</label>
                <select value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}>
                  {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row"><label>Description</label><input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></div>
              <button className="btn-primary" type="submit">Add category</button>
            </form>
          </div>
        </div>

        <div>
          <h2>Difficulties</h2>
          <table className="data-table" style={{ marginBottom: 16 }}>
            <thead><tr><th>Name</th><th>Order</th><th></th></tr></thead>
            <tbody>
              {difficulties.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{d.sort_order}</td>
                  <td><button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => removeDifficulty(d.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-section">
            <h2>Add a difficulty</h2>
            <form onSubmit={addDifficulty}>
              <div className="form-row"><label>Name</label><input value={diffForm.name} onChange={(e) => setDiffForm({ ...diffForm, name: e.target.value })} required /></div>
              <div className="form-row"><label>Slug</label><input className="mono" value={diffForm.slug} onChange={(e) => setDiffForm({ ...diffForm, slug: e.target.value })} placeholder="expert" required /></div>
              <div className="form-row"><label>Sort order</label><input type="number" value={diffForm.sort_order} onChange={(e) => setDiffForm({ ...diffForm, sort_order: Number(e.target.value) })} /></div>
              <button className="btn-primary" type="submit">Add difficulty</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
