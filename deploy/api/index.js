const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, q, toDoc, toDocs, byDateDesc } = require('./db');
const { scoreSubmission } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const newId = () => crypto.randomUUID();
const newStudentId = () => `STU-${newId().toUpperCase()}`;
const now = () => new Date().toISOString();

// ---------- auth ----------

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function superAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Super admin required' });
  next();
}

// Institution staff only (admin or super_admin) — blocks student tokens
function staffOnly(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

// Password helpers — supports legacy plaintext values, upgrades to bcrypt on login
function isHash(v) { return typeof v === 'string' && v.startsWith('$2'); }
async function verifyPassword(stored, plain) {
  if (!stored) return false;
  return isHash(stored) ? bcrypt.compare(plain, stored) : stored === plain;
}
async function maybeUpgradeHash(table, id, data, plain) {
  if (isHash(data.password)) return;
  const hash = await bcrypt.hash(plain, 10);
  await q(`UPDATE ${table} SET data = $2 WHERE id = $1`, [id, { ...data, password: hash }]);
}
async function hashBodyPassword(body) {
  if (!body?.password || isHash(body.password)) return body;
  return { ...body, password: await bcrypt.hash(body.password, 10) };
}

// Allow if super_admin or if the JWT's institution matches :iid (or a row's institution_id)
function tenantOk(req, institutionId) {
  return req.user?.role === 'super_admin' || req.user?.institutionId === institutionId;
}

// Verify the exam in the URL belongs to the caller's institution
async function examTenant(req, res, next) {
  const { rows } = await q('SELECT institution_id FROM exams WHERE id = $1', [req.params.examId]);
  if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
  if (!tenantOk(req, rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  req.examInstitutionId = rows[0].institution_id;
  next();
}

// ---------- public ----------

app.get('/health', async (req, res) => {
  try {
    await q('SELECT 1');
    res.json({ status: 'healthy', time: now() });
  } catch (e) {
    res.status(500).json({ status: 'unhealthy', error: e.message });
  }
});

app.get('/api/institutions/slug/:slug', async (req, res) => {
  const { rows } = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!rows.length) return res.status(404).json({ error: 'Institution not found' });
  res.json(toDoc(rows[0]));
});

app.get('/api/blogs', async (req, res) => {
  const { rows } = await q('SELECT * FROM blogs WHERE published = true');
  res.json(toDocs(rows).sort(byDateDesc('publishedAt')));
});

app.get('/api/blogs/:id', async (req, res) => {
  const { rows } = await q('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Blog not found' });
  res.json(toDoc(rows[0]));
});

app.post('/api/auth/super-admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const { rows } = await q(
    'SELECT * FROM super_admins WHERE username = $1 OR email = $1',
    [String(email).toLowerCase()]
  );
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({
    success: true,
    token: sign({ role: 'super_admin', sub: admin.id }),
    user: { uid: admin.id, email: admin.email, displayName: admin.data?.fullName || admin.username },
  });
});

app.post('/api/auth/institution/:slug/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const inst = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!inst.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const institution = toDoc(inst.rows[0]);

  if (institution.status === 'suspended') {
    return res.status(403).json({ error: 'Your institution has been suspended. Contact your administrator.' });
  }

  const nameMatch = (row) => {
    const d = row.data || {};
    return d.username === username || d.email === username;
  };

  const admins = await q('SELECT * FROM admins WHERE institution_id = $1', [institution.id]);
  for (const admin of admins.rows.filter(nameMatch)) {
    if (await verifyPassword(admin.data.password, password)) {
      await maybeUpgradeHash('admins', admin.id, admin.data, password).catch(() => {});
      const user = {
        id: admin.id, username: admin.data.username, email: admin.data.email,
        fullName: admin.data.fullName, role: 'admin',
        institutionId: institution.id, institutionName: institution.name,
      };
      return res.json({ success: true, token: sign({ role: 'admin', institutionId: institution.id, sub: admin.id }), user });
    }
  }

  const students = await q("SELECT * FROM users WHERE institution_id = $1 AND role = 'student'", [institution.id]);
  for (const student of students.rows.filter(nameMatch)) {
    const d = student.data;
    if (d.isActive === false) continue;
    if (await verifyPassword(d.password, password)) {
      await maybeUpgradeHash('users', student.id, d, password).catch(() => {});
      const user = {
        id: student.id, username: d.username, email: d.email, fullName: d.fullName,
        role: 'student', institutionId: institution.id, institutionName: institution.name,
        departmentId: d.departmentId || '', department: d.department || '',
        departmentCode: d.departmentCode || null, level: d.level || '',
      };
      return res.json({ success: true, token: sign({ role: 'student', institutionId: institution.id, sub: student.id }), user });
    }
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

// ---------- public: institution self-registration ----------

app.get('/api/public/institutions/:slug/departments', async (req, res) => {
  const inst = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!inst.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const { rows } = await q('SELECT * FROM departments WHERE institution_id = $1', [inst.rows[0].id]);
  // Minimal fields only — this endpoint is unauthenticated
  res.json(toDocs(rows).map(d => ({
    id: d.id, name: d.name, code: d.code || null, levels: d.levels || [], isActive: d.isActive !== false,
  })));
});

app.post('/api/public/institutions/:slug/register', publicRateLimit, async (req, res) => {
  const b = req.body || {};
  const { fullName, email, username, password, level } = b;
  if (!fullName || !email || !username || !password || !level) {
    return res.status(400).json({ error: 'fullName, email, username, password and level are required' });
  }

  const inst = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!inst.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const institution = toDoc(inst.rows[0]);
  if (institution.status === 'suspended') {
    return res.status(403).json({ error: 'This institution is not accepting registrations.' });
  }

  const clash = await q(
    "SELECT 1 FROM users WHERE institution_id = $1 AND (data->>'username' = $2 OR data->>'email' = $3) LIMIT 1",
    [inst.rows[0].id, username, email]
  );
  if (clash.rows.length) {
    return res.status(409).json({ error: 'A user with this email or username already exists.' });
  }

  let departmentId = '';
  let department = typeof b.department === 'string' ? b.department.trim() : '';
  let departmentCode = null;
  if (b.departmentId) {
    const dept = await q('SELECT id, data FROM departments WHERE id = $1 AND institution_id = $2', [b.departmentId, inst.rows[0].id]);
    if (!dept.rows.length) return res.status(400).json({ error: 'Selected department is invalid' });
    const deptData = toDoc(dept.rows[0]);
    departmentId = deptData.id;
    department = deptData.name || department;
    departmentCode = deptData.code || null;
  }

  const id = newId();
  const studentId = newStudentId();
  const data = {
    fullName, email, username,
    password: await bcrypt.hash(password, 10),
    studentId,
    departmentId,
    department,
    departmentCode,
    level,
    phoneNumber: b.phoneNumber || '',
    role: 'student',
    isActive: true,
    institutionId: inst.rows[0].id,
    institutionName: institution.name,
    createdAt: now(),
  };
  await q('INSERT INTO users (id, institution_id, username, role, data) VALUES ($1,$2,$3,$4,$5)',
    [id, inst.rows[0].id, username, 'student', data]);
  res.json({ success: true, id, studentId });
});

// Simple per-IP rate limit for unauthenticated write endpoints (10 req / 10 min)
const publicHits = new Map();
function publicRateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const nowMs = Date.now();
  const hits = (publicHits.get(key) || []).filter(t => nowMs - t < 10 * 60 * 1000);
  if (hits.length >= 10) return res.status(429).json({ error: 'Too many requests. Try again later.' });
  hits.push(nowMs);
  publicHits.set(key, hits);
  next();
}
// Periodic cleanup so the map doesn't grow forever
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of publicHits) {
    const kept = v.filter(t => t > cutoff);
    kept.length ? publicHits.set(k, kept) : publicHits.delete(k);
  }
}, 15 * 60 * 1000).unref();

app.post('/api/contact', publicRateLimit, async (req, res) => {
  await q('INSERT INTO demo_requests (kind, data) VALUES ($1, $2)', ['contact', req.body || {}]);
  res.json({ ok: true });
});

app.post('/api/schedule-demo', publicRateLimit, async (req, res) => {
  await q('INSERT INTO demo_requests (kind, data) VALUES ($1, $2)', ['demo', req.body || {}]);
  res.json({ ok: true });
});

// ---------- authed: flat collections (tenant-scoped) ----------

app.get('/api/exams', auth, async (req, res) => {
  const { rows } = req.user.role === 'super_admin'
    ? await q('SELECT * FROM exams')
    : await q('SELECT * FROM exams WHERE institution_id = $1', [req.user.institutionId]);
  res.json(toDocs(rows));
});

app.get('/api/users', auth, staffOnly, async (req, res) => {
  const { rows } = req.user.role === 'super_admin'
    ? await q('SELECT * FROM users')
    : await q('SELECT * FROM users WHERE institution_id = $1', [req.user.institutionId]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.get('/api/results', auth, staffOnly, async (req, res) => {
  const { rows } = req.user.role === 'super_admin'
    ? await q('SELECT * FROM results')
    : await q('SELECT * FROM results WHERE institution_id = $1', [req.user.institutionId]);
  res.json(toDocs(rows));
});

// ---------- institutions (super admin) ----------

app.get('/api/institutions', auth, superAdmin, async (req, res) => {
  const { rows } = await q('SELECT * FROM institutions');
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions', auth, superAdmin, async (req, res) => {
  const { name, slug } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: 'Institution name and slug are required' });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' });
  }
  const existing = await q('SELECT id FROM institutions WHERE slug = $1', [slug]);
  if (existing.rows.length) return res.status(409).json({ error: 'An institution with this slug already exists' });
  const id = newId();
  const data = { ...req.body, status: req.body.status || 'active', createdAt: now(), totalUsers: 0 };
  await q('INSERT INTO institutions (id, slug, data) VALUES ($1, $2, $3)', [id, slug, data]);
  res.json({ id, ...data });
});

// ---------- institutions (tenant-scoped) ----------

app.get('/api/institutions/:id', auth, async (req, res) => {
  if (!tenantOk(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM institutions WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Institution not found' });
  res.json(toDoc(rows[0]));
});

app.patch('/api/institutions/:id', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const cur = await q('SELECT * FROM institutions WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Institution not found' });
  if (req.body.slug && req.body.slug !== cur.rows[0].slug) {
    return res.status(400).json({ error: 'Institution slug cannot be changed — it would break the portal URL' });
  }
  const data = { ...cur.rows[0].data, ...req.body, slug: cur.rows[0].slug, updatedAt: now() };
  await q('UPDATE institutions SET data = $2 WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});

app.delete('/api/institutions/:id', auth, superAdmin, async (req, res) => {
  await q('DELETE FROM institutions WHERE id = $1', [req.params.id]); // FK cascades
  res.json({ ok: true });
});

// ---------- departments ----------

app.get('/api/institutions/:iid/departments', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM departments WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
});

app.post('/api/institutions/:iid/departments', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const data = { ...req.body, isActive: req.body.isActive !== false, createdAt: now(), updatedAt: now() };
  await q('INSERT INTO departments (id, institution_id, data) VALUES ($1, $2, $3)', [id, req.params.iid, data]);
  res.json({ id, ...req.body });
});

// Single-row helpers; enforce tenant match when the table has institution_id
async function patchRow(table, id, body, res, req) {
  const cur = await q(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  if (cur.rows[0].institution_id && !tenantOk(req, cur.rows[0].institution_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const safeBody = ['users', 'admins'].includes(table) ? await hashBodyPassword(body) : body;
  if (table === 'users' && cur.rows[0].data.role === 'student') {
    safeBody.studentId = cur.rows[0].data.studentId || newStudentId();
  }
  const data = { ...cur.rows[0].data, ...safeBody, updatedAt: now() };
  await q(`UPDATE ${table} SET data = $2 WHERE id = $1`, [id, data]);
  res.json({ ok: true });
}

async function deleteRow(table, id, res, req) {
  const cur = await q(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  if (cur.rows[0].institution_id && !tenantOk(req, cur.rows[0].institution_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await q(`DELETE FROM ${table} WHERE id = $1`, [id]);
  res.json({ ok: true });
}

app.patch('/api/departments/:id', auth, staffOnly, (req, res) => patchRow('departments', req.params.id, req.body, res, req));
app.delete('/api/departments/:id', auth, staffOnly, (req, res) => deleteRow('departments', req.params.id, res, req));

// ---------- admins ----------

app.get('/api/institutions/:iid/admins', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM admins WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/admins', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const body = await hashBodyPassword(req.body);
  const data = { ...body, institutionId: req.params.iid, role: 'admin', createdAt: now() };
  await q('INSERT INTO admins (id, institution_id, username, email, data) VALUES ($1,$2,$3,$4,$5)',
    [id, req.params.iid, data.username || null, data.email || null, data]);
  const { password, passwordHash, ...safe } = data;
  res.json({ id, ...safe });
});

app.patch('/api/admins/:id/password', auth, staffOnly, async (req, res) => {
  const cur = await q('SELECT * FROM admins WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  if (!tenantOk(req, cur.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const data = { ...cur.rows[0].data, password: await bcrypt.hash(req.body.password, 10), updatedAt: now() };
  await q('UPDATE admins SET data = $2 WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});

app.patch('/api/admins/:id', auth, staffOnly, (req, res) => patchRow('admins', req.params.id, req.body, res, req));
app.delete('/api/admins/:id', auth, staffOnly, (req, res) => deleteRow('admins', req.params.id, res, req));

// ---------- users / students ----------

app.get('/api/institutions/:iid/users', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const role = req.query.role;
  const { rows } = role
    ? await q('SELECT * FROM users WHERE institution_id = $1 AND role = $2', [req.params.iid, role])
    : await q('SELECT * FROM users WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/users', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const body = await hashBodyPassword(req.body);
  const data = { ...body, institutionId: req.params.iid, createdAt: now() };
  if (data.role === 'student') data.studentId = newStudentId();
  await q('INSERT INTO users (id, institution_id, username, role, data) VALUES ($1,$2,$3,$4,$5)',
    [id, req.params.iid, data.username || null, data.role || null, data]);
  const { password, passwordHash, ...safe } = data;
  res.json({ id, ...safe });
});

app.patch('/api/users/:id', auth, staffOnly, (req, res) => patchRow('users', req.params.id, req.body, res, req));
app.delete('/api/users/:id', auth, staffOnly, (req, res) => deleteRow('users', req.params.id, res, req));

app.get('/api/users/:id/results', auth, async (req, res) => {
  // Students may only read their own results
  if (req.user.role === 'student' && req.user.sub !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Staff may only read results for users in their institution
  const owner = await q('SELECT institution_id FROM users WHERE id = $1', [req.params.id]);
  if (!owner.rows.length) return res.json([]);
  if (!tenantOk(req, owner.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM results WHERE user_id = $1', [req.params.id]);
  res.json(toDocs(rows));
});

// ---------- exams ----------

app.get('/api/institutions/:iid/exams', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM exams WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/exams', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const data = { ...req.body, institutionId: req.params.iid, createdAt: now() };
  await q('INSERT INTO exams (id, institution_id, data) VALUES ($1,$2,$3)', [id, req.params.iid, data]);
  res.json({ id, ...req.body });
});

app.patch('/api/exams/:id', auth, staffOnly, (req, res) => patchRow('exams', req.params.id, req.body, res, req));
app.delete('/api/exams/:id', auth, staffOnly, (req, res) => deleteRow('exams', req.params.id, res, req));

// ---------- questions ----------

app.get('/api/institutions/:iid/questions', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM questions WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.get('/api/exams/:examId/questions', auth, examTenant, async (req, res) => {
  const { rows } = await q('SELECT * FROM questions WHERE exam_id = $1', [req.params.examId]);
  const docs = toDocs(rows);
  // Students must not receive answer keys or grading rubric data
  if (req.user.role === 'student') {
    for (const d of docs) {
      delete d.correctIndex;
      delete d.correctAnswer;
      delete d.rubricKeywords;
      delete d.modelAnswer;
    }
  }
  res.json(docs);
});

app.get('/api/exams/:examId/questions/count', auth, staffOnly, examTenant, async (req, res) => {
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json({ count: rows[0].n });
});

app.post('/api/questions', auth, staffOnly, async (req, res) => {
  if (req.body.institutionId && !tenantOk(req, req.body.institutionId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const id = newId();
  const data = { ...req.body, createdAt: now() };
  await q('INSERT INTO questions (id, institution_id, exam_id, data) VALUES ($1,$2,$3,$4)',
    [id, data.institutionId || null, data.examId || null, data]);
  res.json({ id, ...req.body });
});

app.post('/api/exams/:examId/questions/bulk', auth, staffOnly, examTenant, async (req, res) => {
  const institutionId = req.examInstitutionId;
  const created = [];
  for (const qd of req.body.questions || []) {
    const id = newId();
    const data = { ...qd, examId: req.params.examId, institutionId, createdAt: now() };
    await q('INSERT INTO questions (id, institution_id, exam_id, data) VALUES ($1,$2,$3,$4)',
      [id, institutionId, req.params.examId, data]);
    created.push({ id, ...data });
  }
  res.json(created);
});

app.patch('/api/questions/:id', auth, staffOnly, (req, res) => patchRow('questions', req.params.id, req.body, res, req));
app.delete('/api/questions/:id', auth, staffOnly, (req, res) => deleteRow('questions', req.params.id, res, req));
app.delete('/api/exams/:examId/questions', auth, staffOnly, examTenant, async (req, res) => {
  await q('DELETE FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json({ ok: true });
});

// ---------- results ----------

app.get('/api/institutions/:iid/results', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM results WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('completedAt')));
});

app.get('/api/exams/:examId/results', auth, staffOnly, examTenant, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE exam_id = $1', [req.params.examId]);
  res.json(toDocs(rows));
});

app.post('/api/results', auth, async (req, res) => {
  const id = newId();
  let institutionId = req.body.institutionId || req.user.institutionId || null;
  const userId = req.user.role === 'student' ? req.user.sub : (req.body.userId || req.user.sub || null);

  // Verify the exam belongs to the caller's institution and derive institution from it
  let examData = null;
  if (req.body.examId) {
    const exam = await q('SELECT institution_id, data FROM exams WHERE id = $1', [req.body.examId]);
    if (!exam.rows.length) return res.status(404).json({ error: 'Exam not found' });
    if (!tenantOk(req, exam.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
    institutionId = exam.rows[0].institution_id;
    examData = exam.rows[0].data;
  }

  const data = { ...req.body, userId, institutionId, completedAt: now(), submittedAt: now() };
  // Never trust client-computed score fields
  delete data.score; delete data.percentage; delete data.correctAnswers;
  delete data.maxScore; delete data.provisional; delete data.status;

  // Server-side scoring
  if (req.body.examId && req.body.answers && typeof req.body.answers === 'object') {
    const qrows = await q('SELECT id, data FROM questions WHERE exam_id = $1', [req.body.examId]);
    const scored = scoreSubmission(qrows.rows.map(r => ({ id: r.id, ...r.data })), req.body.answers, examData?.type);
    Object.assign(data, scored);
  }
  await q('INSERT INTO results (id, institution_id, exam_id, user_id, data) VALUES ($1,$2,$3,$4,$5)',
    [id, institutionId, req.body.examId || null, userId, data]);
  res.json({ id, ...data });
});

app.get('/api/results/:id', auth, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Result not found' });
  if (req.user.role === 'student' && rows[0].user_id !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (rows[0].institution_id && !tenantOk(req, rows[0].institution_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(toDoc(rows[0]));
});

app.patch('/api/results/:id', auth, staffOnly, (req, res) => patchRow('results', req.params.id, req.body, res, req));
app.delete('/api/results/:id', auth, staffOnly, (req, res) => deleteRow('results', req.params.id, res, req));

// ---------- blogs (write = super admin) ----------

app.get('/api/blogs-all', auth, superAdmin, async (req, res) => {
  const { rows } = await q('SELECT * FROM blogs');
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/blogs', auth, superAdmin, async (req, res) => {
  const id = newId();
  const data = { ...req.body, createdAt: now(), updatedAt: now() };
  await q('INSERT INTO blogs (id, published, data) VALUES ($1,$2,$3)', [id, !!data.published, data]);
  res.json({ id, ...req.body });
});

app.patch('/api/blogs/:id', auth, superAdmin, async (req, res) => {
  const cur = await q('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  const data = { ...cur.rows[0].data, ...req.body, updatedAt: now() };
  await q('UPDATE blogs SET data = $2, published = $3 WHERE id = $1', [req.params.id, data, !!data.published]);
  res.json({ ok: true });
});

app.patch('/api/blogs/:id/publish', auth, superAdmin, async (req, res) => {
  const cur = await q('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  const data = { ...cur.rows[0].data, published: true, publishedAt: now(), updatedAt: now() };
  await q('UPDATE blogs SET data = $2, published = true WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});

app.patch('/api/blogs/:id/unpublish', auth, superAdmin, async (req, res) => {
  const cur = await q('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  const data = { ...cur.rows[0].data, published: false, updatedAt: now() };
  await q('UPDATE blogs SET data = $2, published = false WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});

app.delete('/api/blogs/:id', auth, superAdmin, (req, res) => deleteRow('blogs', req.params.id, res, req));

// ---------- boot ----------

async function boot() {
  // Seed a super admin if none exists
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM super_admins');
  if (rows[0].n === 0) {
    const password = SUPER_ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(password, 10);
    await q(
      'INSERT INTO super_admins (id, username, email, password_hash, data) VALUES ($1,$2,$3,$4,$5)',
      [newId(), 'superadmin', 'admin@cbtpromax.com', hash, { fullName: 'Super Administrator' }]
    );
    console.log('=== Seeded super admin: username=superadmin email=admin@cbtpromax.com password=%s ===', password);
  }
  app.listen(PORT, () => console.log(`CBT API listening on :${PORT}`));
}

boot().catch(e => { console.error('Boot failed:', e); process.exit(1); });
