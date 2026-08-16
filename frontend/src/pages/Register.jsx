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

export default function Register() {
  const { register } = useAuth()
  const { theme, toggle } = useThemeCtx()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [strength, setStrength] = useState(0)

  const update = k => e => {
    const val = e.target.value
    setForm(f => ({ ...f, [k]: val }))
    if (k === 'password') {
      let s = 0
      if (val.length >= 8) s++
      if (/[A-Z]/.test(val)) s++
      if (/[0-9]/.test(val)) s++
      if (/[^A-Za-z0-9]/.test(val)) s++
      setStrength(s)
    }
  }

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await register(form); navigate('/') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const sColors = ['var(--border)', 'var(--offensive)', 'var(--warning)', 'var(--defensive)', 'var(--mitigation)']
  const sLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', position: 'relative', padding: '40px 0' }}>

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
      `}</style>

      <Particles />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,194,230,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,194,230,0.03) 1px,transparent 1px)',
        backgroundSize: '48px 48px' }} />

      <div style={{ position: 'relative', zIndex: 1, width: 420, animation: 'fadeUp .6s ease both' }}>

        {/* logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.jpeg" alt="UCA CyRange" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', marginBottom: 14, boxShadow: '0 0 24px rgba(0,194,230,0.18)' }} />
          <div style={{ fontWeight: 800, fontSize: 17 }}>UCA CyRange</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 2 }}>Cyber Range</div>
        </div>

        {/* form box */}
        <div className="auth-card" style={{ borderRadius: 18, padding: '32px 30px', backdropFilter: 'blur(16px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800, letterSpacing: '-.01em' }}>Create account</h2>

          {error && <div style={{ background: 'var(--offensive-dim)', border: '1px solid rgba(240,82,74,0.3)', color: 'var(--offensive)', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 18 }}>{error}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Full name</label>
              <input className="ai" value={form.name} onChange={update('name')} required placeholder="Your name"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 13px', fontSize: 14 }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
              <input className="ai" type="email" value={form.email} onChange={update('email')} required
                placeholder="you@university.ma"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 13px', fontSize: 14 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="ai" type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={update('password')} required placeholder="••••••••"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 42px 10px 13px', fontSize: 14 }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', padding: 4 }}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.password.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 999,
                        background: i <= strength ? sColors[strength] : 'var(--border)', transition: 'background .3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: sColors[strength], fontWeight: 600, width: 32 }}>{sLabels[strength]}</span>
                </div>
              )}
            </div>

            <button type="submit" disabled={busy}
              style={{ width: '100%', marginTop: 22, padding: '12px', fontSize: 14, fontWeight: 700,
                borderRadius: 10, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1,
                animation: 'glowPulse 3s ease-in-out infinite' }}>
              {busy ? 'Creating…' : 'Create Account →'}
            </button>
          </form>

          <p style={{ margin: '18px 0 0', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Log in</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-dim)' }}>
          <Link to="/home" style={{ color: 'var(--text-dim)' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
