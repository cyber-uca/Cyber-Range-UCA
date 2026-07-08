const BASE = '/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  register: (data) =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle),

  login: (data) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle),

  me: () => fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(handle),

  listChallenges: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return fetch(`${BASE}/challenges${qs ? `?${qs}` : ''}`, { headers: authHeaders() }).then(handle)
  },

  getChallenge: (id) => fetch(`${BASE}/challenges/${id}`, { headers: authHeaders() }).then(handle),

  getHints: (id) => fetch(`${BASE}/challenges/${id}/hints`, { headers: authHeaders() }).then(handle),

  submitFlag: (id, value) =>
    fetch(`${BASE}/challenges/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    }).then(handle),

  leaderboard: () => fetch(`${BASE}/challenges/meta/leaderboard`, { headers: authHeaders() }).then(handle),

  listVmTemplates: () => fetch(`${BASE}/vm-templates`, { headers: authHeaders() }).then(handle),

  startEnvironment: (challengeId, topology) =>
    fetch(`${BASE}/environments/${challengeId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(topology),
    }).then(handle),

  getEnvironment: (id) => fetch(`${BASE}/environments/${id}`, { headers: authHeaders() }).then(handle),

  resetEnvironment: (id) =>
    fetch(`${BASE}/environments/${id}/reset`, { method: 'POST', headers: authHeaders() }).then(handle),

  destroyEnvironment: (id) =>
    fetch(`${BASE}/environments/${id}/destroy`, { method: 'POST', headers: authHeaders() }).then(handle),

  // ---------- Challenge Creator (tutor/admin) ----------
  listMyChallenges: () => fetch(`${BASE}/challenges/mine/list`, { headers: authHeaders() }).then(handle),

  createChallenge: (data) =>
    fetch(`${BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  updateChallenge: (id, data) =>
    fetch(`${BASE}/challenges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  deleteChallenge: (id) =>
    fetch(`${BASE}/challenges/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  publishChallenge: (id) =>
    fetch(`${BASE}/challenges/${id}/publish`, { method: 'POST', headers: authHeaders() }).then(handle),

  exportChallenge: (id) => fetch(`${BASE}/challenges/${id}/export`, { headers: authHeaders() }).then(handle),

  importChallenge: (pack, flag) =>
    fetch(`${BASE}/challenges/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ pack, flag }),
    }).then(handle),

  // ---------- Admin ----------
  adminStats: () => fetch(`${BASE}/admin/stats`, { headers: authHeaders() }).then(handle),

  adminListUsers: () => fetch(`${BASE}/admin/users`, { headers: authHeaders() }).then(handle),

  adminUpdateUserRole: (id, role) =>
    fetch(`${BASE}/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ role }),
    }).then(handle),

  adminUpdateUserActive: (id, is_active) =>
    fetch(`${BASE}/admin/users/${id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ is_active }),
    }).then(handle),

  adminListVmTemplates: () => fetch(`${BASE}/admin/vm-templates`, { headers: authHeaders() }).then(handle),

  adminCreateVmTemplate: (data) =>
    fetch(`${BASE}/admin/vm-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeleteVmTemplate: (id) =>
    fetch(`${BASE}/admin/vm-templates/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // ---------- Categories & Difficulties (data-driven taxonomy) ----------
  // Public reads - any authenticated user (Dashboard, Library filters, Creator picker)
  listCategoriesPublic: () => fetch(`${BASE}/categories`, { headers: authHeaders() }).then(handle),
  listDifficultiesPublic: () => fetch(`${BASE}/difficulties`, { headers: authHeaders() }).then(handle),
  listChallengeTypesPublic: () => fetch(`${BASE}/challenge-types`, { headers: authHeaders() }).then(handle),

  // Admin-only mutation
  listCategories: () => fetch(`${BASE}/admin/categories`, { headers: authHeaders() }).then(handle),

  createCategory: (data) =>
    fetch(`${BASE}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  deleteCategory: (id) =>
    fetch(`${BASE}/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  listDifficulties: () => fetch(`${BASE}/admin/difficulties`, { headers: authHeaders() }).then(handle),

  createDifficulty: (data) =>
    fetch(`${BASE}/admin/difficulties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  deleteDifficulty: (id) =>
    fetch(`${BASE}/admin/difficulties/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  listChallengeTypes: () => fetch(`${BASE}/admin/challenge-types`, { headers: authHeaders() }).then(handle),

  // ---------- Platform settings (centralized config) ----------
  getSettings: () => fetch(`${BASE}/admin/settings`, { headers: authHeaders() }).then(handle),

  updateSettings: (data) =>
    fetch(`${BASE}/admin/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),
}
