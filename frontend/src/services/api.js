import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('stockUser') || '{}');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => API.post(`/auth/reset-password/${token}`, { password }),
};

export const productsAPI = {
  getAll: () => API.get('/products'),
  getOne: (id) => API.get(`/products/${id}`),
  create: (data) => API.post('/products', data),
  update: (id, data) => API.put(`/products/${id}`, data),
  delete: (id) => API.delete(`/products/${id}`),
};

export const stockAPI = {
  getAll: () => API.get('/stock'),
  addStock: (data) => API.post('/stock', data),
};

export const salesAPI = {
  getAll: () => API.get('/sales'),
  getPending: () => API.get('/sales/pending'),
  create: (data) => API.post('/sales', data),
  markPaid: (id, data) => API.patch(`/sales/${id}/pay`, data),
  delete: (id) => API.delete(`/sales/${id}`),
};

export const dashboardAPI = {
  getSummary: () => API.get('/dashboard'),
};

export const reportsAPI = {
  getDaily: (date) => API.get(`/reports/daily${date ? `?date=${date}` : ''}`),
  getPending: () => API.get('/reports/pending'),
};

export default API;
