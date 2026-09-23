// API-backed auth service (JWT + Express/Postgres). Returns { success, user, error }.
const BASE = import.meta.env.VITE_API_URL || '';

class ApiAuthService {
  async signIn(email, password) {
    try {
      const res = await fetch(`${BASE}/api/auth/super-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Login failed' };
      localStorage.setItem('multi_tenant_admin_token', data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (e) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  async signOut() {
    const tokenKeys = ['multi_tenant_admin_token', 'cbt_token'];
    const tokens = tokenKeys.map(key => [key, localStorage.getItem(key)]).filter(([, token]) => token);
    try {
      await Promise.all(tokens.map(([, token]) => fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})));
    } finally {
      tokenKeys.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('multi_tenant_admin_user');
    }
    return { success: true };
  }

  getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('multi_tenant_admin_user')); } catch { return null; }
  }

  isAuthenticated() {
    return !!localStorage.getItem('multi_tenant_admin_token');
  }

  async getToken() {
    return localStorage.getItem('multi_tenant_admin_token');
  }

  async getSession() {
    const token = localStorage.getItem('multi_tenant_admin_token');
    if (!token) return null;
    try {
      const res = await fetch(`${BASE}/api/auth/session`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        this.signOut();
        return null;
      }
      return (await res.json()).user || null;
    } catch (_) {
      return null;
    }
  }
}

export default new ApiAuthService();
