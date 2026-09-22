const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, q, toDoc, toDocs, byDateDesc } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const newId = () => crypto.randomUUID();
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

  const matches = (row) => {
    const d = row.data || {};
    return (d.username === username || d.email === username) && d.password === password;
  };

  const admins = await q('SELECT * FROM admins WHERE institution_id = $1', [institution.id]);
  const admin = admins.rows.find(matches);
  if (admin) {
    const user = {
      id: admin.id, username: admin.data.username, email: admin.data.email,
      fullName: admin.data.fullName, role: 'admin',
      institutionId: institution.id, institutionName: institution.name,
    };
    return res.json({ success: true, token: sign({ role: 'admin', institutionId: institution.id, sub: admin.id }), user });
  }

  const students = await q("SELECT * FROM users WHERE institution_id = $1 AND role = 'student'", [institution.id]);
  const student = students.rows.find(matches);
  if (student) {
    const d = student.data;
    const user = {
      id: student.id, username: d.username, email: d.email, fullName: d.fullName,
      role: 'student', institutionId: institution.id, institutionName: institution.name,
      departmentId: d.departmentId || '', department: d.department || '',
      departmentCode: d.departmentCode || null, level: d.level || '',
    };
    return res.json({ success: true, token: sign({ role: 'student', institutionId: institution.id, sub: student.id }), user });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/contact', async (req, res) => {
  await q('INSERT INTO demo_requests (kind, data) VALUES ($1, $2)', ['contact', req.body || {}]);
  res.json({ ok: true });
});

app.post('/api/schedule-demo', async (req, res) => {
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

app.get('/api/users', auth, superAdmin, async (req, res) => {
  const { rows } = await q('SELECT * FROM users');
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.get('/api/results', auth, async (req, res) => {
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
  const id = newId();
  const data = { ...req.body, createdAt: now(), totalUsers: 0 };
  await q('INSERT INTO institutions (id, slug, data) VALUES ($1, $2, $3)', [id, data.slug || null, data]);
  res.json({ id, ...data });
});

// ---------- institutions (tenant-scoped) ----------

app.get('/api/institutions/:id', auth, async (req, res) => {
  if (!tenantOk(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM institutions WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Institution not found' });
  res.json(toDoc(rows[0]));
});

app.patch('/api/institutions/:id', auth, async (req, res) => {
  if (!tenantOk(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const cur = await q('SELECT * FROM institutions WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const data = { ...cur.rows[0].data, ...req.body, updatedAt: now() };
  await q('UPDATE institutions SET data = $2, slug = $3 WHERE id = $1', [req.params.id, data, data.slug || cur.rows[0].slug]);
  res.json({ ok: true });
});

app.delete('/api/institutions/:id', auth, superAdmin, async (req, res) => {
  await q('DELETE FROM institutions WHERE id = $1', [req.params.id]); // FK cascades
  res.json({ ok: true });
});

// ---------- departments ----------

app.get('/api/institutions/:iid/departments', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM departments WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
});

app.post('/api/institutions/:iid/departments', auth, async (req, res) => {
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
  const data = { ...cur.rows[0].data, ...body, updatedAt: now() };
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

app.patch('/api/departments/:id', auth, (req, res) => patchRow('departments', req.params.id, req.body, res, req));
app.delete('/api/departments/:id', auth, (req, res) => deleteRow('departments', req.params.id, res, req));

// ---------- admins ----------

app.get('/api/institutions/:iid/admins', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM admins WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/admins', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const data = { ...req.body, institutionId: req.params.iid, role: 'super_admin', createdAt: now() };
  await q('INSERT INTO admins (id, institution_id, username, email, data) VALUES ($1,$2,$3,$4,$5)',
    [id, req.params.iid, data.username || null, data.email || null, data]);
  res.json({ id, ...req.body });
});

app.patch('/api/admins/:id/password', auth, async (req, res) => {
  const cur = await q('SELECT * FROM admins WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  if (!tenantOk(req, cur.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const data = { ...cur.rows[0].data, password: req.body.password, updatedAt: now() };
  await q('UPDATE admins SET data = $2 WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});

app.patch('/api/admins/:id', auth, (req, res) => patchRow('admins', req.params.id, req.body, res, req));
app.delete('/api/admins/:id', auth, (req, res) => deleteRow('admins', req.params.id, res, req));

// ---------- users / students ----------

app.get('/api/institutions/:iid/users', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const role = req.query.role;
  const { rows } = role
    ? await q('SELECT * FROM users WHERE institution_id = $1 AND role = $2', [req.params.iid, role])
    : await q('SELECT * FROM users WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/users', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const data = { ...req.body, institutionId: req.params.iid, createdAt: now() };
  await q('INSERT INTO users (id, institution_id, username, role, data) VALUES ($1,$2,$3,$4,$5)',
    [id, req.params.iid, data.username || null, data.role || null, data]);
  res.json({ id, ...data });
});

app.patch('/api/users/:id', auth, (req, res) => patchRow('users', req.params.id, req.body, res, req));
app.delete('/api/users/:id', auth, (req, res) => deleteRow('users', req.params.id, res, req));

app.get('/api/users/:id/results', auth, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE user_id = $1', [req.params.id]);
  res.json(toDocs(rows));
});

// ---------- exams ----------

app.get('/api/institutions/:iid/exams', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM exams WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/exams', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const id = newId();
  const data = { ...req.body, institutionId: req.params.iid, createdAt: now() };
  await q('INSERT INTO exams (id, institution_id, data) VALUES ($1,$2,$3)', [id, req.params.iid, data]);
  res.json({ id, ...req.body });
});

app.patch('/api/exams/:id', auth, (req, res) => patchRow('exams', req.params.id, req.body, res, req));
app.delete('/api/exams/:id', auth, (req, res) => deleteRow('exams', req.params.id, res, req));

// ---------- questions ----------

app.get('/api/institutions/:iid/questions', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM questions WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.get('/api/exams/:examId/questions', auth, examTenant, async (req, res) => {
  const { rows } = await q('SELECT * FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json(toDocs(rows));
});

app.get('/api/exams/:examId/questions/count', auth, examTenant, async (req, res) => {
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json({ count: rows[0].n });
});

app.post('/api/questions', auth, async (req, res) => {
  if (req.body.institutionId && !tenantOk(req, req.body.institutionId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const id = newId();
  const data = { ...req.body, createdAt: now() };
  await q('INSERT INTO questions (id, institution_id, exam_id, data) VALUES ($1,$2,$3,$4)',
    [id, data.institutionId || null, data.examId || null, data]);
  res.json({ id, ...req.body });
});

app.post('/api/exams/:examId/questions/bulk', auth, examTenant, async (req, res) => {
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

app.patch('/api/questions/:id', auth, (req, res) => patchRow('questions', req.params.id, req.body, res, req));
app.delete('/api/questions/:id', auth, (req, res) => deleteRow('questions', req.params.id, res, req));
app.delete('/api/exams/:examId/questions', auth, examTenant, async (req, res) => {
  await q('DELETE FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json({ ok: true });
});

// ---------- results ----------

app.get('/api/institutions/:iid/results', auth, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM results WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('completedAt')));
});

app.get('/api/exams/:examId/results', auth, examTenant, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE exam_id = $1', [req.params.examId]);
  res.json(toDocs(rows));
});

app.post('/api/results', auth, async (req, res) => {
  const id = newId();
  const data = { ...req.body, completedAt: now(), submittedAt: now() };
  await q('INSERT INTO results (id, institution_id, exam_id, user_id, data) VALUES ($1,$2,$3,$4,$5)',
    [id, data.institutionId || req.user.institutionId || null, data.examId || null, data.userId || req.user.sub || null, data]);
  res.json({ id, ...req.body });
});

app.get('/api/results/:id', auth, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Result not found' });
  if (rows[0].institution_id && !tenantOk(req, rows[0].institution_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(toDoc(rows[0]));
});

app.patch('/api/results/:id', auth, (req, res) => patchRow('results', req.params.id, req.body, res, req));
app.delete('/api/results/:id', auth, (req, res) => deleteRow('results', req.params.id, res, req));

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
