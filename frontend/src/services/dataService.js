// API-backed data service — talks to the Express/Postgres API on the VPS.
// Talks to the Express/Postgres API. Same method names/signatures as before.

const BASE = process.env.REACT_APP_API_URL || '';

const TOKEN_KEYS = ['cbt_token', 'multi_tenant_admin_token'];

function getTokens() {
  return TOKEN_KEYS.map(k => localStorage.getItem(k)).filter(Boolean);
}

async function request(path, options = {}, tokenIndex = 0) {
  const tokens = getTokens();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (tokens[tokenIndex]) headers['Authorization'] = `Bearer ${tokens[tokenIndex]}`;

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });

  // If unauthorized and another token exists, retry with it
  if (res.status === 401 && tokenIndex + 1 < tokens.length) {
    return request(path, options, tokenIndex + 1);
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Public login — no token needed
async function institutionLogin(slug, username, password) {
  const res = await fetch(`${BASE}/api/auth/institution/${encodeURIComponent(slug)}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data; // { success, token, user }
}

const get = (p) => request(p);
const post = (p, body) => request(p, { method: 'POST', body: JSON.stringify(body) });
const patch = (p, body) => request(p, { method: 'PATCH', body: JSON.stringify(body) });
const del = (p) => request(p, { method: 'DELETE' });

class PgDataService {
  safeToDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    return null;
  }

  // ---- institutions ----
  getInstitutions() { return get('/institutions'); }
  getInstitution(id) { return get(`/institutions/${id}`); }
  getInstitutionBySlug(slug) { return get(`/institutions/slug/${slug}`); }
  institutionLogin(slug, username, password) { return institutionLogin(slug, username, password); }
  async createInstitution(data) { return post('/institutions', data); }
  async updateInstitution(id, data) { await patch(`/institutions/${id}`, data); return true; }
  async updateInstitutionStatus(id, status) { await patch(`/institutions/${id}`, { status }); return true; }
  async deleteInstitution(id) { await del(`/institutions/${id}`); return true; }

  // ---- departments ----
  // Public (pre-login, registration form): slug-scoped, minimal fields
  getPublicDepartments(slug) {
    return fetch(`${BASE}/api/public/institutions/${encodeURIComponent(slug)}/departments`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  }
  // Public (pre-login): student self-registration
  registerStudent(slug, data) {
    return fetch(`${BASE}/api/public/institutions/${encodeURIComponent(slug)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Registration failed');
      return d;
    });
  }
  getInstitutionDepartments(iid) { return get(`/institutions/${iid}/departments`); }
  async createInstitutionDepartment(iid, data) { return post(`/institutions/${iid}/departments`, data); }
  async updateInstitutionDepartment(iid, deptId, data) { await patch(`/departments/${deptId}`, data); return true; }
  async deleteInstitutionDepartment(iid, deptId) { await del(`/departments/${deptId}`); return true; }

  // ---- admins ----
  getInstitutionAdmins(iid) { return get(`/institutions/${iid}/admins`); }
  async createAdmin(data) {
    const iid = data.institutionId;
    return post(`/institutions/${iid}/admins`, data);
  }
  async updateAdminPassword(id, password) { await patch(`/admins/${id}/password`, { password }); return true; }
  async deleteAdmin(id) { await del(`/admins/${id}`); return true; }
  async deleteInstitutionAdmins(iid) {
    const admins = await this.getInstitutionAdmins(iid);
    await Promise.all(admins.map(a => this.deleteAdmin(a.id)));
    return true;
  }

  // ---- users / students ----
  getInstitutionUsers(iid) { return get(`/institutions/${iid}/users`); }
  getInstitutionStudents(iid) { return get(`/institutions/${iid}/users?role=student`); }
  async createUser(data) {
    const iid = data.institutionId;
    return post(`/institutions/${iid}/users`, data);
  }
  async updateUser(id, data) { await patch(`/users/${id}`, data); return true; }
  async deleteUser(id) { await del(`/users/${id}`); return true; }
  getAllUsers() { return get('/users'); }
  async updateInstitutionUserCount(iid) {
    const users = await this.getInstitutionUsers(iid);
    await this.updateInstitution(iid, { totalUsers: users.length });
    return users.length;
  }

  // ---- exams ----
  getInstitutionExams(iid) { return get(`/institutions/${iid}/exams`); }
  async createExam(data) {
    const iid = data.institutionId;
    return post(`/institutions/${iid}/exams`, data);
  }
  async updateExam(id, data) { await patch(`/exams/${id}`, data); return true; }
  async deleteExam(id) { await del(`/exams/${id}`); return true; }
  getExams() { return get('/exams'); } // flat, tenant-scoped server-side

  // ---- questions ----
  getInstitutionQuestions(iid) { return get(`/institutions/${iid}/questions`); }
  getQuestions(examId) { return get(`/exams/${examId}/questions`); }
  async createQuestion(data) { return post('/questions', data); }
  async addQuestions(examId, questionsData) { return post(`/exams/${examId}/questions/bulk`, { questions: questionsData }); }
  async updateQuestion(id, data) { await patch(`/questions/${id}`, data); return true; }
  async deleteQuestion(id) { await del(`/questions/${id}`); return true; }
  async countQuestionsByExam(examId) { const r = await get(`/exams/${examId}/questions/count`); return r.count; }
  async deleteQuestionsByExam(examId) { await del(`/exams/${examId}/questions`); return true; }

  // ---- results ----
  getInstitutionResults(iid) { return get(`/institutions/${iid}/results`); }
  getResults() { return get('/results'); }
  getResultsByExam(examId) { return get(`/exams/${examId}/results`); }
  getResultsByUser(userId) { return get(`/users/${userId}/results`); }
  getResultById(id) { return get(`/results/${id}`); }
  async createResult(data) { return post('/results', data); }
  async saveExamResult(data) { return post('/results', data); }
  async updateResult(id, data) { await patch(`/results/${id}`, data); return true; }
  async updateExamResult(id, data) { await patch(`/results/${id}`, data); return true; }
  async deleteResult(id) { await del(`/results/${id}`); return true; }
  async deleteResults(ids) { return request('/results/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }); }

  // ---- blogs ----
  getBlogs() { return get('/blogs'); }
  getAllBlogs() { return get('/blogs-all'); }
  getBlog(id) { return get(`/blogs/${id}`); }
  async createBlog(data) { return post('/blogs', data); }
  async updateBlog(id, data) { await patch(`/blogs/${id}`, data); return true; }
  async publishBlog(id) { await patch(`/blogs/${id}/publish`); return true; }
  async unpublishBlog(id) { await patch(`/blogs/${id}/unpublish`); return true; }
  async deleteBlog(id) { await del(`/blogs/${id}`); return true; }

  // ---- legacy no-ops kept for API parity ----
  saveUsers() { return true; }
  saveExams() { return true; }
  saveQuestions() { return true; }
  saveResults() { return true; }
  clearAllData() { return false; }
  exportData() { return null; }
  importData() { return false; }
}

const pgDataService = new PgDataService();
export default pgDataService;
export { pgDataService as dataService };
