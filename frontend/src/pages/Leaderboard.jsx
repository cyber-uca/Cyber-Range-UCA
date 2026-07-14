import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

const MEDALS = ['🥇','🥈','🥉']
const MEDAL_COLOR = ['var(--amber)','#B0BEC5','#B07A40']

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])

  useEffect(() => { api.leaderboard().then(setEntries).catch(() => {}) }, [])

  const myIdx = entries.findIndex(e => e.name === user?.name)
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Header */}
      <div style={{ marginLeft:-44, marginRight:-44, padding:'40px 44px 36px',
        background:'linear-gradient(180deg, rgba(251,191,36,0.04) 0%, transparent 100%)',
        borderBottom:'1px solid var(--border)', marginBottom:40 }}>
        <p className="fade-up" style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8 }}>
          Global Rankings
        </p>
        <h1 className="fade-up-1" style={{ fontSize:32, marginBottom:10 }}>Leaderboard</h1>
        <p className="fade-up-2" style={{ color:'var(--text-3)', fontSize:14 }}>
          Rankings update in real time as challenges are solved.
        </p>
      </div>

      {/* Your position */}
      {myIdx >= 0 && (
        <div className="fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--cyan-dim)', border:'1px solid rgba(34,211,238,0.2)',
          borderRadius:'var(--r-lg)', padding:'16px 22px', marginBottom:32 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:2 }}>Your position</div>
            <div style={{ color:'var(--text-3)', fontSize:13 }}>{user?.name}</div>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:26, fontWeight:900, color:'var(--cyan)', lineHeight:1 }}>#{myIdx+1}</div>
              <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>rank</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:26, fontWeight:900, color:'var(--amber)', lineHeight:1 }}>{entries[myIdx]?.points}</div>
              <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="fade-up-1" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:32 }}>
          {[1,0,2].map((pos,i) => {
            const entry = top3[pos]
            const mc = MEDAL_COLOR[pos]
            return (
              <div key={pos} style={{
                background: pos===0 ? `linear-gradient(145deg, rgba(251,191,36,0.08), var(--surface))` : 'var(--surface)',
                border: `1px solid ${pos===0 ? 'rgba(251,191,36,0.25)' : 'var(--border)'}`,
                borderRadius:'var(--r-lg)', padding:'24px 20px', textAlign:'center',
                transform: pos===0 ? 'scale(1.03)' : 'scale(1)',
              }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{MEDALS[pos]}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:24, fontWeight:900, color:mc, marginBottom:4 }}>{entry.points}</div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text-2)', marginBottom:2 }}>{entry.name}</div>
                {entry.institution && <div style={{ fontSize:11, color:'var(--text-4)' }}>{entry.institution}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card fade-up-2" style={{ padding:0, overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:56 }}>#</th>
              <th>Name</th>
              <th>Institution</th>
              <th style={{ textAlign:'right', paddingRight:20 }}>XP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e,i) => (
              <tr key={i} style={{ background: e.name===user?.name ? 'rgba(34,211,238,0.03)' : 'transparent' }}>
                <td>
                  <span style={{ fontFamily:'var(--mono)', fontSize:12,
                    color: i<3 ? MEDAL_COLOR[i] : 'var(--text-4)', fontWeight: i<3?800:400 }}>
                    {i+1}
                  </span>
                </td>
                <td style={{ fontWeight: e.name===user?.name ? 700:400, color: e.name===user?.name?'var(--cyan)':'var(--text-2)' }}>{e.name}</td>
                <td style={{ color:'var(--text-4)', fontSize:12 }}>{e.institution||'—'}</td>
                <td style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--amber)', textAlign:'right', paddingRight:20 }}>{e.points}</td>
              </tr>
            ))}
            {entries.length===0 && (
              <tr><td colSpan={4} style={{ textAlign:'center', padding:'48px', color:'var(--text-4)' }}>No scores yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
