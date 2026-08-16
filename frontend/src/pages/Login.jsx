import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useThemeCtx } from '../App.jsx'

function Particles() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const x = c.getContext('2d'); let id
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight }
    resize(); window.addEventListener('resize', resize)
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
      r: Math.random() * 1.2 + .4,
    }))
    const draw = () => {
      x.clearRect(0, 0, c.width, c.height)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        x.fillStyle = 'rgba(0,194,230,0.45)'; x.fill()
      })
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 120) {
          x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y)
          x.strokeStyle = `rgba(0,194,230,${.12 * (1 - d / 120)})`
          x.lineWidth = .6; x.stroke()
        }
      }))
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
}

export default function Login() {
  const { login } = useAuth()
  const { theme, toggle } = useThemeCtx()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await login({ email, password }); navigate('/') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', position: 'relative' }}>

      {/* Floating theme toggle */}
      <button
        className="theme-toggle"
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}
      >
        <div className="theme-toggle-thumb">
          <span className="theme-toggle-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
        </div>
      </button>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 16px rgba(0,194,230,.2)}50%{box-shadow:0 0 30px rgba(0,194,230,.5)}}
        .ai:focus{outline:none!important;border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(0,194,230,0.1)!important;}
        .ai{transition:border-color .2s,box-shadow .2s;}
        .demo-row:hover{background:var(--surface-hover)!important;cursor:pointer;}
      `}</style>

      <Particles />

      {/* grid overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,194,230,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,194,230,0.03) 1px,transparent 1px)',
        backgroundSize: '48px 48px' }} />

      {/* card */}
      <div style={{ position: 'relative', zIndex: 1, width: 400, animation: 'fadeUp .6s ease both' }}>

        {/* logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.jpeg" alt="UCA CyRange" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', marginBottom: 14, boxShadow: '0 0 24px rgba(0,194,230,0.18)' }} />
          <div style={{ fontWeight: 800, fontSize: 17 }}>UCA CyRange</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 2 }}>Cyber Range</div>
        </div>

        {/* form box */}
        <div className="auth-card" style={{ borderRadius: 18, padding: '32px 30px', backdropFilter: 'blur(16px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800, letterSpacing: '-.01em' }}>Welcome back</h2>

          {error && <div style={{ background: 'var(--offensive-dim)', border: '1px solid rgba(240,82,74,0.3)', color: 'var(--offensive)', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 18 }}>{error}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
              <input className="ai" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 13px', fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="ai" type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 42px 10px 13px', fontSize: 14 }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', padding: 4 }}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy}
              style={{ width: '100%', marginTop: 22, padding: '12px', fontSize: 14, fontWeight: 700,
                borderRadius: 10, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1,
                animation: 'glowPulse 3s ease-in-out infinite' }}>
              {busy ? 'Signing in…' : 'Log In →'}
            </button>
          </form>

          <p style={{ margin: '18px 0 0', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            No account? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign up</Link>
          </p>
        </div>

        {/* demo chips */}
        <div className="auth-demo-chips" style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          {[['learner@platform.local','learner123','Learner'],
            ['tutor@platform.local','tutor123','Tutor'],
            ['admin@platform.local','admin123','Admin']].map(([e, p, role], i) => (
            <div key={role} className="demo-row" onClick={() => { setEmail(e); setPassword(p) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 14px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                transition: 'background .15s' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: 'var(--accent-dim)', color: 'var(--accent)' }}>{role}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-dim)' }}>
          <Link to="/home" style={{ color: 'var(--text-dim)' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
