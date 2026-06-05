// Thin fetch wrapper. All calls go through Vite's /api proxy in dev
// and the same path in production.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(payload.error || `request failed (${res.status})`);
    err.status = res.status;
    err.details = payload.details;
    throw err;
  }

  return payload;
}

export const api = {
  // Tasks
  listTasks: (filters = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set('status', filters.status);
    if (filters.priority) qs.set('priority', filters.priority);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/api/tasks${suffix}`);
  },

  getTask: (id) => request(`/api/tasks/${id}`),

  createTask: (body) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),

  updateTask: (id, body) =>
    request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),

  getStats: () => request('/api/tasks/stats'),
};
