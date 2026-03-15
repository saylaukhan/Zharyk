const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
export const fetchAlertsRich = () => request('/alerts/rich');
export const fetchAlerts = () => request('/alerts/');
export const fetchStudentsWithMetrics = () => request('/users/students');
export const fetchUsers = () => request('/users/');
export const fetchSessions = () => request('/sessions/');
export const createSession = (data) => request('/sessions/', { method: 'POST', body: JSON.stringify(data) });
export const updateSession = (id, data) => request(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSession = (id) => request(`/sessions/${id}`, { method: 'DELETE' });
export const fetchNotes = () => request('/notes/');
export const fetchOrgMetrics = () => request('/analytics/org');
export const fetchSummary = () => request('/analytics/summary');
export const fetchStressDistribution = () => request('/analytics/stress-distribution');
export const fetchDirectorDashboard = () => request('/analytics/director-dashboard');
export const fetchUserCheckins = (userId) => request(`/checkins/${userId}`); // Need to verify if it's /checkins/user/${userId} or something else. I'll use a generic one or assume /checkins/user/:user_id
export const fetchUserMetrics = (userId) => request(`/analytics/user/${userId}`);
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

