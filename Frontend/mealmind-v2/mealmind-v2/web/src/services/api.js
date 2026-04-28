// services/api.js
// Central API layer — swap BASE_URL when your backend is ready

import API from "./api"; // axios instance

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export default API;
// const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const BASE_URL = 'http://localhost:5000/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('mm_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network error' }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// AUTH
// export const authAPI = {
//   login: (email, password, role) =>
//     request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
//   logout: () => request('/auth/logout', { method: 'POST' }),
//   me: () => request('/auth/me'),
// }
export const authAPI = {
  login: (email, password, role) =>
    API.post("/auth/login", { email, password, role }),
};

// STUDENTS
// export const studentsAPI = {
//   getAll: (params = {}) => {
//     const q = new URLSearchParams(params).toString()
//     return request(`/students${q ? '?' + q : ''}`)
//   },
//   getById: (id) => request(`/students/${id}`),
//   create: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
//   update: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//   delete: (id) => request(`/students/${id}`, { method: 'DELETE' }),
// }
// ================= TEACHER =================
export const teacherAPI = {
  getAll: () => API.get("/teacher"),
};
export const studentAPI = {
  getAll: () => API.get("/student"),
  create: (data) => API.post("/student", data),
};


// HEALTH CHECKUPS
// export const checkupsAPI = {
//   getAll: (params = {}) => {
//     const q = new URLSearchParams(params).toString()
//     return request(`/checkups${q ? '?' + q : ''}`)
//   },
//   getByStudent: (studentId) => request(`/checkups/student/${studentId}`),
//   create: (data) => request('/checkups', { method: 'POST', body: JSON.stringify(data) }),
//   update: (id, data) => request(`/checkups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
// }
export const healthAPI = {
  getAll: () => API.get("/health"),
};

// MEALS
// export const mealsAPI = {
//   getMenu: () => request('/meals/menu'),
//   getToday: () => request('/meals/today'),
//   getHistory: () => request('/meals/history'),
//   approve: (id) => request(`/meals/${id}/approve`, { method: 'POST' }),
// }
export const mealAPI = {
  getAll: () => API.get("/meal"),
};


// ALERTS
export const alertsAPI = {
  getAll: () => request('/alerts'),
  dismiss: (id) => request(`/alerts/${id}/dismiss`, { method: 'POST' }),
  markRead: (id) => request(`/alerts/${id}/read`, { method: 'POST' }),
}

// REPORTS
export const reportsAPI = {
  getDashboardStats: () => request('/reports/dashboard'),
  getGrowthTrend: () => request('/reports/growth-trend'),
  getBmiDistribution: () => request('/reports/bmi-distribution'),
  getRdaComparison: () => request('/reports/rda-comparison'),
  getNutritionStatus: () => request('/reports/nutrition-status'),
}

// USERS (admin)
export const usersAPI = {
  getAll: () => request('/users'),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
}

// ================= CLASS =================
export const classAPI = {
  getAll: () => API.get("/class"),
};