import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function ModuleQuiz() {
  const { moduleId } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [answers, setAnswers]   = useState({})   // questionId → optionId
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]     = useState(null)  // result from POST submit

  useEffect(() => {
    api.getModuleQuiz(moduleId)
      .then(setQuiz)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [moduleId])

  const selectOption = (questionId, optionId) => {
    if (result) return  // already submitted
    setAnswers(p => ({ ...p, [questionId]: optionId }))
  }

  const submit = async () => {
    if (!quiz) return
    const unanswered = quiz.questions.filter(q => !answers[q.id])
    if (unanswered.length > 0) {
      alert(`Please answer all ${unanswered.length} remaining question(s) before submitting.`)
      return
    }
    setSubmitting(true)
    try {
      const payload = quiz.questions.map(q => ({
        question_id: q.id,
        option_id:   answers[q.id],
      }))
      const res = await api.submitModuleQuiz(moduleId, payload)
      setResult(res)
    } catch (e) {
      alert('Submission failed: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div className="page">
      <div style={{ background:'rgba(240,82,74,0.08)', border:'1px solid rgba(240,82,74,0.3)',
        borderRadius:'var(--r-lg)', padding:'24px 28px', maxWidth:520 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--red)', marginBottom:8 }}>
          Quiz not available
        </div>
        <p style={{ fontSize:13, color:'var(--text-3)', margin:'0 0 16px' }}>{error}</p>
        <Link to="/roadmap" style={{ fontSize:13, color:'var(--cyan)' }}>← Back to Roadmap</Link>
      </div>
    </div>
  )

  const answered = Object.keys(answers).length
  const total    = quiz.questions.length

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    const passed = result.passed
    return (
      <div className="page fade-up" style={{ maxWidth:640 }}>
        <Link to="/roadmap" style={{ fontSize:12, color:'var(--text-4)', display:'block', marginBottom:24 }}>
          ← Roadmap
        </Link>

        {/* Pass/Fail banner */}
        <div style={{
          borderRadius:'var(--r-lg)', padding:'28px 32px', marginBottom:32, textAlign:'center',
          background: passed ? 'rgba(20,201,168,0.07)' : 'rgba(240,82,74,0.07)',
          border:`1px solid ${passed ? 'rgba(20,201,168,0.35)' : 'rgba(240,82,74,0.35)'}`,
        }}>
          <div style={{ fontSize:40, marginBottom:12 }}>{passed ? '🏆' : '📚'}</div>
          <h1 style={{ fontSize:24, marginBottom:8, color: passed ? '#14C9A8' : 'var(--red)' }}>
            {passed ? 'Quiz Passed!' : 'Not quite — try again'}
          </h1>
          <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:20 }}>
            {quiz.module_title} · Module Quiz
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:32 }}>
            {[
              { val:`${result.score}/${result.max_score}`, lbl:'Score',   color:'var(--cyan)' },
              { val:`${result.pct}%`,                      lbl:'Result',  color: passed ? '#14C9A8' : 'var(--red)' },
              { val:`${result.pass_pct}%`,                 lbl:'To pass', color:'var(--text-4)' },
            ].map(s => (
              <div key={s.lbl} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11, color:'var(--text-4)' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-question breakdown */}
        <h2 style={{ fontSize:16, marginBottom:16 }}>Question breakdown</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {result.results.map((r, i) => (
            <div key={r.question_id} style={{
              background:'var(--surface)', border:`1px solid var(--border)`,
              borderLeft:`3px solid ${r.is_correct ? '#14C9A8' : 'var(--red)'}`,
              borderRadius:'var(--r-lg)', padding:'14px 18px',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--cyan)',
                  background:'rgba(0,194,230,0.1)', padding:'2px 7px', borderRadius:5, flexShrink:0 }}>
                  Q{i+1}
                </span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{r.question_text}</span>
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom: r.explanation ? 8 : 0 }}>
                <span style={{ fontSize:12, color: r.is_correct ? '#14C9A8' : 'var(--red)', fontWeight:700 }}>
                  {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                </span>
                {!r.is_correct && r.correct_option_text && (
                  <span style={{ fontSize:12, color:'var(--text-4)' }}>
                    Correct answer: <strong style={{ color:'#14C9A8' }}>{r.correct_option_text}</strong>
                  </span>
                )}
                <span style={{ fontSize:12, color:'var(--text-4)', marginLeft:'auto' }}>
                  {r.is_correct ? `+${r.points_awarded} pts` : '0 pts'}
                </span>
              </div>
              {r.explanation && (
                <p style={{ fontSize:12, color:'var(--text-4)', margin:0, lineHeight:1.6,
                  borderTop:'1px solid var(--border)', paddingTop:8 }}>
                  {r.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:28 }}>
          {!passed && (
            <button className="btn-primary" onClick={() => { setResult(null); setAnswers({}) }}>
              Retry Quiz
            </button>
          )}
          <Link to="/roadmap">
            <button className="btn-ghost">Back to Roadmap</button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Quiz form ─────────────────────────────────────────────────────────────
  return (
    <div className="page fade-up" style={{ maxWidth:640 }}>
      <Link to="/roadmap" style={{ fontSize:12, color:'var(--text-4)', display:'block', marginBottom:20 }}>
        ← Roadmap
      </Link>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase',
          letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:6 }}>
          Module Quiz
        </p>
        <h1 style={{ fontSize:26, marginBottom:8 }}>{quiz.module_title}</h1>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:13, color:'var(--text-4)' }}>{total} questions · {quiz.total_points} pts</span>
          <span style={{ fontSize:13, color:'var(--amber)', fontWeight:600 }}>Pass at {quiz.pass_pct}%</span>
          <span style={{ fontSize:13, color:'var(--text-4)' }}>{answered}/{total} answered</span>
          {quiz.last_attempt && (
            <span style={{ fontSize:12, color: quiz.last_attempt.passed ? '#14C9A8' : 'var(--red)' }}>
              Last attempt: {quiz.last_attempt.pct ?? Math.round(quiz.last_attempt.score / quiz.last_attempt.max_score * 100)}% — {quiz.last_attempt.passed ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {quiz.questions.map((q, qi) => {
          const selected = answers[q.id]
          return (
            <div key={q.id} style={{
              background:'rgba(13,24,38,0.6)', border:'1px solid var(--border)',
              borderLeft:`3px solid ${selected ? 'var(--cyan)' : 'var(--border-md)'}`,
              borderRadius:'var(--r-lg)', padding:'16px 20px',
            }}>
              <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, color:'var(--cyan)',
                  background:'rgba(0,194,230,0.1)', padding:'2px 8px', borderRadius:6, flexShrink:0 }}>
                  Q{qi+1}
                </span>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.5 }}>{q.text}</span>
                  <span style={{ marginLeft:8, fontSize:10, color:'var(--text-4)' }}>{q.points} pts</span>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {q.options.map(o => {
                  const isSelected = selected === o.id
                  return (
                    <div key={o.id} onClick={() => selectOption(q.id, o.id)} style={{
                      display:'flex', gap:10, padding:'9px 12px', borderRadius:8,
                      background: isSelected ? 'rgba(0,194,230,0.1)' : 'rgba(7,13,22,0.5)',
                      border:`1px solid ${isSelected ? 'rgba(0,194,230,0.4)' : 'var(--border)'}`,
                      cursor:'pointer', transition:'all .15s',
                    }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, marginTop:1,
                        border:`2px solid ${isSelected ? 'var(--cyan)' : 'var(--border-md)'}`,
                        background: isSelected ? 'var(--cyan)' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {isSelected && <div style={{ width:6, height:6, borderRadius:'50%', background:'#000' }} />}
                      </div>
                      <span style={{ fontSize:13, color: isSelected ? 'var(--text)' : 'var(--text-4)' }}>
                        {o.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress + submit */}
      <div style={{ marginTop:28, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
          <div style={{ height:4, flex:1, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, background:'var(--cyan)',
              width:`${total > 0 ? (answered/total)*100 : 0}%`, transition:'width .3s' }} />
          </div>
          <span style={{ fontSize:12, color:'var(--text-4)', whiteSpace:'nowrap' }}>
            {answered}/{total}
          </span>
        </div>
        <button className="btn-primary" onClick={submit} disabled={submitting || answered < total}
          style={{ padding:'10px 24px', fontSize:14, fontWeight:700, opacity: answered < total ? 0.5 : 1 }}>
          {submitting ? 'Submitting…' : 'Submit Quiz'}
        </button>
      </div>

      {quiz.questions.length === 0 && (
        <p style={{ color:'var(--text-4)', fontSize:13, textAlign:'center', marginTop:40 }}>
          No quiz questions have been added to this module yet.
        </p>
      )}
    </div>
  )
}
