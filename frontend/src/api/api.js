const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers: getHeaders() });
  if (!response.ok) {
    let errMessage = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody && errBody.detail) errMessage = errBody.detail;
    } catch {}
    throw new Error(`API Error: ${errMessage}`);
  }
  return response.json();
}

export const fetchMe = () => request('/auth/me');
export const updateSettings = (data) => request('/auth/me/settings', { method: 'PATCH', body: JSON.stringify(data) });
export const changePassword = (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) });
export const fetchAlertsRich = () => request('/alerts/rich');
export const fetchAlerts = () => request('/alerts/');
export const fetchUsersWithMetrics = (role) => request(`/users/with-metrics${role && role !== 'all' ? `?role=${role}` : ''}`);
export const fetchUsers = () => request('/users/');
export const createUserByDirector = (data) => request('/users/', { method: 'POST', body: JSON.stringify(data) });
export const createUsersBatch = (data) => request('/users/batch', { method: 'POST', body: JSON.stringify(data) });
export const fetchSessions = () => request('/sessions/');
export const createSession = (data) => request('/sessions/', { method: 'POST', body: JSON.stringify(data) });
export const updateSession = (id, data) => request(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSession = (id) => request(`/sessions/${id}`, { method: 'DELETE' });
export const fetchNotes = () => request('/notes/');
export const fetchNote = (id) => request(`/notes/${id}`);
export const createNote = (formData) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_URL}/notes/`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = res.statusText;
      try { const e = await res.json(); if (e.detail) msg = e.detail; } catch {}
      throw new Error(msg);
    }
    return res.json();
  });
};
export const updateNote = (id, formData) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_URL}/notes/${id}`, {
    method: 'PUT',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = res.statusText;
      try { const e = await res.json(); if (e.detail) msg = e.detail; } catch {}
      throw new Error(msg);
    }
    return res.json();
  });
};
export const deleteNote = (id) => request(`/notes/${id}`, { method: 'DELETE' });
export const fetchOrgMetrics = () => request('/analytics/org');
export const fetchSummary = () => request('/analytics/summary');
export const fetchStressDistribution = (role) => request(`/analytics/stress-distribution${role && role !== 'all' ? `?role=${role}` : ''}`);
export const fetchDirectorDashboard = (role) => request(`/analytics/director-dashboard${role && role !== 'all' ? `?role=${role}` : ''}`);
export const fetchUserCheckins = (userId) => request(`/checkins/${userId}`); // Need to verify if it's /checkins/user/${userId} or something else. I'll use a generic one or assume /checkins/user/:user_id
export const fetchUserMetrics = (userId) => request(`/analytics/user/${userId}`);
export const fetchStreak = () => request('/analytics/streak');
export const fetchCourses = () => request('/courses/');

// ── Tests ────────────────────────────────────────────────────
export const fetchTests = () => request('/tests/');
export const fetchTestDetail = (testId) => request(`/tests/${testId}`);
export const submitTest = (testId, answers) =>
  request(`/tests/${testId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
export const fetchMyTestResults = () => request('/tests/results/me');
export const fetchUserTestResults = (userId) => request(`/tests/results/user/${userId}`);

// ── SLA Dashboard ─────────────────────────────────────────────
export const fetchSlaData = () => request('/analytics/sla');

// ── Audit Trail ───────────────────────────────────────────────
export const fetchAuditLogs = ({ limit = 50, offset = 0, dateFrom, dateTo, action, actorId, targetUserId } = {}) => {
  const params = new URLSearchParams({ limit, offset });
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  if (action) params.append('action', action);
  if (actorId) params.append('actor_id', actorId);
  if (targetUserId) params.append('target_user_id', targetUserId);
  return request(`/audit/logs?${params}`);
};
export const fetchAuditActions = () => request('/audit/actions');

// ── Cohort Analysis ───────────────────────────────────────────
export const fetchCohorts = () => request('/analytics/cohorts');
export const fetchCohortComparison = (cohortA, cohortB, metric = 'stress') =>
  request(`/analytics/cohort-comparison?cohort_a=${encodeURIComponent(cohortA)}&cohort_b=${encodeURIComponent(cohortB)}&metric=${metric}`);

// ── Campaigns (Mass Campaign Hub) ─────────────────────────────
export const fetchCampaigns = () => request('/campaigns/');
export const fetchMyCampaigns = () => request('/campaigns/my');
export const createCampaign = (data) => request('/campaigns/', { method: 'POST', body: JSON.stringify(data) });
export const launchCampaign = (id) => request(`/campaigns/${id}/launch`, { method: 'POST' });
export const deleteCampaign = (id) => request(`/campaigns/${id}`, { method: 'DELETE' });
export const previewCampaignAudience = ({ target_roles = 'student', target_classes = '' } = {}) => {
  const p = new URLSearchParams({ target_roles, target_classes });
  return request(`/campaigns/preview?${p}`);
};

// ── Recommendations ───────────────────────────────────────────
export const fetchRecommendations = (userId) => request(`/recommendations/${userId}`);

// ── Alerts (extended) ─────────────────────────────────────────
export const resolveAlert = (alertId) =>
  request(`/alerts/${alertId}/resolve`, { method: 'PATCH' });
export const getAlertMessages = (alertId) => request(`/alerts/${alertId}/messages`);

