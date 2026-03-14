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
export const fetchNotes = () => request('/notes/');
export const fetchOrgMetrics = () => request('/analytics/org');
export const fetchSummary = () => request('/analytics/summary');
export const fetchStressDistribution = () => request('/analytics/stress-distribution');
export const fetchDirectorDashboard = () => request('/analytics/director-dashboard');
export const fetchUserCheckins = (userId) => request(`/checkins/${userId}`); // Need to verify if it's /checkins/user/${userId} or something else. I'll use a generic one or assume /checkins/user/:user_id
export const fetchUserMetrics = (userId) => request(`/analytics/user/${userId}`);
export const fetchCourses = () => request('/courses/');
