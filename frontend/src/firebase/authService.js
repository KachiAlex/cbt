// API-backed auth service (was Firebase Auth). Same { success, user, error } contract.
const BASE = process.env.REACT_APP_API_URL || '';

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
    localStorage.removeItem('multi_tenant_admin_token');
    localStorage.removeItem('multi_tenant_admin_user');
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
}

export default new ApiAuthService();
