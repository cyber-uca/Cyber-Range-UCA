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
import Roadmap from './pages/Roadmap.jsx'
import RoomDetail from './pages/RoomDetail.jsx'
import RoomLab from './pages/RoomLab.jsx'
import LandingPage from './pages/LandingPage.jsx'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Topbar() {
  const { user, logout } = useAuth()
  return (
    <div className="topbar">
      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2.5s ease-in-out infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>LIVE</span>
      </div>
      {user.role === 'learner' && <span className="xp-badge">{user.points} XP</span>}
      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{user.name}</span>
      <button className="btn-ghost btn-sm" onClick={logout}>Sign out</button>
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
  return (
    <Routes>
      <Route path="/home" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/roadmap" element={<RequireAuth><Roadmap /></RequireAuth>} />
      <Route path="/rooms/:slug" element={<RequireAuth><RoomDetail /></RequireAuth>} />
      <Route path="/rooms/:slug/lab" element={<RequireAuthBare><RoomLab /></RequireAuthBare>} />
      <Route path="/challenges" element={<RequireAuth><ChallengeLibrary /></RequireAuth>} />
      <Route path="/challenges/:id" element={<RequireAuth><ChallengeDetail /></RequireAuth>} />
      <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
      {/* Workspace is intentionally full-screen (no sidebar chrome) - it needs the space */}
      <Route path="/challenges/:id/workspace" element={<RequireAuthBare><Workspace /></RequireAuthBare>} />
      <Route path="/creator" element={<RequireRole roles={['tutor', 'admin']}><ChallengeCreator /></RequireRole>} />
      <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
      <Route path="/admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
      <Route path="/admin/vm-templates" element={<RequireRole roles={['admin']}><AdminVmTemplates /></RequireRole>} />
      <Route path="/admin/taxonomy" element={<RequireRole roles={['admin']}><AdminTaxonomy /></RequireRole>} />
      <Route path="/admin/settings" element={<RequireRole roles={['admin']}><AdminSettings /></RequireRole>} />
      <Route path="/admin/content" element={<RequireRole roles={['admin']}><AdminContent /></RequireRole>} />
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
