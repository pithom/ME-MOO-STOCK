import axios from 'axios';
import {
  initOfflineSync,
  syncGet,
  runOrQueueMutation,
  processSyncQueue,
} from './offlineSync';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });
initOfflineSync(API);

API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('stockUser') || '{}');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (navigator.onLine) {
      processSyncQueue().catch(() => {});
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  me: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  getUsers: () => API.get('/auth/users'),
  createUser: (data) => API.post('/auth/users', data),
  updateUserStatus: (id, status) => API.patch(`/auth/users/${id}/status`, { status }),
  updateUser: (id, data) => API.patch(`/auth/users/${id}`, data),
  deleteUser: (id) => API.delete(`/auth/users/${id}`),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => API.post(`/auth/reset-password/${token}`, { password }),
};

export const productsAPI = {
  getAll: () => syncGet('products:list', () => API.get('/products')),
  getOne: (id) => API.get(`/products/${id}`),
  create: (data) => runOrQueueMutation({
    method: 'post',
    url: '/products',
    data,
    operationType: 'product:create',
    queuedMessage: 'Offline: product creation queued for sync.',
  }),
  update: (id, data) => runOrQueueMutation({
    method: 'put',
    url: `/products/${id}`,
    data,
    operationType: 'product:update',
    queuedMessage: 'Offline: product update queued for sync.',
  }),
  delete: (id, data = {}) => runOrQueueMutation({
    method: 'delete',
    url: `/products/${id}`,
    data,
    operationType: 'product:delete',
    queuedMessage: 'Offline: product deletion queued for sync.',
  }),
};

export const stockAPI = {
  getAll: () => syncGet('stock:list', () => API.get('/stock')),
  addStock: (data) => runOrQueueMutation({
    method: 'post',
    url: '/stock',
    data,
    operationType: 'stock:add',
    queuedMessage: 'Offline: stock-in queued for sync.',
  }),
};

export const salesAPI = {
  getAll: () => syncGet('sales:list', () => API.get('/sales')),
  getPending: () => syncGet('sales:pending', () => API.get('/sales/pending')),
  create: (data) => runOrQueueMutation({
    method: 'post',
    url: '/sales',
    data,
    operationType: 'sales:create',
    queuedMessage: 'Offline: sale queued for sync.',
  }),
  markPaid: (id, data) => API.patch(`/sales/${id}/pay`, data),
  returnSale: (id, data) => API.patch(`/sales/${id}/return`, data),
  delete: (id) => runOrQueueMutation({
    method: 'delete',
    url: `/sales/${id}`,
    operationType: 'sales:delete',
    queuedMessage: 'Offline: sale deletion queued for sync.',
  }),
};

export const dashboardAPI = {
  getSummary: () => API.get('/dashboard'),
};

export const reportsAPI = {
  getDaily: (date) => API.get(`/reports/daily${date ? `?date=${date}` : ''}`),
  getBetween: (startDate, endDate) => API.get(`/reports/between?startDate=${startDate}&endDate=${endDate}`),
  getPending: () => API.get('/reports/pending'),
};

export default API;
