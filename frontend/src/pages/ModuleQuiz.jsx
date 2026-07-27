import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function ModuleQuiz() {
  const { moduleId } = useParams()
  const navigate     = useNavigate()

  const [quiz, setQuiz]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [answers, setAnswers]     = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState(null)

  useEffect(() => {
    api.getModuleQuiz(moduleId)
      .then(setQuiz)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [moduleId])

  const selectOption = (questionId, optionId) => {
    if (result) return
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
      const payload = quiz.questions.map(q => ({ question_id: q.id, option_id: answers[q.id] }))
      const res = await api.submitModuleQuiz(moduleId, payload)
      setResult(res)
    } catch (e) {
      alert('Submission failed: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div className="page">
      <div className="mq-error">
        <div className="mq-error-title">Quiz not available</div>
        <p className="mq-error-desc">{error}</p>
        <Link to="/roadmap" className="mq-back-link">← Back to Roadmap</Link>
      </div>
    </div>
  )

  const answered = Object.keys(answers).length
  const total    = quiz.questions.length
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const passed  = result.passed
    const pctColor = passed ? 'var(--green)' : result.pct >= 50 ? 'var(--amber)' : 'var(--red)'
    return (
      <div className="page mq-page fade-up" style={{ maxWidth: 660 }}>
        <Link to="/roadmap" className="mq-breadcrumb">← Roadmap</Link>

        {/* Result banner */}
        <div className={`mq-result-banner${passed ? ' pass' : ' fail'}`}>
          <div className="mq-result-icon">{passed ? '🏆' : '📚'}</div>
          <h1 className="mq-result-title" style={{ color: passed ? 'var(--green)' : 'var(--red)' }}>
            {passed ? 'Quiz Passed!' : 'Not quite — try again'}
          </h1>
          <p className="mq-result-module">{quiz.module_title} · Module Quiz</p>
          <div className="mq-result-stats">
            {[
              { val: `${result.score}/${result.max_score}`, lbl: 'Score',   color: 'var(--cyan)' },
              { val: `${result.pct}%`,                      lbl: 'Result',  color: pctColor },
              { val: `${result.pass_pct}%`,                 lbl: 'To pass', color: 'var(--text-4)' },
            ].map(s => (
              <div key={s.lbl} className="mq-result-stat">
                <div className="mq-result-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="mq-result-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <h2 className="mq-breakdown-title">Question Breakdown</h2>
        <div className="mq-breakdown">
          {result.results.map((r, i) => (
            <div key={r.question_id} className={`mq-result-row${r.is_correct ? ' correct' : ' wrong'}`}>
              <div className="mq-result-row-header">
                <span className="mq-q-num">Q{i + 1}</span>
                <span className="mq-q-text">{r.question_text}</span>
              </div>
              <div className="mq-result-row-footer">
                <span className={`mq-verdict${r.is_correct ? ' ok' : ' err'}`}>
                  {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                </span>
                {!r.is_correct && r.correct_option_text && (
                  <span className="mq-correct-answer">
                    Correct: <strong>{r.correct_option_text}</strong>
                  </span>
                )}
                <span className="mq-pts-earned">{r.is_correct ? `+${r.points_awarded} pts` : '0 pts'}</span>
              </div>
              {r.explanation && (
                <p className="mq-explanation">{r.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mq-actions">
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

  // ── Quiz form ──────────────────────────────────────────────────────────────
  return (
    <div className="page mq-page fade-up" style={{ maxWidth: 660 }}>
      <Link to="/roadmap" className="mq-breadcrumb">← Roadmap</Link>

      {/* Header */}
      <div className="mq-header">
        <div className="mq-eyebrow">Module Quiz</div>
        <h1 className="mq-title">{quiz.module_title}</h1>
        <div className="mq-meta">
          <span>{total} questions · {quiz.total_points} pts</span>
          <span className="mq-pass-threshold">Pass at {quiz.pass_pct}%</span>
          <span>{answered}/{total} answered</span>
          {quiz.last_attempt && (
            <span style={{ color: quiz.last_attempt.passed ? 'var(--green)' : 'var(--red)' }}>
              Last: {quiz.last_attempt.pct ?? Math.round(quiz.last_attempt.score / quiz.last_attempt.max_score * 100)}%
              {' '}—{' '}{quiz.last_attempt.passed ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="mq-questions">
        {quiz.questions.map((q, qi) => {
          const selected = answers[q.id]
          return (
            <div key={q.id} className={`mq-question${selected ? ' answered' : ''}`}>
              <div className="mq-question-header">
                <span className="mq-q-num">Q{qi + 1}</span>
                <div>
                  <span className="mq-q-text">{q.text}</span>
                  <span className="mq-q-pts">{q.points} pts</span>
                </div>
              </div>
              <div className="mq-options">
                {q.options.map(o => {
                  const isSelected = selected === o.id
                  return (
                    <div
                      key={o.id}
                      className={`mq-option${isSelected ? ' selected' : ''}`}
                      onClick={() => selectOption(q.id, o.id)}
                    >
                      <div className="mq-radio">
                        {isSelected && <div className="mq-radio-dot" />}
                      </div>
                      <span className="mq-option-text">{o.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress + submit */}
      <div className="mq-footer">
        <div className="mq-progress">
          <div className="mq-progress-track">
            <div className="mq-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="mq-progress-label">{answered}/{total}</span>
        </div>
        <button
          className="btn-primary"
          onClick={submit}
          disabled={submitting || answered < total}
          style={{ opacity: answered < total ? 0.5 : 1 }}
        >
          {submitting ? 'Submitting…' : 'Submit Quiz →'}
        </button>
      </div>

      {quiz.questions.length === 0 && (
        <p className="mq-empty">No quiz questions have been added to this module yet.</p>
      )}
    </div>
  )
}
