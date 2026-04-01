const tokenKey = 'baobao_pos_token';

function defaultApiUrl() {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    const isViteDev = port === '5173' || port === '4173';
    return isViteDev ? `${protocol}//${hostname}:4000/api` : `${origin}/api`;
  }
  return 'http://localhost:4000/api';
}

const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl();

function getToken() { return localStorage.getItem(tokenKey) || ''; }
function setToken(token) { localStorage.setItem(tokenKey, token); }
function clearToken() { localStorage.removeItem(tokenKey); }

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  getApiUrl: () => API_URL,
  getToken,
  clearToken,
  login: async (payload) => { const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }); setToken(data.token); return data; },
  me: () => request('/auth/me'),
  logout: async () => { try { await request('/auth/logout', { method: 'POST' }); } finally { clearToken(); } },
  getDashboard: () => request('/dashboard'),
  getReports: () => request('/reports'),
  getSettings: () => request('/settings'),
  saveSettings: (payload) => request('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getProducts: (search = '') => request(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createProduct: (payload) => request('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  getCustomers: (search = '') => request(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (payload) => request('/customers', { method: 'POST', body: JSON.stringify(payload) }),
  getOrders: () => request('/orders'),
  getOrderById: (id) => request(`/orders/${id}`),
  createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getPurchases: () => request('/purchases'),
  createPurchase: (payload) => request('/purchases', { method: 'POST', body: JSON.stringify(payload) })
};
