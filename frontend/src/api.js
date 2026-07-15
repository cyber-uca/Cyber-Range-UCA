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

  unlockHint: (challengeId, hintId) =>
    fetch(`${BASE}/challenges/${challengeId}/hints/${hintId}/unlock`, {
      method: 'POST',
      headers: { ...authHeaders() },
    }).then(handle),

  submitFlag: (id, value) =>
    fetch(`${BASE}/challenges/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    }).then(handle),

  leaderboard: () => fetch(`${BASE}/challenges/meta/leaderboard`, { headers: authHeaders() }).then(handle),

  listVmTemplates: () => fetch(`${BASE}/admin/vm-templates`, { headers: authHeaders() }).then(handle),

  startEnvironment: (challengeId, topology) =>
    fetch(`${BASE}/environments/${challengeId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(topology),
    }).then(handle),

  startSingleVM: (roomId, vmTemplateId) =>
    fetch(`${BASE}/environments/rooms/${roomId}/start-vm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ vm_template_id: vmTemplateId }),
    }).then(handle),

  stopVM: (roomId, vmTemplateId) =>
    fetch(`${BASE}/environments/rooms/${roomId}/stop-vm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ vm_template_id: vmTemplateId }),
    }).then(handle),

  getEnvironment: (id) => fetch(`${BASE}/environments/${id}`, { headers: authHeaders() }).then(handle),

  getConsoleUrl: (envId, vmId) =>
    fetch(`${BASE}/environments/${envId}/console/${vmId}`, { headers: authHeaders() }).then(handle),

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

  adminUpdateVmTemplate: (id, data) =>
    fetch(`${BASE}/admin/vm-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  // ---------- Categories & Difficulties (data-driven taxonomy) ----------
  // Public reads - any authenticated user (Dashboard, Library filters, Creator picker)
  listCategoriesPublic: () => fetch(`${BASE}/categories`, { headers: authHeaders() }).then(handle),
  listDifficultiesPublic: () => fetch(`${BASE}/difficulties`, { headers: authHeaders() }).then(handle),
  listChallengeTypesPublic: () => fetch(`${BASE}/challenge-types`, { headers: authHeaders() }).then(handle),

  // ---------- Paths (learner read + admin CRUD) ----------
  listPaths: () => fetch(`${BASE}/paths`, { headers: authHeaders() }).then(handle),
  getPath: (slug) => fetch(`${BASE}/paths/${slug}`, { headers: authHeaders() }).then(handle),

  adminCreatePath: (data) =>
    fetch(`${BASE}/paths`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminUpdatePath: (id, data) =>
    fetch(`${BASE}/paths/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeletePath: (id) =>
    fetch(`${BASE}/paths/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  adminPublishPath: (id) =>
    fetch(`${BASE}/paths/${id}/publish`, { method: 'POST', headers: authHeaders() }).then(handle),

  adminUnpublishPath: (id) =>
    fetch(`${BASE}/paths/${id}/unpublish`, { method: 'POST', headers: authHeaders() }).then(handle),

  // ---------- Modules ----------
  adminCreateModule: (pathId, data) =>
    fetch(`${BASE}/paths/${pathId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminUpdateModule: (moduleId, data) =>
    fetch(`${BASE}/paths/modules/${moduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeleteModule: (moduleId) =>
    fetch(`${BASE}/paths/modules/${moduleId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  adminPublishModule: (moduleId) =>
    fetch(`${BASE}/paths/modules/${moduleId}/publish`, { method: 'POST', headers: authHeaders() }).then(handle),

  adminUnpublishModule: (moduleId) =>
    fetch(`${BASE}/paths/modules/${moduleId}/unpublish`, { method: 'POST', headers: authHeaders() }).then(handle),

  // ---------- Rooms (learner read + admin CRUD) ----------
  listRooms: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return fetch(`${BASE}/rooms${qs ? `?${qs}` : ''}`, { headers: authHeaders() }).then(handle)
  },
  getRoom: (slug) => fetch(`${BASE}/rooms/${slug}`, { headers: authHeaders() }).then(handle),

  adminCreateRoom: (moduleId, data) =>
    fetch(`${BASE}/rooms/in-module/${moduleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminUpdateRoom: (roomId, data) =>
    fetch(`${BASE}/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeleteRoom: (roomId) =>
    fetch(`${BASE}/rooms/${roomId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  adminPublishRoom: (roomId) =>
    fetch(`${BASE}/rooms/${roomId}/publish`, { method: 'POST', headers: authHeaders() }).then(handle),

  adminUnpublishRoom: (roomId) =>
    fetch(`${BASE}/rooms/${roomId}/unpublish`, { method: 'POST', headers: authHeaders() }).then(handle),

  // ---------- Tasks ----------
  adminCreateTask: (roomId, data) =>
    fetch(`${BASE}/rooms/${roomId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminUpdateTask: (taskId, data) =>
    fetch(`${BASE}/rooms/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeleteTask: (taskId) =>
    fetch(`${BASE}/rooms/tasks/${taskId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // ---------- Questions ----------
  adminCreateQuestion: (taskId, data) =>
    fetch(`${BASE}/rooms/tasks/${taskId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminUpdateQuestion: (questionId, data) =>
    fetch(`${BASE}/rooms/questions/${questionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeleteQuestion: (questionId) =>
    fetch(`${BASE}/rooms/questions/${questionId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  adminAddOption: (questionId, data) =>
    fetch(`${BASE}/rooms/questions/${questionId}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  adminDeleteOption: (optionId) =>
    fetch(`${BASE}/rooms/options/${optionId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  adminAddHint: (questionId, data) =>
    fetch(`${BASE}/rooms/questions/${questionId}/hints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle),

  // ---------- Progress ----------
  submitAnswer: (questionId, answer) =>
    fetch(`${BASE}/progress/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ answer }),
    }).then(handle),

  getRoomProgress: (roomId) =>
    fetch(`${BASE}/progress/rooms/${roomId}`, { headers: authHeaders() }).then(handle),

  // Lab layers are static on the frontend — no separate endpoint needed
  LAB_LAYERS: [
    { slug: 'plc',   label: 'PLC',   color: 'var(--warning)',   icon: '⚙️' },
    { slug: 'scada', label: 'SCADA', color: 'var(--defensive)', icon: '🖥️' },
    { slug: 'icsim', label: 'ICSim', color: 'var(--offensive)', icon: '🚗' },
    { slug: 'wazuh', label: 'Wazuh', color: 'var(--mitigation)',icon: '🛡️' },
    { slug: 'risk',  label: 'Risk',  color: 'var(--combined)',  icon: '⚠️' },
  ],

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
