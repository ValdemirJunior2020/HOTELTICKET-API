// client/src/api/client.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const AGENT_KEY = import.meta.env.VITE_AGENT_API_KEY || 'dev-agent-key';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'dev-admin-key';

async function api(path, options = {}, role = 'agent') {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': role === 'admin' ? ADMIN_KEY : AGENT_KEY,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function getHealth() {
  return api('/api/health');
}

export function getRules() {
  return api('/api/rules');
}

export function rebuildRules() {
  return api('/api/rules/rebuild', { method: 'POST' }, 'admin');
}

export function generateDemoTickets(count = 100) {
  return api(`/api/solve/demo-tickets?count=${count}`);
}

export function startSolve(ticket) {
  return api('/api/solve/one-click', { method: 'POST', body: JSON.stringify({ ticket }) });
}

export function solveStreamUrl(runId) {
  return `${API_BASE}/api/solve/stream/${runId}`;
}

export function getAdminConfig() {
  return api('/api/admin/config', {}, 'admin');
}

export function updateAdminConfig(config) {
  return api('/api/admin/config', { method: 'PUT', body: JSON.stringify(config) }, 'admin');
}

export function getAudit() {
  return api('/api/admin/audit', {}, 'admin');
}
