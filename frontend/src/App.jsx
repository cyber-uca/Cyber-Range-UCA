import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { api } from './api.js'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ChallengeLibrary from './pages/ChallengeLibrary.jsx'
import ChallengeDetail from './pages/ChallengeDetail.jsx'
import Workspace from './pages/Workspace.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import ChallengeCreator from './pages/ChallengeCreator.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminVmTemplates from './pages/AdminVmTemplates.jsx'
import AdminTaxonomy from './pages/AdminTaxonomy.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import AdminContent from './pages/AdminContent.jsx'
import Analytics from './pages/Analytics.jsx'
import ModuleQuiz from './pages/ModuleQuiz.jsx'
import Roadmap from './pages/Roadmap.jsx'
import RoomDetail from './pages/RoomDetail.jsx'
import RoomLab from './pages/RoomLab.jsx'
import LandingPage from './pages/LandingPage.jsx'
import Documentation from './pages/Documentation.jsx'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Topbar() {
  const { user, logout } = useAuth()
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="topbar">
      {/* Live indicator */}
      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 8, height: 8,
        }}>
          <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--green)', animation: 'glow-ping 1.8s ease-out infinite', opacity: 0.6 }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 6px var(--green)' }} />
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>LIVE</span>
      </div>

      {/* XP badge for learners */}
      {user.role === 'learner' && (
        <div className="topbar-xp">
          <span className="topbar-xp-icon">⚡</span>
          <span className="topbar-xp-val">{user.points}</span>
          <span className="topbar-xp-lbl">XP</span>
        </div>
      )}

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* User pill */}
      <div className="topbar-user">
        <div className="topbar-avatar">{initials}</div>
        <div className="topbar-user-info">
          <span className="topbar-name">{user.name.split(' ')[0]}</span>
          <span className="topbar-role">{user.role}</span>
        </div>
      </div>

      <button className="btn-ghost btn-sm topbar-signout" onClick={logout}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </button>
    </div>
  )
}

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <Topbar />
        {children}
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/roadmap" element={<RequireAuth><Roadmap /></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
      <Route path="/modules/:moduleId/quiz" element={<RequireAuth><ModuleQuiz /></RequireAuth>} />
      <Route path="/rooms/:slug" element={<RequireAuth><RoomDetail /></RequireAuth>} />
      <Route path="/rooms/:slug/lab" element={<RequireAuthBare><RoomLab /></RequireAuthBare>} />
      <Route path="/challenges" element={<RequireAuth><ChallengeLibrary /></RequireAuth>} />
      <Route path="/challenges/:id" element={<RequireAuth><ChallengeDetail /></RequireAuth>} />
      <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
      <Route path="/docs" element={<RequireAuth><Documentation /></RequireAuth>} />
      <Route path="/challenges/:id/workspace" element={<RequireAuthBare><Workspace /></RequireAuthBare>} />
      <Route path="/creator" element={<RequireRole roles={['tutor', 'admin']}><ChallengeCreator /></RequireRole>} />
      <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
      <Route path="/admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
      <Route path="/admin/vm-templates" element={<RequireRole roles={['admin']}><AdminVmTemplates /></RequireRole>} />
      <Route path="/admin/taxonomy" element={<RequireRole roles={['admin']}><AdminTaxonomy /></RequireRole>} />
      <Route path="/admin/settings" element={<RequireRole roles={['admin']}><AdminSettings /></RequireRole>} />
      <Route path="/admin/content" element={<RequireRole roles={['admin']}><AdminContent /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RequireAuthBare({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.me().then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false))
  }, [])

  const login = async (credentials) => {
    const { access_token, user } = await api.login(credentials)
    localStorage.setItem('token', access_token)
    setUser(user)
  }

  const register = async (data) => {
    const { access_token, user } = await api.register(data)
    localStorage.setItem('token', access_token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
