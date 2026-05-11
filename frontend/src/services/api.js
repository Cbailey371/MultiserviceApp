const API_BASE = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('ms_token');
    this.user = JSON.parse(localStorage.getItem('ms_user') || 'null');
    this.listeners = new Set();
  }

  // === Auth State ===
  onAuthChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notifyAuth() { this.listeners.forEach(fn => fn(this.user, this.token)); }

  getUser() { return this.user; }
  getToken() { return this.token; }
  isAuthenticated() { return !!this.token; }
  getBaseUrl() { return window.location.origin; }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('ms_token', token);
    localStorage.setItem('ms_user', JSON.stringify(user));
    this.notifyAuth();
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_user');
    this.notifyAuth();
  }

  // === HTTP Methods ===
  async request(method, path, body = null) {
    const isFormData = body instanceof FormData;
    const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);

    if (res.status === 401) {
      this.logout();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json().catch(() => ({}));
    } else {
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Error ${res.status}`);
      return text;
    }

    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }

  // === Auth ===
  async login(email, password) {
    const data = await this.post('/auth/login', { email, password });
    this.setAuth(data.token, data.user);
    return data;
  }

  async register(payload) {
    const data = await this.post('/auth/register', payload);
    this.setAuth(data.token, data.user);
    return data;
  }

  // === Clients ===
  listClients() { return this.get('/clients'); }
  getClient(id) { return this.get(`/clients/${id}`); }
  createClient(data) { return this.post('/clients', data); }
  updateClient(id, data) { return this.put(`/clients/${id}`, data); }
  deleteClient(id) { return this.del(`/clients/${id}`); }
  listLocations(clientId) { return this.get(`/clients/${clientId}/locations`); }
  createLocation(clientId, data) { return this.post(`/clients/${clientId}/locations`, data); }

  // === Assets ===
  listAssets() { return this.get('/assets'); }
  getAsset(id) { return this.get(`/assets/${id}`); }
  createAsset(data) { return this.post('/assets', data); }
  updateAsset(id, data) { return this.put(`/assets/${id}`, data); }
  getAssetHistory(id) { return this.get(`/assets/${id}/history`); }

  // === Catalog ===
  listCatalog() { return this.get('/catalog'); }
  createCatalogItem(data) { return this.post('/catalog', data); }
  updateCatalogItem(id, data) { return this.put(`/catalog/${id}`, data); }

  // === Quotations ===
  listQuotations() { return this.get('/quotations'); }
  getQuotation(id) { return this.get(`/quotations/${id}`); }
  createQuotation(data) { return this.post('/quotations', data); }
  updateQuotation(id, data) { return this.put(`/quotations/${id}`, data); }
  addQuotationItem(id, data) { return this.post(`/quotations/${id}/items`, data); }
  updateQuotationItem(id, itemId, data) { return this.put(`/quotations/${id}/items/${itemId}`, data); }
  removeQuotationItem(id, itemId) { return this.del(`/quotations/${id}/items/${itemId}`); }
  approveQuotation(id) { return this.post(`/quotations/${id}/approve`); }
  rejectQuotation(id) { return this.post(`/quotations/${id}/reject`); }
  updateQuotationStatus(id, status) { return this.put(`/quotations/${id}/status`, { status }); }
  convertToInvoice(id) { return this.post(`/quotations/${id}/convert`); }

  // === Invoices ===
  listInvoices() { return this.get('/invoices'); }
  getInvoice(id) { return this.get(`/invoices/${id}`); }
  registerPayment(id, data) { return this.post(`/invoices/${id}/payments`, data); }

  // === Dashboard ===
  getKpis() { return this.get('/dashboard/kpis'); }

  // === Work Orders ===
  listWorkOrders() { return this.get('/work-orders'); }
  getWorkOrder(id) { return this.get(`/work-orders/${id}`); }
  createWorkOrder(data) { return this.post('/work-orders', data); }
  updateWorkOrder(id, data) { return this.put(`/work-orders/${id}`, data); }
  completeWorkOrder(id) { return this.post(`/work-orders/${id}/complete`); }

  // === Contracts ===
  listContracts() { return this.get('/contracts'); }
  getContract(id) { return this.get(`/contracts/${id}`); }
  createContract(data) { return this.post('/contracts', data); }
  updateContract(id, data) { return this.request('PATCH', `/contracts/${id}`, data); }
  deleteContract(id) { return this.del(`/contracts/${id}`); }
  listSchedules(id) { return this.get(`/contracts/${id}/schedules`); }

  // === Calendar ===
  listEvents() { return this.get('/calendar/events'); }

  // === Users ===
  listUsers() { return this.get('/users'); }
  createUser(data) { return this.post('/users', data); }
  updateUser(id, data) { return this.put(`/users/${id}`, data); }

  // === Settings ===
  getSettings() { return this.get('/settings'); }
  updateSettings(data) { return this.put('/settings', data); }
  testEmail(smtp_settings, test_email) { return this.post('/settings/test-email', { smtp_settings, test_email }); }
  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.post('/settings/logo', formData);
  }

  // === Reports ===
  getFinancialReport() { return this.get('/reports/financial'); }
  getOperationalReport() { return this.get('/reports/operational'); }
  getClientsReport() { return this.get('/reports/clients'); }
  
  // === Files & PDFs ===
  async downloadPdf(path) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const res = await fetch(`${API_BASE}${path}`, { headers });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Error al descargar el documento');
    }
    
    return await res.blob();
  }

  downloadQuotationPdf(id) { return this.downloadPdf(`/quotations/${id}/pdf`); }
  downloadInvoicePdf(id) { return this.downloadPdf(`/invoices/${id}/pdf`); }

  // === Excel Reports ===
  async downloadExcel(path) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) throw new Error('Error al descargar el reporte Excel');
    return await res.blob();
  }

  exportClients() { return this.downloadExcel('/reports/export/clients'); }
  exportInvoices() { return this.downloadExcel('/reports/export/invoices'); }
  exportQuotations() { return this.downloadExcel('/reports/export/quotations'); }
  exportContracts() { return this.downloadExcel('/reports/export/contracts'); }
  exportCatalog() { return this.downloadExcel('/reports/export/catalog'); }
  exportWorkOrders() { return this.downloadExcel('/reports/export/work-orders'); }
}

export const api = new ApiService();
export default api;
