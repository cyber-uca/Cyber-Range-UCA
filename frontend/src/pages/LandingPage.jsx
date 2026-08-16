import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useThemeCtx } from '../App.jsx'
import { api } from '../api.js'

/* ─────────── icons ─────────── */
const Shield = ({c='currentColor',s=24})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const Hacker = ({c='currentColor',s=24})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/></svg>
const Wrench = ({c='currentColor',s=24})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
const Zap   = ({c='currentColor',s=24})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const Layers= ({c='currentColor',s=24})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const Term  = ({c='currentColor',s=24})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>

const Logo = ({size=32})=><img src="/logo.png" alt="UCA CyRange" style={{ width:size, height:size, objectFit:'contain' }} />

/* ─────────── typewriter ─────────── */
function TypeWriter({ words }) {
  const [idx,setIdx]=useState(0); const [text,setText]=useState(''); const [del,setDel]=useState(false)
  useEffect(()=>{
    const w=words[idx], speed=del?35:75
    const t=setTimeout(()=>{
      if(!del&&text===w){setTimeout(()=>setDel(true),1800);return}
      if(del&&text===''){setDel(false);setIdx(i=>(i+1)%words.length);return}
      setText(p=>del?p.slice(0,-1):w.slice(0,p.length+1))
    },speed)
    return ()=>clearTimeout(t)
  },[text,del,idx,words])
  return <span style={{color:'var(--accent)'}}>{text}<span style={{animation:'blink 1s step-end infinite'}}>|</span></span>
}

/* ─────────── particle network ─────────── */
function Particles() {
  const ref=useRef(null)
  useEffect(()=>{
    const c=ref.current; if(!c)return
    const x=c.getContext('2d'); let id
    const resize=()=>{c.width=c.offsetWidth;c.height=c.offsetHeight}
    resize(); window.addEventListener('resize',resize)
    const N=60, pts=Array.from({length:N},()=>({
      x:Math.random()*c.width,y:Math.random()*c.height,
      vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,
      r:Math.random()*1.4+.4
    }))
    const draw=()=>{
      x.clearRect(0,0,c.width,c.height)
      pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy
        if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0
        if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0
        x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2)
        x.fillStyle='rgba(0,194,230,0.5)';x.fill()
      })
      pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{
        const d=Math.hypot(a.x-b.x,a.y-b.y)
        if(d<130){x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y)
          x.strokeStyle=`rgba(0,194,230,${.14*(1-d/130)})`;x.lineWidth=.7;x.stroke()}
      }))
      id=requestAnimationFrame(draw)
    }
    draw()
    return ()=>{cancelAnimationFrame(id);window.removeEventListener('resize',resize)}
  },[])
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
}

/* ─────────── grid bg ─────────── */
function GridBg(){
  return(
    <div style={{position:'absolute',inset:0,pointerEvents:'none',
      backgroundImage:'linear-gradient(rgba(0,194,230,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,194,230,0.04) 1px,transparent 1px)',
      backgroundSize:'48px 48px',maskImage:'radial-gradient(ellipse at 50% 0%,black 30%,transparent 80%)'}}/>
  )
}

/* ─────────── animated stat ─────────── */
function Stat({target,suffix='',label,color='var(--accent)'}) {
  const [n,setN]=useState(0),ref=useRef(null)
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{
      if(!e.isIntersecting)return;obs.disconnect()
      let s=0;const step=Math.ceil(target/(1400/16))
      const t=setInterval(()=>{s+=step;if(s>=target){setN(target);clearInterval(t)}else setN(s)},16)
    },{threshold:.3})
    if(ref.current)obs.observe(ref.current)
    return ()=>obs.disconnect()
  },[target])
  return(
    <div ref={ref} style={{textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:36,fontWeight:900,color,lineHeight:1}}>{n}{suffix}</div>
      <div style={{fontSize:12,color:'var(--text-muted)',marginTop:6,letterSpacing:'.04em'}}>{label}</div>
    </div>
  )
}

/* ─────────── fake terminal ─────────── */
function FakeTerminal() {
  const lines = [
    { t:300,  txt:'$ candump can0 | grep "19B"', c:'#00C2E6' },
    { t:900,  txt:'  can0  19B   [8]  00 00 00 00 00 00 00 01', c:'#4ADE80' },
    { t:1500, txt:'  can0  19B   [8]  00 00 00 00 00 00 00 01', c:'#4ADE80' },
    { t:2100, txt:'$ cansend can0 19B#0000000000000001', c:'#00C2E6' },
    { t:2800, txt:'  [+] Frame injected — door unlock triggered', c:'#F5A623' },
    { t:3400, txt:'$ echo "FLAG{unauth_can_injection_2026}"', c:'#00C2E6' },
    { t:4000, txt:'  FLAG{unauth_can_injection_2026}', c:'#22C55E' },
    { t:4600, txt:'  [✓] Challenge solved — 300 XP awarded', c:'#9B7CF0' },
  ]
  const [shown, setShown] = useState([])
  useEffect(() => {
    const timers = lines.map(l => setTimeout(() => setShown(p => [...p, l]), l.t))
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <div style={{ background:'#04070C', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden', fontFamily:'var(--font-mono)', fontSize:12 }}>
      {/* title bar */}
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'#060B12' }}>
        {['#F0524A','#F5A623','#22C55E'].map(col=><div key={col} style={{width:10,height:10,borderRadius:'50%',background:col}}/>)}
        <span style={{ marginLeft:8, color:'var(--text-dim)', fontSize:11 }}>uca-cyrange — bash — CAN Bus Attacker</span>
      </div>
      <div style={{ padding:'16px 20px', minHeight:190 }}>
        {shown.map((l,i) => (
          <div key={i} style={{ color:l.c, marginBottom:4, opacity:0, animation:'termLine .3s ease forwards' }}>{l.txt}</div>
        ))}
        <span style={{ color:'var(--text-dim)', animation:'blink 1s step-end infinite' }}>█</span>
      </div>
    </div>
  )
}

/* ─────────── SDV hero image ─────────── */
function CarHero() {
  const [attempt,setAttempt]=useState(0), [loaded,setLoaded]=useState(false)
  const [tilt,setTilt]=useState({x:0,y:0}), ref=useRef(null)
  const sources=['/Software-Defined-Vehicle.jpg','/sdv.jpg']

  const onMove = e => {
    const r=ref.current?.getBoundingClientRect(); if(!r)return
    const x=((e.clientX-r.left)/r.width-.5)*12
    const y=((e.clientY-r.top)/r.height-.5)*-8
    setTilt({x,y})
  }
  const onLeave = () => setTilt({x:0,y:0})

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ position:'relative', width:'100%', maxWidth:560,
        transform:`perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        transition:'transform .1s ease', animation:'floatY 5s ease-in-out infinite' }}>
      <div style={{ position:'absolute', top:'15%', left:'5%', right:'5%', bottom:'-12%',
        background:'radial-gradient(ellipse,rgba(0,194,230,0.22) 0%,transparent 70%)',
        filter:'blur(44px)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:1, borderRadius:18, overflow:'hidden',
        border:'1px solid rgba(0,194,230,0.38)',
        boxShadow:'0 0 0 1px rgba(0,194,230,0.08),0 32px 90px rgba(0,0,0,0.8)' }}>
        {!loaded && <div style={{ width:'100%', paddingTop:'58%',
          background:'linear-gradient(135deg,#0D1826,#121F30)', animation:'pulse 1.5s ease-in-out infinite' }}/>}
        <img key={attempt} src={sources[attempt]} alt="Software-defined vehicle"
          onLoad={()=>setLoaded(true)}
          onError={()=>{if(attempt<sources.length-1){setLoaded(false);setAttempt(a=>a+1)}}}
          style={{ width:'100%', display:loaded?'block':'none', filter:'brightness(0.88) saturate(1.08)' }}/>
        {loaded && <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          background:'linear-gradient(180deg,rgba(7,13,22,0.04) 0%,rgba(7,13,22,0.5) 100%)' }}/>}
        {[{top:0,left:0,d:'M2 36 L2 2 L36 2'},{top:0,right:0,d:'M62 36 L62 2 L26 2'},
          {bottom:0,left:0,d:'M2 28 L2 62 L36 62'},{bottom:0,right:0,d:'M62 28 L62 62 L26 62'}
        ].map((b,i)=>(
          <svg key={i} style={{position:'absolute',width:64,height:64,pointerEvents:'none',...b}} viewBox="0 0 64 64">
            <path d={b.d} fill="none" stroke="rgba(0,194,230,0.7)" strokeWidth="2" strokeLinecap="square"/>
          </svg>
        ))}
      </div>
      <div style={{ position:'absolute', top:14, right:14, zIndex:2,
        background:'rgba(4,10,20,0.92)', borderRadius:8, padding:'7px 12px',
        border:'1px solid rgba(0,194,230,0.42)', backdropFilter:'blur(14px)',
        display:'flex', alignItems:'center', gap:7, boxShadow:'0 0 18px rgba(0,194,230,0.12)' }}>
        <Shield c="#00C2E6" s={14}/>
        <div><div style={{fontSize:10,fontWeight:700,color:'#00C2E6',letterSpacing:'.08em'}}>SECURED</div>
          <div style={{fontSize:9,color:'var(--text-muted)'}}>Isolated Lab Env</div></div>
      </div>
      <div style={{ position:'absolute', bottom:14, left:14, zIndex:2,
        display:'flex', gap:6, alignItems:'center',
        background:'rgba(4,10,20,0.88)', borderRadius:6, padding:'5px 10px',
        border:'1px solid rgba(0,194,230,0.22)', backdropFilter:'blur(8px)' }}>
        <div style={{width:7,height:7,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 8px #22C55E'}}/>
        <span style={{fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>LIVE · Simulation Active</span>
      </div>
    </div>
  )
}

/* ─────────── main export ─────────── */
export default function LandingPage() {
  const { user } = useAuth()
  const { theme, toggle } = useThemeCtx()
  const navigate = useNavigate()
  useEffect(() => { if (user) navigate('/') }, [user, navigate])

  const [stats, setStats] = useState({ total_rooms: 0, total_paths: 0, total_learners: 0, total_questions: 0 })
  useEffect(() => { api.publicStats().then(setStats).catch(() => {}) }, [])

  const cats = [
    { label:'RISK MANAGEMENT', color:'var(--combined)', bg:'rgba(155,124,240,0.10)', hover:'rgba(155,124,240,0.35)', icon:<Layers c="var(--combined)" s={28}/>, desc:'Assess, model and manage cybersecurity risks in ICS/OT environments using IEC 62443 and industry frameworks.', count:'15+' },
    { label:'OFFENSIVE', color:'var(--offensive)', bg:'rgba(240,82,74,0.10)', hover:'rgba(240,82,74,0.35)', icon:<Hacker c="var(--offensive)" s={28}/>, desc:'Attack industrial control systems — exploit real vulnerabilities in PLC, SCADA, CAN bus and field devices.', count:'20+' },
    { label:'DEFENSIVE', color:'var(--defensive)', bg:'rgba(74,144,240,0.10)', hover:'rgba(74,144,240,0.35)', icon:<Shield c="var(--defensive)" s={28}/>, desc:'Detect and respond to threats in OT networks using SIEM, IDS, network segmentation and monitoring tools.', count:'16+' },
    { label:'MITIGATION', color:'var(--mitigation)', bg:'rgba(20,201,168,0.10)', hover:'rgba(20,201,168,0.35)', icon:<Wrench c="var(--mitigation)" s={28}/>, desc:'Harden industrial systems, develop incident response plans and recover from ICS/OT attacks.', count:'14+' },
  ]
  const feats = [
    { icon:<Zap c="#00C2E6" s={22}/>, title:'Real Attack Scenarios', desc:'PLC exploitation, SCADA manipulation, CAN bus injection, grid attacks — all in isolated, production-grade VMs.' },
    { icon:<Layers c="#9B7CF0" s={22}/>, title:'Multi-VM Topology', desc:'Each lab provisions a full network of virtual machines — attacker, target, monitoring — in under a minute.' },
    { icon:<Term c="#14C9A8" s={22}/>, title:'Structured Learning', desc:'Guided tasks walk you through discovery, evidence collection, analysis, and mitigation — not just flag hunting.' },
    { icon:<Shield c="#F5A623" s={22}/>, title:'Skill Tracking', desc:'XP, leaderboard and per-domain progress so you know exactly where to level up next.' },
  ]
  const steps = [
    { n:'01', title:'Choose a Domain', desc:'Pick from Automotive, Smart Grid, Aeronautics or Banking — more added continuously.' },
    { n:'02', title:'Provision Your Lab', desc:'One click spins up an isolated VM network on Proxmox — no setup, no hardware.' },
    { n:'03', title:'Attack & Defend', desc:'Use real tools on real protocols: Modbus, DNP3, CAN bus, SCADA-LTS, Wazuh.' },
    { n:'04', title:'Submit & Progress', desc:'Answer questions, earn XP, complete modules and unlock domain certifications.' },
  ]


  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-ui)', overflowX:'hidden' }}>
      <style>{`
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{top:-4px}100%{top:100%}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes termLine{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 18px rgba(0,194,230,.3)}50%{box-shadow:0 0 38px rgba(0,194,230,.65)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .nav-link:hover{color:var(--text)!important;}
        .cat-card:hover{transform:translateY(-6px)!important;}
        .feat-card:hover{border-color:rgba(0,194,230,.4)!important;transform:translateY(-5px)!important;}
        .step-card:hover{border-color:var(--accent)!important;}
        .cta-btn{transition:box-shadow .25s,transform .15s!important;}
        .cta-btn:hover{box-shadow:0 0 34px rgba(0,194,230,.55)!important;transform:translateY(-1px)!important;}

        /* Landing page responsive */
        .lp-nav { padding: 0 52px !important; }
        .lp-nav-links { display: flex !important; }
        .lp-hero { grid-template-columns: 1fr 1fr !important; padding: 80px 80px 64px !important; }
        .lp-hero-h1 { font-size: 50px !important; }
        .lp-stats { padding: 36px 80px !important; }
        .lp-stats-inner { flex-direction: row !important; }
        .lp-stats-divider { display: block !important; }
        .lp-cats { padding: 80px !important; }
        .lp-cats-grid { grid-template-columns: repeat(4,1fr) !important; }
        .lp-how { padding: 80px !important; }
        .lp-steps-grid { grid-template-columns: repeat(4,1fr) !important; }
        .lp-demo { padding: 80px !important; }
        .lp-demo-grid { grid-template-columns: 1fr 1fr !important; }
        .lp-feats-grid { grid-template-columns: 1fr 1fr !important; }
        .lp-cta { padding: 100px 80px !important; }
        .lp-footer { padding: 32px 80px !important; flex-direction: row !important; }
        .lp-footer-links { display: flex !important; }

        @media (max-width: 1024px) {
          .lp-nav { padding: 0 24px !important; }
          .lp-nav-links { display: none !important; }
          .lp-hero { grid-template-columns: 1fr !important; padding: 48px 24px 40px !important; text-align: center; }
          .lp-hero-h1 { font-size: 36px !important; }
          .lp-hero-car { display: none !important; }
          .lp-hero-btns { justify-content: center !important; }
          .lp-stats { padding: 24px 20px !important; }
          .lp-stats-inner { flex-wrap: wrap !important; gap: 20px !important; justify-content: center !important; }
          .lp-stats-divider { display: none !important; }
          .lp-cats { padding: 48px 20px !important; }
          .lp-cats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .lp-how { padding: 48px 20px !important; }
          .lp-steps-grid { grid-template-columns: repeat(2,1fr) !important; gap: 14px !important; }
          .lp-steps-connector { display: none !important; }
          .lp-demo { padding: 48px 20px !important; }
          .lp-demo-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .lp-feats-grid { grid-template-columns: 1fr 1fr !important; }
          .lp-cta { padding: 60px 20px !important; }
          .lp-footer { flex-direction: column !important; gap: 16px !important; padding: 24px 20px !important; text-align: center !important; }
          .lp-footer-links { justify-content: center !important; }
        }

        @media (max-width: 480px) {
          .lp-hero-h1 { font-size: 28px !important; }
          .lp-cats-grid { grid-template-columns: 1fr !important; }
          .lp-steps-grid { grid-template-columns: 1fr !important; }
          .lp-feats-grid { grid-template-columns: 1fr !important; }
          .lp-hero-badge { display: none !important; }
        }
      `}</style>

      {/* ════ NAV ════ */}
      <nav className="lp-nav-wrap lp-nav" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 52px', height:66,
        borderBottom:'1px solid var(--border)', background:'rgba(7,13,22,0.85)', backdropFilter:'blur(20px)',
        position:'sticky', top:0, zIndex:200 }}>
        <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top:0, behavior:'smooth' }) }}
          style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', color:'inherit' }}>
          <Logo size={34}/>
          <div>
            <div style={{ fontWeight:800, fontSize:15, lineHeight:1.2, letterSpacing:'-.01em' }}>UCA CyRange</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.1em' }}>Cyber Range</div>
          </div>
        </a>
        <div className="lp-nav-links" style={{ display:'flex', gap:36, fontSize:13, color:'var(--text-muted)' }}>
          {[
            { label:'Features',     href:'#features'     },
            { label:'Challenges',   href:'#challenges'   },
            { label:'How It Works', href:'#how-it-works' },
            { label:'About',        href:'/docs', external: false },
          ].map(item => (
            item.href.startsWith('#')
              ? <a key={item.label} href={item.href} className="nav-link"
                  style={{ cursor:'pointer', transition:'color .15s', textDecoration:'none', color:'inherit' }}
                  onClick={e => {
                    e.preventDefault()
                    document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior:'smooth' })
                  }}>
                  {item.label}
                </a>
              : <Link key={item.label} to={item.href} className="nav-link"
                  style={{ cursor:'pointer', transition:'color .15s', textDecoration:'none', color:'inherit' }}>
                  {item.label}
                </Link>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-thumb">
              <span className="theme-toggle-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
            </div>
          </button>
          <Link to="/login"><button className="btn-secondary" style={{ padding:'8px 22px' }}>Log In</button></Link>
          <Link to="/register"><button className="btn-primary cta-btn" style={{ padding:'8px 22px', animation:'glowPulse 3s ease-in-out infinite' }}>Sign Up Free</button></Link>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <section className="lp-hero" style={{ position:'relative', minHeight:'calc(100vh - 66px)', display:'grid',
        gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center', padding:'80px 80px 64px', overflow:'hidden' }}>
        <Particles/>
        <GridBg/>
        <div style={{ position:'absolute', top:'-15%', left:'-8%', width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,194,230,0.07) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'0', right:'-5%', width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(74,144,240,0.06) 0%,transparent 70%)', pointerEvents:'none' }}/>
        {/* horizontal scan line */}
        <div style={{ position:'absolute', left:0, right:0, height:2,
          background:'linear-gradient(90deg,transparent,rgba(0,194,230,0.22),transparent)',
          animation:'scanline 7s linear infinite', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1, animation:'fadeUp .9s ease both' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:11, letterSpacing:'.12em',
            textTransform:'uppercase', color:'var(--accent)', marginBottom:22, fontWeight:700,
            background:'rgba(0,194,230,0.08)', border:'1px solid rgba(0,194,230,0.25)',
            borderRadius:999, padding:'6px 16px' }}>
            <Zap c="var(--accent)" s={11}/>&nbsp;Multi-Domain ICS/OT Cyber Range
          </div>
          <h1 className="lp-hero-h1" style={{ fontSize:50, fontWeight:900, lineHeight:1.08, margin:'0 0 18px', letterSpacing:'-.025em' }}>
            REALISTIC<br/>
            <TypeWriter words={['CAN BUS ATTACKS','SCADA EXPLOITS','PLC HACKING','GRID ATTACKS','OTA COMPROMISE','ICS DEFENSE']}/>
            <br/>TRAINING
          </h1>
          <p style={{ fontSize:15, color:'var(--text-muted)', lineHeight:1.85, maxWidth:430, margin:'0 0 38px' }}>
            Train on real ICS/OT attacks and defenses in fully isolated environments.
            Automotive, Smart Grid, Aeronautics and more — no hardware, no setup.
          </p>
          <div className="lp-hero-btns" style={{ display:'flex', gap:14 }}>
            <Link to="/register">
              <button className="btn-primary cta-btn" style={{ padding:'14px 36px', fontSize:15, borderRadius:11 }}>
                Start Hacking →
              </button>
            </Link>
            <Link to="/login">
              <button className="btn-secondary" style={{ padding:'14px 28px', fontSize:15, borderRadius:11 }}>
                Watch Demo
              </button>
            </Link>
          </div>

        </div>

        <div className="lp-hero-car" style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'center', animation:'fadeUp .9s .15s ease both' }}>
          <CarHero/>
        </div>
      </section>

      {/* ════ STATS BAR ════ */}
      <div className="lp-stats" style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'36px 80px' }}>
        <div className="lp-stats-inner" style={{ display:'flex', alignItems:'center', justifyContent:'space-around' }}>
          <Stat target={stats.total_rooms}     suffix=""  label="Published Rooms"  color="var(--accent)"/>
          <div className="lp-stats-divider" style={{width:1,height:48,background:'var(--border)'}}/>
          <Stat target={stats.total_paths}     suffix=""  label="Learning Paths"   color="var(--defensive)"/>
          <div className="lp-stats-divider" style={{width:1,height:48,background:'var(--border)'}}/>
          <Stat target={stats.total_learners}  suffix="+" label="Learners"         color="var(--mitigation)"/>
          <div className="lp-stats-divider" style={{width:1,height:48,background:'var(--border)'}}/>
          <Stat target={stats.total_questions} suffix="+" label="Questions"        color="var(--warning)"/>
          <div className="lp-stats-divider" style={{width:1,height:48,background:'var(--border)'}}/>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:36,fontWeight:900,color:'var(--combined)',lineHeight:1}}>24/7</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>Lab Access</div>
          </div>
        </div>
      </div>

      {/* ════ CATEGORIES ════ */}
      <section id="challenges" className="lp-cats" style={{ padding:'80px 80px 64px', background:'linear-gradient(180deg,var(--bg) 0%,var(--surface) 100%)' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--accent)', fontWeight:700, marginBottom:12 }}>Challenge Tracks</div>
          <h2 style={{ fontSize:34, fontWeight:900, margin:0, letterSpacing:'-.01em' }}>Pick Your Attack Surface</h2>
        </div>
        <div className="lp-cats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:26 }}>
          {cats.map((cat,i)=>(
            <div key={cat.label} className="cat-card"
              style={{ background:`linear-gradient(145deg,${cat.bg},var(--surface-2))`,
                border:'1px solid var(--border)', borderRadius:20, padding:'36px 30px',
                transition:'transform .2s,border-color .2s', cursor:'default',
                animation:`fadeUp .6s ${i*.12}s ease both`, position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=cat.hover}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ position:'absolute', right:18, top:8, fontSize:96, fontWeight:900,
                color:cat.color, opacity:.05, fontFamily:'var(--font-mono)', lineHeight:1, userSelect:'none' }}>{i+1}</div>
              <div style={{ width:54, height:54, borderRadius:14, background:cat.bg,
                display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20,
                border:`1px solid ${cat.color}40`, boxShadow:`0 0 20px ${cat.color}18` }}>
                {cat.icon}
              </div>
              <div style={{ fontWeight:900, fontSize:17, color:cat.color, textTransform:'uppercase',
                letterSpacing:'.07em', marginBottom:12 }}>{cat.label}</div>
              <p style={{ color:'var(--text-muted)', fontSize:13, margin:'0 0 24px', lineHeight:1.7 }}>{cat.desc}</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:900, color:cat.color }}>{cat.count}</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Challenges</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section id="how-it-works" className="lp-how-section lp-how" style={{ padding:'80px', background:'var(--surface)', borderTop:'1px solid var(--border)' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--accent)', fontWeight:700, marginBottom:12 }}>How It Works</div>
          <h2 style={{ fontSize:34, fontWeight:900, margin:0, letterSpacing:'-.01em' }}>From Zero to Flag in 4 Steps</h2>
        </div>
        <div className="lp-steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, position:'relative' }}>
          <div className="lp-steps-connector" style={{ position:'absolute', top:36, left:'12%', right:'12%', height:1,
            background:'linear-gradient(90deg,transparent,var(--border),var(--border),transparent)', zIndex:0 }}/>
          {steps.map((s,i)=>(
            <div key={s.n} className="step-card"
              style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:16,
                padding:'28px 22px', transition:'border-color .2s', position:'relative', zIndex:1,
                animation:`fadeUp .6s ${i*.1}s ease both` }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--accent-dim)',
                border:'2px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-mono)', fontWeight:900, fontSize:15, color:'var(--accent)', marginBottom:18 }}>{s.n}</div>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:8 }}>{s.title}</div>
              <p style={{ color:'var(--text-muted)', fontSize:12, lineHeight:1.7, margin:0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════ TERMINAL DEMO + FEATURES ════ */}
      <section id="features" className="lp-demo" style={{ padding:'80px', background:'var(--bg)', borderTop:'1px solid var(--border)' }}>
        <div className="lp-demo-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center' }}>
          {/* left — terminal */}
          <div style={{ animation:'fadeUp .7s ease both' }}>
            <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--accent)', fontWeight:700, marginBottom:12 }}>Live Lab Preview</div>
            <h2 style={{ fontSize:30, fontWeight:900, margin:'0 0 10px', letterSpacing:'-.01em' }}>See It in Action</h2>
            <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.8, margin:'0 0 28px' }}>
              This is a real CAN Bus Attacker challenge session. Inject a frame, unlock the door, capture the flag.
            </p>
            <FakeTerminal/>
          </div>
          {/* right — feature list */}
          <div className="lp-feats-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, animation:'fadeUp .7s .15s ease both' }}>
            {feats.map((f,i)=>(
              <div key={f.title} className="feat-card"
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16,
                  padding:'24px 20px', transition:'border-color .2s,transform .2s',
                  animation:`fadeUp .5s ${i*.1}s ease both` }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'rgba(0,194,230,0.08)',
                  display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14,
                  border:'1px solid rgba(0,194,230,0.14)' }}>{f.icon}</div>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>{f.title}</div>
                <p style={{ color:'var(--text-muted)', fontSize:11, lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ CTA BANNER ════ */}
      <section className="lp-cta" style={{ position:'relative', padding:'100px 80px', textAlign:'center',
        background:'linear-gradient(135deg,rgba(0,194,230,0.07) 0%,rgba(74,144,240,0.07) 50%,rgba(155,124,240,0.05) 100%)',
        borderTop:'1px solid var(--border)', overflow:'hidden' }}>
        <Particles/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--accent)', fontWeight:700, marginBottom:16 }}>Get Started Today</div>
          <h2 style={{ fontSize:42, fontWeight:900, margin:'0 0 16px', letterSpacing:'-.02em', lineHeight:1.1 }}>
            Ready to Master<br/>ICS/OT Security?
          </h2>
          <p style={{ color:'var(--text-muted)', fontSize:15, maxWidth:480, margin:'0 auto 40px', lineHeight:1.8 }}>
            Join security researchers and engineers training on real industrial systems. Free to start, no credit card required.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/register">
              <button className="btn-primary cta-btn" style={{ padding:'16px 44px', fontSize:16, borderRadius:12, animation:'glowPulse 3s ease-in-out infinite' }}>
                Create Free Account →
              </button>
            </Link>
            <Link to="/login">
              <button className="btn-secondary" style={{ padding:'16px 32px', fontSize:16, borderRadius:12 }}>
                Log In
              </button>
            </Link>
          </div>
          <p style={{ marginTop:20, fontSize:12, color:'var(--text-dim)' }}>
            No credit card · No hardware · Start in 60 seconds
          </p>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="lp-footer" style={{ borderTop:'1px solid var(--border)', padding:'32px 80px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        fontSize:12, color:'var(--text-dim)', background:'var(--surface)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Logo size={22}/>
          <span style={{ fontWeight:600, color:'var(--text-muted)' }}>UCA CyRange</span>
        </div>
        <span>© 2026 UCA CyRange · Open-source ICS/OT Cyber Range</span>
        <div className="lp-footer-links" style={{ display:'flex', gap:24 }}>
          {[['Log In','/login'],['Sign Up','/register']].map(([l,h])=>(
            <Link key={l} to={h} style={{ color:'var(--text-dim)', transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='var(--text-muted)'}
              onMouseLeave={e=>e.target.style.color='var(--text-dim)'}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
