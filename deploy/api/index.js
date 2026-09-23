require('express-async-errors');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, q, toDoc, toDocs, byDateDesc } = require('./db');
const { scoreSubmission, resolveCorrectAnswer } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured');
const JWT_SECRET = process.env.JWT_SECRET;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null;
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'https://cbt.pisairtelsms.com,http://localhost:3000,http://localhost:3001')
  .split(',').map(origin => origin.trim()).filter(Boolean));

app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 2));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json({ limit: '10mb' }));

const newId = () => crypto.randomUUID();
const newStudentId = () => `STU-${newId().toUpperCase()}`;
const now = () => new Date().toISOString();
const DEFAULT_INSTITUTION_SETTINGS = {
  timezone: 'Africa/Lagos', dateFormat: 'DD/MM/YYYY', timeFormat: '24h',
  allowStudentRegistration: true, requireEmailVerification: false, maxExamAttempts: 3, examTimeLimit: 60,
  showCorrectAnswers: false, allowReviewAfterSubmit: true, autoSubmitOnTimeUp: true,
  randomizeQuestions: true, randomizeOptions: true, showProgressBar: true, allowBackNavigation: true,
  emailNotifications: false, smsNotifications: false, maintenanceMode: false,
  maintenanceMessage: 'System is under maintenance. Please try again later.'
};
const institutionSettings = data => ({ ...DEFAULT_INSTITUTION_SETTINGS, ...(data?.settings || {}) });
const parseStoredDate = (value) => {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'number' || typeof value === 'string') {
    const numeric = typeof value === 'number' ? value : /^\d{9,13}$/.test(value) ? Number(value) : null;
    const date = numeric === null ? new Date(value) : new Date(numeric < 1e11 ? numeric * 1000 : numeric);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === 'object') {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
      const date = new Date(seconds * 1000 + nanoseconds / 1e6);
      return Number.isFinite(date.getTime()) ? date : null;
    }
  }
  return null;
};
const toResultDoc = (row, includeAnswers = true) => {
  const data = toDoc(row);
  const completedAt = [data.completedAt, data.submittedAt, data.createdAt, data.date, data.timestamp, row.created_at]
    .map(parseStoredDate)
    .find(Boolean);
  const result = { ...data, completedAt: completedAt?.toISOString() || null };
  if (!includeAnswers) delete result.answers;
  return result;
};

// ---------- auth ----------

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h', jwtid: newId() });
}

async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (!req.user.exp) return res.status(401).json({ error: 'Session must be renewed' });
  if (req.user.jti) {
    const revoked = await q('SELECT 1 FROM revoked_tokens WHERE jti = $1 AND expires_at > now()', [req.user.jti]);
    if (revoked.rows.length) return res.status(401).json({ error: 'Session has been signed out' });
  }

  if (req.user.role === 'super_admin') {
    const admin = await q('SELECT id, username, email, data FROM super_admins WHERE id = $1', [req.user.sub]);
    if (!admin.rows.length) return res.status(401).json({ error: 'Account is no longer active' });
    if (Number(req.user.authVersion || 0) !== Number(admin.rows[0].data?.authVersion || 0)) return res.status(401).json({ error: 'Session has been invalidated' });
    req.account = { id: admin.rows[0].id, uid: admin.rows[0].id, username: admin.rows[0].username, email: admin.rows[0].email, fullName: admin.rows[0].data?.fullName, role: 'super_admin' };
    return next();
  }

  const table = req.user.role === 'student' ? 'users' : req.user.role === 'admin' ? 'admins' : null;
  if (!table) return res.status(403).json({ error: 'Unsupported account role' });
  const account = await q(
    `SELECT a.id, a.institution_id, a.data, i.data AS institution_data FROM ${table} a JOIN institutions i ON i.id = a.institution_id WHERE a.id = $1`,
    [req.user.sub]
  );
  if (!account.rows.length || account.rows[0].institution_id !== req.user.institutionId || account.rows[0].data.isActive === false) {
    return res.status(401).json({ error: 'Account is no longer active' });
  }
  if (Number(req.user.authVersion || 0) !== Number(account.rows[0].data.authVersion || 0)) {
    return res.status(401).json({ error: 'Session has been invalidated' });
  }
  if (account.rows[0].institution_data.status === 'suspended') {
    return res.status(403).json({ error: 'Institution is suspended' });
  }
  const activeSettings = institutionSettings(account.rows[0].institution_data);
  if (req.user.role === 'student' && activeSettings.maintenanceMode) {
    return res.status(503).json({ error: activeSettings.maintenanceMessage || 'The institution portal is under maintenance.' });
  }
  const data = account.rows[0].data;
  req.account = {
    id: account.rows[0].id, username: data.username, email: data.email, fullName: data.fullName,
    role: req.user.role, institutionId: account.rows[0].institution_id,
    institutionName: account.rows[0].institution_data.name,
    timezone: account.rows[0].institution_data.settings?.timezone || 'Africa/Lagos',
    dateFormat: account.rows[0].institution_data.settings?.dateFormat || 'DD/MM/YYYY',
    timeFormat: account.rows[0].institution_data.settings?.timeFormat || '24h',
    ...(req.user.role === 'student' ? {
      studentId: data.studentId, departmentId: data.departmentId || '', department: data.department || '',
      departmentCode: data.departmentCode || null, level: data.level || ''
    } : {})
  };
  next();
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

function studentOnly(req, res, next) {
  if (req.user?.role !== 'student') return res.status(403).json({ error: 'Student access required' });
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

function examValidationError(exam) {
  if (!exam || typeof exam.title !== 'string' || !exam.title.trim()) return 'Exam title is required';
  const duration = Number(exam.duration);
  const passingScore = Number(exam.passingScore);
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) return 'Duration must be between 1 and 600 minutes';
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) return 'Passing score must be between 0 and 100';
  if (!['objective', 'essay'].includes(String(exam.type || 'objective').toLowerCase())) return 'Unsupported exam type';
  if (exam.isActive !== undefined && typeof exam.isActive !== 'boolean') return 'Exam active state must be true or false';
  const start = exam.startDate ? parseStoredDate(exam.startDate) : null;
  const end = exam.endDate ? parseStoredDate(exam.endDate) : null;
  if (exam.startDate && !start) return 'Start date is invalid';
  if (exam.endDate && !end) return 'End date is invalid';
  if (start && end && end <= start) return 'End date must be after start date';
  return null;
}

function normalizeQuestionData(question) {
  const type = String(question?.type || 'multiple-choice').toLowerCase();
  const normalized = {
    ...question,
    type,
    question: typeof question?.question === 'string' ? question.question.trim() : '',
    points: Number(question?.points),
  };
  if (['multiple-choice', 'true-false'].includes(type)) {
    normalized.options = Array.isArray(question?.options)
      ? question.options.map(option => String(option ?? '').trim()).filter(Boolean)
      : [];
    if (normalized.correctIndex !== undefined && normalized.correctIndex !== null && normalized.correctIndex !== '') {
      normalized.correctIndex = Number(normalized.correctIndex);
    }
    if (typeof normalized.correctAnswer === 'string') normalized.correctAnswer = normalized.correctAnswer.trim();
  }
  if (type === 'short-answer' && typeof normalized.correctAnswer === 'string') {
    normalized.correctAnswer = normalized.correctAnswer.trim();
  }
  if (type === 'essay') {
    normalized.rubricKeywords = String(normalized.rubricKeywords || '').trim();
    normalized.modelAnswer = String(normalized.modelAnswer || '').trim();
    normalized.minWords = Math.max(0, Number(normalized.minWords) || 0);
  }
  return normalized;
}

function questionValidationError(question, exam) {
  if (!question || typeof question.question !== 'string' || !question.question.trim()) return 'Question text is required';
  const type = String(question.type || 'multiple-choice').toLowerCase();
  if (!['multiple-choice', 'true-false', 'short-answer', 'essay'].includes(type)) return 'Unsupported question type';
  const isEssayExam = String(exam.type || '').toLowerCase() === 'essay';
  if (isEssayExam !== (type === 'essay')) return 'Question type must match the exam type';
  if (type === 'multiple-choice' || type === 'true-false') {
    const options = Array.isArray(question.options) ? question.options.filter(option => typeof option === 'string' && option.trim()) : [];
    if (options.length < 2) return 'At least two non-empty options are required';
    const answer = question.correctIndex ?? question.correctAnswer;
    if (answer == null || String(answer).trim() === '') return 'A correct answer is required';
    const answerText = String(answer).trim();
    let index = null;
    if (/^\d+$/.test(answerText)) index = Number(answerText);
    else if (/^[A-E]$/i.test(answerText)) index = answerText.toUpperCase().charCodeAt(0) - 65;
    if (index !== null && (index < 0 || index >= options.length)) return 'Correct answer index is outside the options';
    if (index === null && !options.some(option => option.trim().toLowerCase() === answerText.toLowerCase())) return 'Correct answer must match one of the options';
  }
  if (type === 'short-answer' && (question.correctAnswer == null || !String(question.correctAnswer).trim())) return 'A correct answer is required';
  if (type === 'essay' && !String(question.rubricKeywords || '').trim() && !String(question.modelAnswer || '').trim()) {
    return 'Provide rubric keywords or a model answer for essay scoring';
  }
  if (!Number.isFinite(Number(question.points)) || Number(question.points) <= 0) return 'Points must be greater than zero';
  return null;
}

const rateLimitBuckets = new Map();
const rateLimit = (scope, limit, windowMs) => (req, res, next) => {
  const key = `${scope}:${req.ip || 'unknown'}`;
  const cutoff = Date.now() - windowMs;
  const hits = (rateLimitBuckets.get(key) || []).filter(timestamp => timestamp > cutoff);
  if (hits.length >= limit) {
    res.set('Retry-After', String(Math.ceil((hits[0] + windowMs - Date.now()) / 1000)));
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  hits.push(Date.now());
  rateLimitBuckets.set(key, hits);
  next();
};
const publicRateLimit = rateLimit('public', 10, 10 * 60 * 1000);
const authRateLimit = rateLimit('auth', 10, 15 * 60 * 1000);

async function examHistoryCount(examId, db = pool) {
  const query = typeof db === 'function' ? db : db.query.bind(db);
  const { rows } = await query(
    'SELECT (SELECT count(*) FROM results WHERE exam_id=$1) + (SELECT count(*) FROM exam_attempts WHERE exam_id=$1) AS n',
    [examId]
  );
  return Number(rows[0].n);
}

function examIsCurrentlyAvailable(examData, nowDate = new Date()) {
  if (examData?.isActive === false || examData?.isActive === 'false') return false;
  const startDate = parseStoredDate(examData?.startDate);
  const endDate = parseStoredDate(examData?.endDate);
  if ((examData?.startDate && !startDate) || (examData?.endDate && !endDate)) return false;
  return (!startDate || startDate <= nowDate) && (!endDate || endDate >= nowDate);
}
setInterval(() => {
  const nowMs = Date.now();
  for (const [key, hits] of rateLimitBuckets) {
    const active = hits.filter(timestamp => nowMs - timestamp < 15 * 60 * 1000);
    active.length ? rateLimitBuckets.set(key, active) : rateLimitBuckets.delete(key);
  }
}, 15 * 60 * 1000).unref();

// ---------- public ----------

app.get('/health', async (req, res) => {
  try {
    await q('SELECT 1');
    res.json({ status: 'healthy', time: now() });
  } catch (e) {
    res.status(500).json({ status: 'unhealthy' });
  }
});

app.get('/api/institutions/slug/:slug', async (req, res) => {
  const { rows } = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!rows.length) return res.status(404).json({ error: 'Institution not found' });
  const data = toDoc(rows[0]);
  const settings = institutionSettings(data);
  res.json({
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status || 'active',
    logo: data.logo || null,
    allowStudentRegistration: settings.allowStudentRegistration !== false,
    maintenanceMode: settings.maintenanceMode === true,
    maintenanceMessage: settings.maintenanceMode === true ? settings.maintenanceMessage : null,
  });
});

app.get('/api/blogs', async (req, res) => {
  const { rows } = await q('SELECT * FROM blogs WHERE published = true');
  res.json(toDocs(rows).sort(byDateDesc('publishedAt')));
});

app.get('/api/blogs/:id', async (req, res) => {
  const { rows } = await q('SELECT * FROM blogs WHERE id = $1 AND published = true', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Blog not found' });
  res.json(toDoc(rows[0]));
});

app.post('/api/auth/super-admin/login', authRateLimit, async (req, res) => {
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
    token: sign({ role: 'super_admin', sub: admin.id, authVersion: Number(admin.data?.authVersion || 0) }),
    user: { uid: admin.id, email: admin.email, displayName: admin.data?.fullName || admin.username },
  });
});

app.get('/api/auth/session', auth, (req, res) => res.json({ success: true, user: req.account }));
app.post('/api/auth/logout', auth, async (req, res) => {
  if (req.user.jti) {
    await q('INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT DO NOTHING', [req.user.jti, req.user.exp]);
  }
  res.json({ ok: true });
});

app.post('/api/auth/institution/:slug/login', authRateLimit, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const inst = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!inst.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const institution = toDoc(inst.rows[0]);

  if (institution.status === 'suspended') {
    return res.status(403).json({ error: 'Your institution has been suspended. Contact your administrator.' });
  }

  const login = String(username).trim().toLowerCase();
  const admins = await q(
    "SELECT * FROM admins WHERE institution_id = $1 AND (lower(coalesce(username,'')) = $2 OR lower(coalesce(email,'')) = $2 OR lower(coalesce(data->>'username','')) = $2 OR lower(coalesce(data->>'email','')) = $2)",
    [institution.id, login]
  );

  const matchingAdmins = [];
  for (const admin of admins.rows) {
    if (admin.data.isActive !== false && await verifyPassword(admin.data.password, password)) matchingAdmins.push(admin);
  }
  if (matchingAdmins.length > 1) return res.status(409).json({ error: 'Multiple admin accounts match these credentials. Contact the super administrator.' });
  if (matchingAdmins.length === 1) {
    const admin = matchingAdmins[0];
    await maybeUpgradeHash('admins', admin.id, admin.data, password).catch(() => {});
    const user = {
      id: admin.id, username: admin.data.username, email: admin.data.email,
      fullName: admin.data.fullName, role: 'admin',
      institutionId: institution.id, institutionName: institution.name,
      timezone: institution.settings?.timezone || 'Africa/Lagos',
      dateFormat: institution.settings?.dateFormat || 'DD/MM/YYYY',
      timeFormat: institution.settings?.timeFormat || '24h',
    };
    return res.json({ success: true, token: sign({ role: 'admin', institutionId: institution.id, sub: admin.id, authVersion: Number(admin.data.authVersion || 0) }), user });
  }

  if (institution.settings?.maintenanceMode) return res.status(503).json({ error: institution.settings.maintenanceMessage || 'The institution portal is under maintenance.' });
  const students = await q(
    "SELECT * FROM users WHERE institution_id = $1 AND role = 'student' AND (lower(coalesce(username,'')) = $2 OR lower(coalesce(data->>'username','')) = $2 OR lower(coalesce(data->>'email','')) = $2)",
    [institution.id, login]
  );
  for (const student of students.rows) {
    const d = student.data;
    if (d.isActive === false) continue;
    if (await verifyPassword(d.password, password)) {
      await maybeUpgradeHash('users', student.id, d, password).catch(() => {});
      const user = {
        id: student.id, username: d.username, email: d.email, fullName: d.fullName,
        role: 'student', institutionId: institution.id, institutionName: institution.name,
        timezone: institution.settings?.timezone || 'Africa/Lagos',
        dateFormat: institution.settings?.dateFormat || 'DD/MM/YYYY',
        timeFormat: institution.settings?.timeFormat || '24h',
        departmentId: d.departmentId || '', department: d.department || '',
        departmentCode: d.departmentCode || null, level: d.level || '',
      };
      return res.json({ success: true, token: sign({ role: 'student', institutionId: institution.id, sub: student.id, authVersion: Number(d.authVersion || 0) }), user });
    }
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

// ---------- public: institution self-registration ----------

app.get('/api/public/institutions/:slug/departments', async (req, res) => {
  const inst = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!inst.rows.length) return res.status(404).json({ error: 'Institution not found' });
  if (toDoc(inst.rows[0]).status === 'suspended') return res.status(403).json({ error: 'This institution is suspended' });
  const { rows } = await q('SELECT * FROM departments WHERE institution_id = $1', [inst.rows[0].id]);
  res.json(toDocs(rows).filter(d => d.isActive !== false).map(d => ({
    id: d.id, name: d.name, code: d.code || null, levels: d.levels || [], isActive: true,
  })));
});

app.post('/api/public/institutions/:slug/register', publicRateLimit, async (req, res) => {
  const body = req.body || {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const level = typeof body.level === 'string' ? body.level.trim() : '';
  if (!fullName || !email || !username || !password || !level) {
    return res.status(400).json({ error: 'Full name, email, username, password and level are required' });
  }
  if (fullName.length > 200 || email.length > 254 || level.length > 60 || password.length < 8 || password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'One or more registration fields are invalid' });
  }

  const inst = await q('SELECT * FROM institutions WHERE slug = $1', [req.params.slug]);
  if (!inst.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const institution = toDoc(inst.rows[0]);
  if (institution.status === 'suspended') return res.status(403).json({ error: 'This institution is not accepting registrations.' });
  if (institution.settings?.maintenanceMode) return res.status(503).json({ error: institution.settings.maintenanceMessage || 'Registration is temporarily unavailable.' });
  if (institution.settings?.allowStudentRegistration === false) return res.status(403).json({ error: 'Student self-registration is disabled.' });
  if (institution.settings?.requireEmailVerification) return res.status(503).json({ error: 'Email verification is enabled but not configured. Contact the institution administrator.' });

  let departmentId = '';
  let department = typeof body.department === 'string' ? body.department.trim() : '';
  let departmentCode = null;
  if (body.departmentId) {
    const dept = await q('SELECT id, data FROM departments WHERE id = $1 AND institution_id = $2', [body.departmentId, inst.rows[0].id]);
    if (!dept.rows.length) return res.status(400).json({ error: 'Selected department is invalid' });
    const deptData = toDoc(dept.rows[0]);
    if (deptData.isActive === false) return res.status(400).json({ error: 'Selected department is inactive' });
    if (Array.isArray(deptData.levels) && deptData.levels.length && !deptData.levels.includes(level)) {
      return res.status(400).json({ error: 'Selected level is not available in this department' });
    }
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
    phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim().slice(0, 40) : '',
    role: 'student',
    authVersion: 0,
    isActive: true,
    institutionId: inst.rows[0].id,
    institutionName: institution.name,
    createdAt: now(),
  };
  const inserted = await q('INSERT INTO users (id, institution_id, username, role, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',
    [id, inst.rows[0].id, username, 'student', data]);
  if (!inserted.rowCount) return res.status(409).json({ error: 'A user with this email or username already exists.' });
  res.json({ success: true, id, studentId });
});

app.post('/api/contact', publicRateLimit, async (req, res) => {
  const body = req.body || {};
  if (typeof body.name !== 'string' || !body.name.trim() || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }
  const result = await q('INSERT INTO demo_requests (kind, data) VALUES ($1,$2) RETURNING id',
    ['contact', { name: body.name.trim().slice(0, 200), email: body.email.trim().toLowerCase(), message: String(body.message || '').trim().slice(0, 5000), status: 'new', submittedAt: now() }]);
  res.json({ ok: true, id: result.rows[0].id });
});

app.post('/api/schedule-demo', publicRateLimit, async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const school = typeof body.school === 'string' ? body.school.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || !school || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Name, institution and a valid email are required' });
  }
  const data = {
    name: name.slice(0, 200), school: school.slice(0, 200), email,
    phone: String(body.phone || '').trim().slice(0, 40),
    position: String(body.position || '').trim().slice(0, 100),
    studentsCount: String(body.studentsCount || '').trim().slice(0, 50),
    status: 'new', submittedAt: now(),
  };
  const result = await q('INSERT INTO demo_requests (kind, data) VALUES ($1,$2) RETURNING id', ['demo', data]);
  res.json({ ok: true, id: result.rows[0].id });
});

app.get('/api/demo-requests', auth, superAdmin, async (req, res) => {
  const { rows } = await q('SELECT id, kind, data, created_at FROM demo_requests ORDER BY created_at DESC LIMIT 500');
  res.json(rows.map(row => ({ id: row.id, kind: row.kind, ...row.data, createdAt: row.created_at })));
});

app.patch('/api/demo-requests/:id', auth, superAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!['new', 'contacted', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid lead status' });
  const { rows } = await q('SELECT data FROM demo_requests WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Lead not found' });
  await q('UPDATE demo_requests SET data = $2 WHERE id = $1', [req.params.id, { ...rows[0].data, status, updatedAt: now() }]);
  res.json({ ok: true });
});

// ---------- authed: flat collections (tenant-scoped) ----------

app.get('/api/exams', auth, async (req, res) => {
  const { rows } = req.user.role === 'super_admin'
    ? await q('SELECT e.*, (SELECT count(*)::int FROM questions q WHERE q.exam_id=e.id) AS total_questions FROM exams e')
    : await q(`SELECT e.*, (SELECT count(*)::int FROM questions q WHERE q.exam_id=e.id) AS total_questions
               FROM exams e WHERE e.institution_id = $1${req.user.role === 'student' ? " AND COALESCE((e.data->>'isActive')::boolean,true)" : ''}`,
      [req.user.institutionId]);
  const exams = rows.map(row => ({ ...toDoc(row), totalQuestions: Number(row.total_questions) || 0 }));
  if (req.user.role !== 'student') return res.json(exams);

  const institution = await q('SELECT data FROM institutions WHERE id = $1', [req.user.institutionId]);
  const settings = institutionSettings(institution.rows[0]?.data);
  const [attemptCounts, activeAttempts] = await Promise.all([
    q(`SELECT exam_id, count(*)::int AS used FROM (
      SELECT exam_id FROM exam_attempts WHERE user_id = $1
      UNION ALL SELECT exam_id FROM results WHERE user_id = $1 AND attempt_id IS NULL
    ) used_attempts GROUP BY exam_id`, [req.user.sub]),
    q("SELECT DISTINCT ON (exam_id) exam_id, id FROM exam_attempts WHERE user_id = $1 AND status = 'in_progress' AND deadline_at > now() ORDER BY exam_id, started_at DESC", [req.user.sub])
  ]);
  const usedByExam = new Map(attemptCounts.rows.map(row => [row.exam_id, row.used]));
  const activeByExam = new Map(activeAttempts.rows.map(row => [row.exam_id, row.id]));
  const maxAttempts = Math.min(20, Math.max(1, Math.floor(Number(settings.maxExamAttempts) || 3)));
  const nowDate = new Date();
  res.json(exams.map(exam => ({
    ...exam,
    examAvailable: examIsCurrentlyAvailable(exam, nowDate),
    duration: Number(exam.duration) || Number(settings.examTimeLimit) || 60,
    attemptsUsed: usedByExam.get(exam.id) || 0,
    maxAttempts,
    activeAttemptId: activeByExam.get(exam.id) || null,
    randomizeQuestions: exam.randomizeQuestions ?? settings.randomizeQuestions ?? true,
    randomizeOptions: exam.randomizeOptions ?? settings.randomizeOptions ?? true,
    showProgressBar: settings.showProgressBar !== false,
    allowBackNavigation: settings.allowBackNavigation !== false,
    autoSubmitOnTimeUp: settings.autoSubmitOnTimeUp !== false,
    allowReviewAfterSubmit: settings.allowReviewAfterSubmit !== false,
    showCorrectAnswers: settings.showCorrectAnswers === true,
  })));
});

app.post('/api/exams/:examId/attempts', auth, studentOnly, examTenant, async (req, res) => {
  const exam = await q('SELECT institution_id, data, (SELECT count(*)::int FROM questions WHERE exam_id = $1) AS question_count FROM exams WHERE id = $1', [req.params.examId]);
  const examData = exam.rows[0].data;
  const institution = await q('SELECT data FROM institutions WHERE id = $1', [req.examInstitutionId]);
  const settings = institutionSettings(institution.rows[0]?.data);
  const nowDate = new Date();
  const startDate = parseStoredDate(examData.startDate);
  const endDate = parseStoredDate(examData.endDate);
  const durationMinutes = Number(examData.duration || settings.examTimeLimit || 60);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
    return res.status(400).json({ error: 'Exam duration must be between 1 and 600 minutes' });
  }
  const maxAttempts = Math.min(20, Math.max(1, Math.floor(Number(settings.maxExamAttempts) || 3)));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [req.examInstitutionId, `${req.params.examId}:${req.user.sub}`]);
    if (settings.maintenanceMode) {
      await client.query('COMMIT');
      return res.status(503).json({ error: settings.maintenanceMessage || 'The institution portal is under maintenance.' });
    }
    if ((examData.startDate && !startDate) || (examData.endDate && !endDate)) {
      await client.query('COMMIT');
      return res.status(400).json({ error: 'Exam schedule is invalid. Contact an administrator.' });
    }
    if (!examIsCurrentlyAvailable(examData, nowDate)) {
      await client.query('COMMIT');
      return res.status(403).json({ error: 'This exam is not currently available' });
    }
    if (!Number(exam.rows[0].question_count)) {
      await client.query('COMMIT');
      return res.status(400).json({ error: 'This exam has no questions yet' });
    }
    const current = await client.query("SELECT * FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1", [req.params.examId, req.user.sub]);
    if (current.rows.length && current.rows[0].deadline_at > nowDate) {
      const usage = await client.query(`SELECT
        (SELECT count(*) FROM exam_attempts WHERE exam_id=$1 AND user_id=$2) +
        (SELECT count(*) FROM results WHERE exam_id=$1 AND user_id=$2 AND attempt_id IS NULL) AS n`, [req.params.examId, req.user.sub]);
      await client.query('COMMIT');
      return res.json({
        id: current.rows[0].id,
        startedAt: current.rows[0].started_at,
        deadlineAt: current.rows[0].deadline_at,
        attemptsUsed: Number(usage.rows[0].n),
        maxAttempts,
      });
    }
    if (current.rows.length) await client.query("UPDATE exam_attempts SET status = 'expired' WHERE id = $1", [current.rows[0].id]);
    const usage = await client.query(`SELECT
      (SELECT count(*) FROM exam_attempts WHERE exam_id=$1 AND user_id=$2) +
      (SELECT count(*) FROM results WHERE exam_id=$1 AND user_id=$2 AND attempt_id IS NULL) AS n`, [req.params.examId, req.user.sub]);
    const attemptsUsed = Number(usage.rows[0].n);
    if (attemptsUsed >= maxAttempts) {
      await client.query('COMMIT');
      return res.status(403).json({ error: 'Maximum exam attempts reached', attemptsUsed, maxAttempts });
    }
    const id = newId();
    const startedAt = nowDate;
    const deadlineAt = new Date(Math.min(nowDate.getTime() + durationMinutes * 60 * 1000, endDate ? endDate.getTime() : Number.POSITIVE_INFINITY));
    if (deadlineAt.getTime() <= nowDate.getTime()) {
      await client.query('COMMIT');
      return res.status(403).json({ error: 'This exam is no longer available' });
    }
    await client.query('INSERT INTO exam_attempts (id,institution_id,exam_id,user_id,started_at,deadline_at,status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, req.examInstitutionId, req.params.examId, req.user.sub, startedAt, deadlineAt, 'in_progress']);
    await client.query('COMMIT');
    res.json({ id, startedAt, deadlineAt, attemptsUsed: attemptsUsed + 1, maxAttempts });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.get('/api/users', auth, staffOnly, async (req, res) => {
  const { rows } = req.user.role === 'super_admin'
    ? await q('SELECT * FROM users')
    : await q('SELECT * FROM users WHERE institution_id = $1', [req.user.institutionId]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.get('/api/results', auth, staffOnly, async (req, res) => {
  const columns = "id, institution_id, exam_id, user_id, data - 'answers' AS data, created_at";
  const { rows } = req.user.role === 'super_admin'
    ? await q(`SELECT ${columns} FROM results ORDER BY created_at DESC`)
    : await q(`SELECT ${columns} FROM results WHERE institution_id = $1 ORDER BY created_at DESC`, [req.user.institutionId]);
  res.json(rows.map(row => toResultDoc(row, false)));
});

// ---------- institutions (super admin) ----------

app.get('/api/institutions', auth, superAdmin, async (req, res) => {
  const { rows } = await q(`SELECT i.*, (SELECT count(*)::int FROM users u WHERE u.institution_id = i.id AND u.role = 'student') AS user_count FROM institutions i`);
  res.json(rows.map(row => ({ ...toDoc(row), totalUsers: row.user_count })).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions', auth, superAdmin, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim().toLowerCase() : '';
  if (!name || name.length > 200 || !slug) return res.status(400).json({ error: 'Institution name and slug are required' });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' });
  }
  const existing = await q('SELECT id FROM institutions WHERE slug = $1', [slug]);
  if (existing.rows.length) return res.status(409).json({ error: 'An institution with this slug already exists' });
  const id = newId();
  const data = {
    name,
    slug,
    description: String(req.body.description || '').slice(0, 1000),
    email: String(req.body.email || '').trim().slice(0, 254),
    phone: String(req.body.phone || '').trim().slice(0, 40),
    address: String(req.body.address || '').slice(0, 500),
    logo: String(req.body.logo || '').trim().slice(0, 2048),
    settings: { ...DEFAULT_INSTITUTION_SETTINGS, ...(req.body.settings || {}) },
    status: 'active',
    createdAt: now(),
    totalUsers: 0,
  };
  await q('INSERT INTO institutions (id, slug, data) VALUES ($1, $2, $3)', [id, slug, data]);
  res.json({ id, ...data });
});

// ---------- institutions (tenant-scoped) ----------

app.get('/api/institutions/:id', auth, async (req, res) => {
  if (!tenantOk(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM institutions WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Institution not found' });
  const data = toDoc(rows[0]);
  if (req.user.role === 'student') {
    return res.json({ id: data.id, name: data.name, slug: data.slug, status: data.status || 'active', logo: data.logo || null });
  }
  res.json(data);
});

app.get('/api/institutions/:iid/summary', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q(`WITH scores AS (
    SELECT CASE WHEN data->>'percentage' ~ '^[0-9]+([.][0-9]+)?$' THEN (data->>'percentage')::numeric END AS percentage
    FROM results WHERE institution_id = $1
  ), score_stats AS (
    SELECT count(percentage)::int AS scored_count,
      count(*) FILTER (WHERE percentage >= 50)::int AS passed_count,
      coalesce(round(avg(percentage), 2), 0) AS average_score
    FROM scores
  )
  SELECT
    (SELECT count(*)::int FROM exams WHERE institution_id = $1) AS "totalExams",
    (SELECT count(*)::int FROM questions WHERE institution_id = $1) AS "totalQuestions",
    (SELECT count(*)::int FROM users WHERE institution_id = $1 AND role = 'student') AS "totalStudents",
    (SELECT count(*)::int FROM results WHERE institution_id = $1) AS "totalResults",
    (SELECT count(*)::int FROM exams WHERE institution_id = $1 AND data->>'isActive' = 'true') AS "activeExams",
    (SELECT count(*)::int FROM results WHERE institution_id = $1 AND data->>'status' = 'completed') AS "completedResults",
    score_stats.average_score AS "averageScore",
    coalesce(round(score_stats.passed_count * 100.0 / nullif(score_stats.scored_count, 0), 2), 0) AS "passRate"
  FROM score_stats`, [req.params.iid]);
  const stats = rows[0];
  res.json({ ...stats, averageScore: Number(stats.averageScore), passRate: Number(stats.passRate) });
});

app.patch('/api/institutions/:id', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const cur = await q('SELECT * FROM institutions WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Institution not found' });
  if (req.body.slug && req.body.slug !== cur.rows[0].slug) {
    return res.status(400).json({ error: 'Institution slug cannot be changed — it would break the portal URL' });
  }
  if (req.user.role !== 'super_admin' && req.body.status && req.body.status !== cur.rows[0].data.status) {
    return res.status(403).json({ error: 'Only a super administrator can change institution status' });
  }
  const editableFields = ['name', 'logo', 'description', 'email', 'phone', 'address', 'settings', 'status'];
  const allowedFields = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => editableFields.includes(key)));
  const data = { ...cur.rows[0].data, ...allowedFields, slug: cur.rows[0].slug, updatedAt: now() };
  if (allowedFields.status !== undefined && !['active', 'suspended'].includes(allowedFields.status)) {
    return res.status(400).json({ error: 'Institution status must be active or suspended' });
  }
  if (allowedFields.name !== undefined) {
    const name = String(allowedFields.name || '').trim();
    if (!name || name.length > 200) return res.status(400).json({ error: 'Institution name is required and must be at most 200 characters' });
    data.name = name;
  }
  for (const [field, maxLength] of [['description', 1000], ['phone', 40], ['address', 500]]) {
    if (allowedFields[field] !== undefined && (typeof allowedFields[field] !== 'string' || allowedFields[field].length > maxLength)) {
      return res.status(400).json({ error: `${field} must be a string of at most ${maxLength} characters` });
    }
  }
  if (allowedFields.email !== undefined && (typeof allowedFields.email !== 'string' || allowedFields.email.length > 254 || (allowedFields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedFields.email)))) {
    return res.status(400).json({ error: 'Institution email must be a valid email address' });
  }
  if (allowedFields.logo !== undefined) {
    const logo = String(allowedFields.logo || '').trim();
    if (logo.length > 2048 || (logo && !/^(https?:\/\/|\/|data:image\/(?:png|jpe?g|webp|svg\+xml);base64,)/i.test(logo))) {
      return res.status(400).json({ error: 'Logo must be an HTTPS URL, site-relative path, or image data URL' });
    }
    data.logo = logo;
  }
  if (allowedFields.settings !== undefined) {
    if (!allowedFields.settings || typeof allowedFields.settings !== 'object' || Array.isArray(allowedFields.settings)) {
      return res.status(400).json({ error: 'Settings must be an object' });
    }
    const settings = { ...institutionSettings(cur.rows[0].data), ...allowedFields.settings };
    const booleanFields = ['allowStudentRegistration', 'requireEmailVerification', 'showCorrectAnswers', 'allowReviewAfterSubmit', 'autoSubmitOnTimeUp', 'randomizeQuestions', 'randomizeOptions', 'showProgressBar', 'allowBackNavigation', 'maintenanceMode'];
    if (booleanFields.some(field => typeof settings[field] !== 'boolean')) return res.status(400).json({ error: 'Boolean settings must be true or false' });
    if (settings.requireEmailVerification) return res.status(400).json({ error: 'Email verification cannot be enabled until email delivery is configured' });
    const maxAttempts = Number(settings.maxExamAttempts);
    const timeLimit = Number(settings.examTimeLimit);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) return res.status(400).json({ error: 'Maximum attempts must be between 1 and 20' });
    if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 600) return res.status(400).json({ error: 'Default time limit must be between 1 and 600 minutes' });
    try { new Intl.DateTimeFormat('en', { timeZone: settings.timezone }); } catch { return res.status(400).json({ error: 'Timezone is invalid' }); }
    if (!['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(settings.dateFormat) || !['12h', '24h'].includes(settings.timeFormat)) {
      return res.status(400).json({ error: 'Date or time format is invalid' });
    }
    if (typeof settings.maintenanceMessage !== 'string' || settings.maintenanceMessage.length > 500) {
      return res.status(400).json({ error: 'Maintenance message must be at most 500 characters' });
    }
    settings.emailNotifications = false;
    settings.smsNotifications = false;
    data.settings = settings;
  }
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
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const levels = Array.isArray(body.levels) ? [...new Set(body.levels.filter(level => typeof level === 'string').map(level => level.trim()).filter(Boolean))] : [];
  if (!name || name.length > 120 || !levels.length || levels.length > 100) return res.status(400).json({ error: 'Department name and 1-100 valid levels are required' });
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const duplicate = await q("SELECT 1 FROM departments WHERE institution_id=$1 AND (lower(data->>'name')=lower($2) OR ($3 <> '' AND lower(data->>'code')=lower($3))) LIMIT 1", [req.params.iid, name, code]);
  if (duplicate.rowCount) return res.status(409).json({ error: 'Department name or code already exists' });
  const id = newId();
  const data = { ...body, name, code: code || null, levels, isActive: body.isActive !== false, createdAt: now(), updatedAt: now() };
  await q('INSERT INTO departments (id, institution_id, data) VALUES ($1, $2, $3)', [id, req.params.iid, data]);
  res.json({ id, ...data });
});

// Single-row helpers; enforce tenant match when the table has institution_id
async function patchRow(table, id, body, res, req) {
  const cur = await q(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  if (cur.rows[0].institution_id && !tenantOk(req, cur.rows[0].institution_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (body.password && (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128)) {
    return res.status(400).json({ error: 'Password must be 8-128 characters' });
  }
  const safeBody = ['users', 'admins'].includes(table) ? await hashBodyPassword({ ...body }) : { ...body };
  if (table === 'users') {
    safeBody.institutionId = cur.rows[0].institution_id;
    safeBody.role = cur.rows[0].role;
    if (cur.rows[0].role === 'student') safeBody.studentId = cur.rows[0].data.studentId || newStudentId();
    if (typeof safeBody.username === 'string') safeBody.username = safeBody.username.trim().toLowerCase();
    if (typeof safeBody.email === 'string') safeBody.email = safeBody.email.trim().toLowerCase();
  }
  if (table === 'admins') {
    safeBody.institutionId = cur.rows[0].institution_id;
    safeBody.role = 'admin';
    if (typeof safeBody.username === 'string') safeBody.username = safeBody.username.trim().toLowerCase();
    if (typeof safeBody.email === 'string') safeBody.email = safeBody.email.trim().toLowerCase();
  }
  if (['users', 'admins'].includes(table)) {
    const username = safeBody.username || cur.rows[0].data.username || '';
    const email = safeBody.email || cur.rows[0].data.email || '';
    const emailExpression = table === 'admins' ? "lower(coalesce(email, data->>'email',''))" : "lower(coalesce(data->>'email',''))";
    const duplicate = await q(
      `SELECT 1 FROM ${table} WHERE institution_id = $1 AND id <> $2 AND coalesce(data->>'isActive','true') <> 'false' AND (lower(coalesce(username, data->>'username','')) = $3 OR ${emailExpression} = $4) LIMIT 1`,
      [cur.rows[0].institution_id, id, String(username).toLowerCase(), String(email).toLowerCase()]
    );
    if (duplicate.rowCount) return res.status(409).json({ error: 'A user with this username or email already exists.' });
  }
  const data = { ...cur.rows[0].data, ...safeBody, updatedAt: now() };
  if (body.password && ['users', 'admins'].includes(table)) data.authVersion = Number(cur.rows[0].data.authVersion || 0) + 1;
  if (table === 'users') {
    await q('UPDATE users SET username=$2, role=$3, data=$4 WHERE id=$1', [id, data.username || null, data.role || null, data]);
  } else if (table === 'admins') {
    await q('UPDATE admins SET username=$2, email=$3, data=$4 WHERE id=$1', [id, data.username || null, data.email || null, data]);
  } else {
    await q(`UPDATE ${table} SET data = $2 WHERE id = $1`, [id, data]);
  }
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

app.patch('/api/departments/:id', auth, staffOnly, async (req, res) => {
  const current = await q('SELECT * FROM departments WHERE id = $1', [req.params.id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Department not found' });
  if (!tenantOk(req, current.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const data = { ...current.rows[0].data, ...body, updatedAt: now() };
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const levels = Array.isArray(data.levels) ? [...new Set(data.levels.filter(level => typeof level === 'string').map(level => level.trim()).filter(Boolean))] : [];
  const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
  if (!name || name.length > 120 || !levels.length || levels.length > 100) return res.status(400).json({ error: 'Department name and 1-100 valid levels are required' });
  const duplicate = await q("SELECT 1 FROM departments WHERE institution_id=$1 AND id<>$2 AND (lower(data->>'name')=lower($3) OR ($4 <> '' AND lower(data->>'code')=lower($4))) LIMIT 1", [current.rows[0].institution_id, req.params.id, name, code]);
  if (duplicate.rowCount) return res.status(409).json({ error: 'Department name or code already exists' });
  data.name = name; data.code = code || null; data.levels = levels;
  await q('UPDATE departments SET data=$2 WHERE id=$1', [req.params.id, data]);
  res.json({ ok: true });
});
app.delete('/api/departments/:id', auth, staffOnly, async (req, res) => {
  const department = await q('SELECT * FROM departments WHERE id=$1', [req.params.id]);
  if (!department.rows.length) return res.status(404).json({ error: 'Department not found' });
  if (!tenantOk(req, department.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const data = department.rows[0].data || {};
  const usage = await q("SELECT count(*)::int AS n FROM users WHERE institution_id=$1 AND (data->>'departmentId'=$2 OR (coalesce(data->>'departmentId','')='' AND lower(data->>'department')=lower($3)))", [department.rows[0].institution_id, req.params.id, data.name || '']);
  if (usage.rows[0].n) return res.status(409).json({ error: 'Students are assigned to this department. Reassign them before deleting it.' });
  await q('DELETE FROM departments WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- admins ----------

app.get('/api/institutions/:iid/admins', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM admins WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/admins', auth, superAdmin, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!fullName || !username || !email || !password || password.length < 8 || password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'Valid name, username, email and password (8-128 characters) are required' });
  }
  const client = await pool.connect();
  const id = newId();
  const data = {
    ...body, fullName, username, email, password: await bcrypt.hash(password, 10),
    institutionId: req.params.iid, role: 'admin', authVersion: 0, isActive: true, createdAt: now()
  };
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [req.params.iid, 'admin-account-create']);
    const duplicate = await client.query(
      "SELECT 1 FROM admins WHERE institution_id = $1 AND coalesce(data->>'isActive','true') <> 'false' AND (lower(coalesce(username,'')) = $2 OR lower(coalesce(email,'')) = $3 OR lower(coalesce(data->>'username','')) = $2 OR lower(coalesce(data->>'email','')) = $3) LIMIT 1",
      [req.params.iid, username, email]
    );
    if (duplicate.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An admin with this username or email already exists.' });
    }
    await client.query('INSERT INTO admins (id, institution_id, username, email, data) VALUES ($1,$2,$3,$4,$5)',
      [id, req.params.iid, username, email, data]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const { password: _password, passwordHash: _passwordHash, ...safe } = data;
  res.json({ id, ...safe });
});

app.patch('/api/admins/:id/password', auth, staffOnly, async (req, res) => {
  const current = await q('SELECT * FROM admins WHERE id = $1', [req.params.id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Admin not found' });
  if (!tenantOk(req, current.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  if (req.user.role === 'admin' && req.user.sub !== req.params.id) return res.status(403).json({ error: 'You can only change your own password' });
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: 'New password must be 8-128 characters' });
  }
  if (req.user.role !== 'super_admin' && !(await verifyPassword(current.rows[0].data.password, currentPassword))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const data = {
    ...current.rows[0].data,
    password: await bcrypt.hash(newPassword, 10),
    authVersion: Number(current.rows[0].data.authVersion || 0) + 1,
    updatedAt: now(),
  };
  await q('UPDATE admins SET data = $2 WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true, ...(req.user.role === 'admin' ? { token: sign({ role: 'admin', institutionId: req.user.institutionId, sub: req.user.sub, authVersion: data.authVersion }) } : {}) });
});

app.patch('/api/admins/:id', auth, staffOnly, async (req, res) => {
  if (req.user.role === 'admin' && req.user.sub !== req.params.id) return res.status(403).json({ error: 'You can only update your own account' });
  const body = req.user.role === 'admin'
    ? Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => ['fullName', 'email', 'username'].includes(key)))
    : req.body;
  await patchRow('admins', req.params.id, body, res, req);
});
app.delete('/api/admins/:id', auth, superAdmin, (req, res) => deleteRow('admins', req.params.id, res, req));

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
  const body = req.body || {};
  if (body.role && body.role !== 'student') return res.status(400).json({ error: 'Only student accounts can be created here' });
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const level = typeof body.level === 'string' ? body.level.trim() : '';
  if (!fullName || !username || !email || !password || !level || password.length < 8 || password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'Valid name, username, email, level and password (8-128 characters) are required' });
  }
  let departmentId = '';
  let department = typeof body.department === 'string' ? body.department.trim() : '';
  let departmentCode = null;
  if (body.departmentId) {
    const dept = await q('SELECT id, data FROM departments WHERE id=$1 AND institution_id=$2', [body.departmentId, req.params.iid]);
    if (!dept.rows.length || dept.rows[0].data.isActive === false) return res.status(400).json({ error: 'Selected department is invalid or inactive' });
    const deptData = toDoc(dept.rows[0]);
    if (deptData.levels?.length && !deptData.levels.includes(level)) return res.status(400).json({ error: 'Selected level is not available in this department' });
    departmentId = deptData.id;
    department = deptData.name || department;
    departmentCode = deptData.code || null;
  }
  const id = newId();
  const data = {
    ...body, fullName, username, email, password: await bcrypt.hash(password, 10), role: 'student', authVersion: 0,
    studentId: newStudentId(), departmentId, department, departmentCode, level,
    institutionId: req.params.iid, createdAt: now()
  };
  const inserted = await q('INSERT INTO users (id, institution_id, username, role, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',
    [id, req.params.iid, username, 'student', data]);
  if (!inserted.rowCount) return res.status(409).json({ error: 'A user with this username or email already exists.' });
  const { password: _password, passwordHash: _passwordHash, ...safe } = data;
  res.json({ id, ...safe });
});

app.delete('/api/institutions/:iid/users/bulk', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const ids = [...new Set(Array.isArray(req.body?.ids) ? req.body.ids.filter(id => typeof id === 'string') : [])];
  if (!ids.length || ids.length > 500) return res.status(400).json({ error: 'Provide between 1 and 500 student IDs' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id FROM users WHERE institution_id=$1 AND id=ANY($2::text[]) FOR UPDATE', [req.params.iid, ids]);
    if (found.rowCount !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'One or more students are outside this institution' });
    }
    const history = await client.query('SELECT (SELECT count(*) FROM results WHERE user_id=ANY($1::text[])) + (SELECT count(*) FROM exam_attempts WHERE user_id=ANY($1::text[])) AS n', [ids]);
    if (Number(history.rows[0].n)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Selected students have exam history; suspend them instead of deleting.' });
    }
    const deleted = await client.query('DELETE FROM users WHERE institution_id=$1 AND id=ANY($2::text[])', [req.params.iid, ids]);
    await client.query('COMMIT');
    res.json({ deletedCount: deleted.rowCount });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.patch('/api/users/:id', auth, staffOnly, (req, res) => patchRow('users', req.params.id, req.body, res, req));
app.delete('/api/users/:id', auth, staffOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT institution_id FROM users WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!user.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }
    if (!tenantOk(req, user.rows[0].institution_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden' });
    }
    const history = await client.query('SELECT (SELECT count(*) FROM results WHERE user_id=$1) + (SELECT count(*) FROM exam_attempts WHERE user_id=$1) AS n', [req.params.id]);
    if (Number(history.rows[0].n)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This student has exam history. Suspend the account to preserve records.' });
    }
    await client.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.get('/api/users/:id/results', auth, async (req, res) => {
  // Students may only read their own results
  if (req.user.role === 'student' && req.user.sub !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Staff may only read results for users in their institution
  const owner = await q('SELECT institution_id FROM users WHERE id = $1', [req.params.id]);
  if (!owner.rows.length) return res.json([]);
  if (!tenantOk(req, owner.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q("SELECT id, institution_id, exam_id, user_id, data - 'answers' AS data, created_at FROM results WHERE user_id = $1 ORDER BY created_at DESC", [req.params.id]);
  const institution = req.user.role === 'student' ? await q('SELECT data FROM institutions WHERE id = $1', [owner.rows[0].institution_id]) : null;
  const settings = institutionSettings(institution?.rows[0]?.data);
  res.json(rows.map(row => ({
    ...toResultDoc(row, false),
    ...(req.user.role === 'student' ? { reviewAvailable: settings.allowReviewAfterSubmit !== false } : {})
  })));
});

// ---------- exams ----------

app.get('/api/institutions/:iid/exams', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q(`SELECT e.*, coalesce(q.question_count, 0)::int AS question_count
    FROM exams e LEFT JOIN (SELECT exam_id, count(*) AS question_count FROM questions WHERE institution_id = $1 GROUP BY exam_id) q ON q.exam_id = e.id
    WHERE e.institution_id = $1`, [req.params.iid]);
  res.json(rows.map(row => ({ ...toDoc(row), totalQuestions: row.question_count })).sort(byDateDesc('createdAt')));
});

app.post('/api/institutions/:iid/exams', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const institution = await q('SELECT data FROM institutions WHERE id = $1', [req.params.iid]);
  if (!institution.rows.length) return res.status(404).json({ error: 'Institution not found' });
  const settings = institutionSettings(institution.rows[0].data);
  const exam = { ...body, duration: body.duration ?? settings.examTimeLimit, title: typeof body.title === 'string' ? body.title.trim() : '' };
  const validationError = examValidationError(exam);
  if (validationError) return res.status(400).json({ error: validationError });
  const id = newId();
  const data = {
    ...exam, duration: Number(exam.duration), passingScore: Number(exam.passingScore),
    type: String(exam.type || 'Objective').toLowerCase() === 'essay' ? 'Essay' : 'Objective',
    startDate: exam.startDate ? parseStoredDate(exam.startDate).toISOString() : '',
    endDate: exam.endDate ? parseStoredDate(exam.endDate).toISOString() : '',
    institutionId: req.params.iid, createdAt: now()
  };
  await q('INSERT INTO exams (id, institution_id, data) VALUES ($1,$2,$3)', [id, req.params.iid, data]);
  res.json({ id, ...data });
});

app.patch('/api/exams/:id', auth, staffOnly, async (req, res) => {
  const current = await q('SELECT * FROM exams WHERE id = $1', [req.params.id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Exam not found' });
  if (!tenantOk(req, current.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const exam = { ...current.rows[0].data, ...req.body, institutionId: current.rows[0].institution_id };
  const priorType = String(current.rows[0].data.type || 'Objective').toLowerCase();
  const nextType = String(exam.type || 'Objective').toLowerCase();
  if (priorType !== nextType) {
    const history = await q('SELECT (SELECT count(*) FROM questions WHERE exam_id=$1) + (SELECT count(*) FROM results WHERE exam_id=$1) + (SELECT count(*) FROM exam_attempts WHERE exam_id=$1) AS n', [req.params.id]);
    if (Number(history.rows[0].n)) return res.status(409).json({ error: 'Exam type cannot change after questions, attempts, or results exist' });
  }
  const validationError = examValidationError(exam);
  if (validationError) return res.status(400).json({ error: validationError });
  const data = {
    ...exam, duration: Number(exam.duration), passingScore: Number(exam.passingScore),
    type: String(exam.type || 'Objective').toLowerCase() === 'essay' ? 'Essay' : 'Objective',
    startDate: exam.startDate ? parseStoredDate(exam.startDate).toISOString() : '',
    endDate: exam.endDate ? parseStoredDate(exam.endDate).toISOString() : '', updatedAt: now()
  };
  await q('UPDATE exams SET data = $2 WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});
app.delete('/api/exams/:id', auth, staffOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT institution_id FROM exams WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exam not found' });
    }
    if (!tenantOk(req, current.rows[0].institution_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden' });
    }
    const related = await client.query('SELECT (SELECT count(*) FROM results WHERE exam_id=$1) + (SELECT count(*) FROM exam_attempts WHERE exam_id=$1) AS n', [req.params.id]);
    if (Number(related.rows[0].n)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This exam has attempts or results. Deactivate it instead of deleting it.' });
    }
    await client.query('DELETE FROM questions WHERE exam_id=$1', [req.params.id]);
    await client.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// ---------- questions ----------

app.get('/api/institutions/:iid/questions', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q('SELECT * FROM questions WHERE institution_id = $1', [req.params.iid]);
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.get('/api/exams/:examId/questions', auth, examTenant, async (req, res) => {
  if (req.user.role === 'student') {
    const active = await q("SELECT id FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status = 'in_progress' AND deadline_at > now()", [req.params.examId, req.user.sub]);
    if (!active.rows.length) return res.status(403).json({ error: 'Start the exam before viewing its questions' });
  }
  const { rows } = await q('SELECT * FROM questions WHERE exam_id = $1', [req.params.examId]);
  const docs = toDocs(rows);
  // Students must not receive answer keys or grading rubric data
  if (req.user.role === 'student') {
    for (const d of docs) {
      delete d.correctIndex;
      delete d.correctAnswer;
      delete d.rubricKeywords;
      delete d.modelAnswer;
      delete d.gradingGuide;
      delete d.rubric;
      delete d.answer;
      delete d.correct;
      delete d.solution;
      delete d.explanation;
    }
  }
  res.json(docs);
});

app.get('/api/exams/:examId/questions/count', auth, staffOnly, examTenant, async (req, res) => {
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json({ count: rows[0].n });
});

app.post('/api/questions', auth, staffOnly, async (req, res) => {
  const body = req.body || {};
  if (!body.examId || !body.institutionId) return res.status(400).json({ error: 'Exam and institution are required' });
  const exam = await q('SELECT institution_id, data FROM exams WHERE id = $1', [body.examId]);
  if (!exam.rows.length) return res.status(404).json({ error: 'Exam not found' });
  const institutionId = exam.rows[0].institution_id;
  if (!tenantOk(req, institutionId) || body.institutionId !== institutionId) return res.status(403).json({ error: 'Forbidden' });
  if (await examHistoryCount(body.examId)) return res.status(409).json({ error: 'Questions cannot be changed after an exam has attempts or results' });
  const question = normalizeQuestionData(body);
  const validationError = questionValidationError(question, exam.rows[0].data);
  if (validationError) return res.status(400).json({ error: validationError });
  const id = newId();
  const data = { ...question, institutionId, examId: body.examId, createdAt: now() };
  await q('INSERT INTO questions (id, institution_id, exam_id, data) VALUES ($1,$2,$3,$4)',
    [id, institutionId, body.examId, data]);
  res.json({ id, ...data });
});

app.post('/api/exams/:examId/questions/bulk', auth, staffOnly, examTenant, async (req, res) => {
  const questions = req.body?.questions;
  if (!Array.isArray(questions) || !questions.length || questions.length > 1000) {
    return res.status(400).json({ error: 'Provide between 1 and 1000 questions' });
  }
  const exam = await q('SELECT data FROM exams WHERE id = $1', [req.params.examId]);
  const normalizedQuestions = questions.map(normalizeQuestionData);
  const validationErrors = normalizedQuestions
    .map((question, index) => ({ index, error: questionValidationError(question, exam.rows[0].data) }))
    .filter(item => item.error);
  if (validationErrors.length) return res.status(400).json({ errors: validationErrors });

  const client = await pool.connect();
  const created = [];
  try {
    await client.query('BEGIN');
    if (await examHistoryCount(req.params.examId, client)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Questions cannot be changed after an exam has attempts or results' });
    }
    for (const question of normalizedQuestions) {
      const id = newId();
      const data = { ...question, examId: req.params.examId, institutionId: req.examInstitutionId, createdAt: now() };
      await client.query('INSERT INTO questions (id, institution_id, exam_id, data) VALUES ($1,$2,$3,$4)',
        [id, req.examInstitutionId, req.params.examId, data]);
      created.push({ id, ...data });
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  res.json(created);
});

app.patch('/api/questions/:id', auth, staffOnly, async (req, res) => {
  const current = await q('SELECT * FROM questions WHERE id = $1', [req.params.id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Question not found' });
  if (!tenantOk(req, current.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const examId = req.body.examId || current.rows[0].exam_id;
  const exam = await q('SELECT institution_id, data FROM exams WHERE id = $1', [examId]);
  if (!exam.rows.length) return res.status(404).json({ error: 'Exam not found' });
  if (!tenantOk(req, exam.rows[0].institution_id) || exam.rows[0].institution_id !== current.rows[0].institution_id) {
    return res.status(403).json({ error: 'Question cannot be moved to another institution' });
  }
  if (await examHistoryCount(current.rows[0].exam_id) || await examHistoryCount(examId)) {
    return res.status(409).json({ error: 'Questions cannot be changed after an exam has attempts or results' });
  }
  const data = normalizeQuestionData({ ...current.rows[0].data, ...req.body, examId, institutionId: current.rows[0].institution_id, updatedAt: now() });
  const validationError = questionValidationError(data, exam.rows[0].data);
  if (validationError) return res.status(400).json({ error: validationError });
  await q('UPDATE questions SET exam_id = $2, data = $3 WHERE id = $1', [req.params.id, examId, data]);
  res.json({ ok: true });
});
app.delete('/api/questions/bulk', auth, staffOnly, async (req, res) => {
  const ids = [...new Set(Array.isArray(req.body?.ids) ? req.body.ids.filter(id => typeof id === 'string') : [])];
  if (!ids.length || ids.length > 500) return res.status(400).json({ error: 'Provide between 1 and 500 question IDs' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id, institution_id, exam_id FROM questions WHERE id = ANY($1::text[]) FOR UPDATE', [ids]);
    if (found.rowCount !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more questions were not found' });
    }
    const institutionIds = [...new Set(found.rows.map(row => row.institution_id))];
    if (institutionIds.length !== 1 || !tenantOk(req, institutionIds[0])) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'One or more questions are outside this institution' });
    }
    const examIds = [...new Set(found.rows.map(row => row.exam_id))];
    const history = await client.query('SELECT (SELECT count(*) FROM results WHERE exam_id = ANY($1::text[])) + (SELECT count(*) FROM exam_attempts WHERE exam_id = ANY($1::text[])) AS n', [examIds]);
    if (Number(history.rows[0].n)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Questions cannot be deleted after an exam has attempts or results' });
    }
    const deleted = await client.query('DELETE FROM questions WHERE id = ANY($1::text[])', [ids]);
    await client.query('COMMIT');
    res.json({ deletedCount: deleted.rowCount });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
app.delete('/api/questions/:id', auth, staffOnly, async (req, res) => {
  const current = await q('SELECT institution_id, exam_id FROM questions WHERE id = $1', [req.params.id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Question not found' });
  if (!tenantOk(req, current.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const history = await q('SELECT (SELECT count(*) FROM results WHERE exam_id=$1) + (SELECT count(*) FROM exam_attempts WHERE exam_id=$1) AS n', [current.rows[0].exam_id]);
  if (Number(history.rows[0].n)) return res.status(409).json({ error: 'Questions cannot be deleted after an exam has attempts or results' });
  await q('DELETE FROM questions WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/exams/:examId/questions', auth, staffOnly, examTenant, async (req, res) => {
  const history = await q('SELECT (SELECT count(*) FROM results WHERE exam_id=$1) + (SELECT count(*) FROM exam_attempts WHERE exam_id=$1) AS n', [req.params.examId]);
  if (Number(history.rows[0].n)) return res.status(409).json({ error: 'Questions cannot be cleared after an exam has attempts or results' });
  await q('DELETE FROM questions WHERE exam_id = $1', [req.params.examId]);
  res.json({ ok: true });
});

// ---------- results ----------

app.get('/api/institutions/:iid/results', auth, staffOnly, async (req, res) => {
  if (!tenantOk(req, req.params.iid)) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await q("SELECT id, institution_id, exam_id, user_id, data - 'answers' AS data, created_at FROM results WHERE institution_id = $1 ORDER BY created_at DESC", [req.params.iid]);
  res.json(rows.map(row => toResultDoc(row, false)));
});

app.get('/api/exams/:examId/results', auth, staffOnly, examTenant, async (req, res) => {
  const { rows } = await q("SELECT id, institution_id, exam_id, user_id, data - 'answers' AS data, created_at FROM results WHERE exam_id = $1 ORDER BY created_at DESC", [req.params.examId]);
  res.json(rows.map(row => toResultDoc(row, false)));
});

app.post('/api/results', auth, studentOnly, async (req, res) => {
  const body = req.body || {};
  if (!body.examId || !body.attemptId || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return res.status(400).json({ error: 'An active attempt and answers are required' });
  }

  const userResult = await q('SELECT * FROM users WHERE id = $1 AND role = $2', [req.user.sub, 'student']);
  if (!userResult.rows.length) return res.status(403).json({ error: 'Student account not found' });
  const student = toDoc(userResult.rows[0]);
  const userId = userResult.rows[0].id;

  const exam = await q('SELECT institution_id, data FROM exams WHERE id = $1', [body.examId]);
  if (!exam.rows.length) return res.status(404).json({ error: 'Exam not found' });
  if (exam.rows[0].institution_id !== userResult.rows[0].institution_id) return res.status(403).json({ error: 'Exam belongs to another institution' });
  const institutionId = exam.rows[0].institution_id;
  const examData = exam.rows[0].data;

  const existing = await q('SELECT id, data FROM results WHERE attempt_id = $1', [body.attemptId]);
  if (existing.rows.length) return res.json({ id: existing.rows[0].id, alreadySubmitted: true });
  const active = await q('SELECT * FROM exam_attempts WHERE id = $1 AND exam_id = $2 AND user_id = $3',
    [body.attemptId, body.examId, userId]);
  if (!active.rows.length || active.rows[0].status !== 'in_progress') return res.status(403).json({ error: 'Exam attempt is not active' });
  if (Date.now() > new Date(active.rows[0].deadline_at).getTime() + 60_000) {
    await q("UPDATE exam_attempts SET status = 'expired' WHERE id = $1", [active.rows[0].id]);
    return res.status(403).json({ error: 'Exam time has expired' });
  }

  const questionRows = await q('SELECT id, data FROM questions WHERE exam_id = $1', [body.examId]);
  if (!questionRows.rows.length) return res.status(400).json({ error: 'This exam has no questions' });
  const questions = questionRows.rows.map(row => ({ id: row.id, ...row.data }));
  const essayExam = String(examData?.type || '').toLowerCase() === 'essay';
  if (questions.some(question => (String(question.type || 'multiple-choice').toLowerCase() === 'essay') !== essayExam)) {
    return res.status(409).json({ error: 'Question types do not match the configured exam type. Ask an administrator to correct the exam.' });
  }
  const answers = {};
  for (const question of questions) {
    const answer = body.answers?.[question.id];
    if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') answers[question.id] = String(answer);
  }

  const submittedAt = new Date();
  const institution = await q('SELECT data FROM institutions WHERE id = $1', [institutionId]);
  const duration = Number(examData?.duration || institutionSettings(institution.rows[0]?.data).examTimeLimit || 60);
  const completedAt = submittedAt.toISOString();
  const data = {
    examId: body.examId,
    examTitle: examData?.title || '',
    userId,
    studentId: student.studentId || student.id,
    studentName: student.fullName || student.username,
    institutionId,
    departmentId: student.departmentId || '',
    department: student.department || '',
    departmentCode: student.departmentCode || null,
    level: student.level || '',
    attemptId: body.attemptId,
    answers,
    timeSpent: Math.max(0, Math.min(duration, (submittedAt.getTime() - new Date(active.rows[0].started_at).getTime()) / 60_000)),
    completedAt,
    submittedAt: completedAt,
    ...scoreSubmission(questions, answers, examData?.type),
  };

  const id = newId();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockedAttempt = await client.query('SELECT * FROM exam_attempts WHERE id=$1 AND exam_id=$2 AND user_id=$3 FOR UPDATE', [body.attemptId, body.examId, userId]);
    const previous = lockedAttempt.rows[0]?.status === 'submitted'
      ? await client.query('SELECT id FROM results WHERE attempt_id = $1', [body.attemptId])
      : { rows: [] };
    if (!lockedAttempt.rows.length || (lockedAttempt.rows[0].status === 'submitted' && !previous.rows.length) || !['in_progress', 'submitted'].includes(lockedAttempt.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Exam attempt is not active' });
    }
    if (previous.rows.length) {
      await client.query('COMMIT');
      return res.json({ id: previous.rows[0].id, alreadySubmitted: true });
    }
    if (Date.now() > new Date(lockedAttempt.rows[0].deadline_at).getTime() + 60_000) {
      await client.query("UPDATE exam_attempts SET status = 'expired' WHERE id = $1", [body.attemptId]);
      await client.query('COMMIT');
      return res.status(403).json({ error: 'Exam time has expired' });
    }
    const inserted = await client.query('INSERT INTO results (id, institution_id, exam_id, user_id, attempt_id, data) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id',
      [id, institutionId, body.examId, userId, body.attemptId, data]);
    if (!inserted.rowCount) {
      const previousResult = await client.query('SELECT id FROM results WHERE attempt_id = $1', [body.attemptId]);
      await client.query('COMMIT');
      return res.json({ id: previousResult.rows[0]?.id, alreadySubmitted: true });
    }
    await client.query("UPDATE exam_attempts SET status = 'submitted', submitted_at = $2, result_id = $3 WHERE id = $1", [body.attemptId, submittedAt, id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  res.json({ id, ...data });
});

app.get('/api/results/:id', auth, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Result not found' });
  if (req.user.role === 'student' && rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  if (rows[0].institution_id && !tenantOk(req, rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  res.json(toResultDoc(rows[0]));
});

app.get('/api/results/:id/review', auth, async (req, res) => {
  const { rows } = await q('SELECT * FROM results WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Result not found' });
  const result = rows[0];
  if (req.user.role === 'student' && result.user_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  if (result.institution_id && !tenantOk(req, result.institution_id)) return res.status(403).json({ error: 'Forbidden' });
  if (req.user.role === 'student' && result.data.status !== 'completed') return res.status(409).json({ error: 'This result is not finalized for review' });
  const institution = await q('SELECT data FROM institutions WHERE id = $1', [result.institution_id]);
  const settings = institutionSettings(institution.rows[0]?.data);
  if (req.user.role === 'student' && settings.allowReviewAfterSubmit === false) return res.status(403).json({ error: 'Answer review is disabled by your institution' });
  const { rows: questionRows } = await q('SELECT id, data FROM questions WHERE exam_id = $1 ORDER BY created_at', [result.exam_id]);
  const exam = await q('SELECT data FROM exams WHERE id = $1', [result.exam_id]);
  const revealCorrect = req.user.role !== 'student' || settings.showCorrectAnswers === true;
  const isEssay = String(exam.rows[0]?.data?.type || '').toLowerCase() === 'essay';
  const questions = questionRows.map(row => {
    const question = row.data;
    const selectedAnswer = result.data.answers?.[row.id] ?? '';
    const item = { id: row.id, question: question.question, options: question.options || [], selectedAnswer };
    if (revealCorrect && !isEssay && question.type !== 'essay') {
      const correctAnswer = resolveCorrectAnswer({ ...question, id: row.id });
      item.correctAnswer = correctAnswer;
      item.explanation = question.explanation || '';
      const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
      item.isCorrect = Boolean(correctAnswer) && normalize(selectedAnswer) === normalize(correctAnswer);
    }
    return item;
  });
  res.json({ id: result.id, examTitle: result.data.examTitle, status: result.data.status, score: result.data.score, percentage: result.data.percentage, questions });
});

app.delete('/api/results/bulk', auth, staffOnly, async (req, res) => {
  const ids = [...new Set(Array.isArray(req.body?.ids) ? req.body.ids.filter(id => typeof id === 'string') : [])];
  if (!ids.length || ids.length > 500) return res.status(400).json({ error: 'Provide between 1 and 500 result IDs' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id, institution_id FROM results WHERE id = ANY($1::text[]) FOR UPDATE', [ids]);
    if (found.rowCount !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more results were not found' });
    }
    if (found.rows.some(row => !tenantOk(req, row.institution_id))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'One or more results are outside this institution' });
    }
    const deleted = await client.query('DELETE FROM results WHERE id = ANY($1::text[])', [ids]);
    await client.query('COMMIT');
    res.json({ deletedCount: deleted.rowCount });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
app.patch('/api/results/:id', auth, staffOnly, async (req, res) => {
  const current = await q('SELECT institution_id, data FROM results WHERE id = $1', [req.params.id]);
  if (!current.rows.length) return res.status(404).json({ error: 'Result not found' });
  if (!tenantOk(req, current.rows[0].institution_id)) return res.status(403).json({ error: 'Forbidden' });
  const allowed = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => ['percentage', 'score', 'status', 'finalized', 'finalizedAt', 'finalizeNote'].includes(key)));
  if (allowed.status !== undefined && !['pending_review', 'provisional', 'completed'].includes(allowed.status)) {
    return res.status(400).json({ error: 'Invalid result status' });
  }
  if (allowed.percentage !== undefined) {
    const percentage = Number(allowed.percentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return res.status(400).json({ error: 'Percentage must be between 0 and 100' });
    allowed.percentage = percentage;
    const maxScore = Number(current.rows[0].data?.maxScore);
    allowed.score = Number.isFinite(maxScore) && maxScore > 0 ? Math.round((percentage / 100) * maxScore * 100) / 100 : percentage;
  }
  if (allowed.score !== undefined && allowed.percentage === undefined) {
    const score = Number(allowed.score);
    if (!Number.isFinite(score) || score < 0) return res.status(400).json({ error: 'Score must be zero or greater' });
    allowed.score = score;
  }
  if (allowed.finalized !== undefined && typeof allowed.finalized !== 'boolean') return res.status(400).json({ error: 'Finalized must be true or false' });
  if (allowed.finalizedAt !== undefined && !parseStoredDate(allowed.finalizedAt)) return res.status(400).json({ error: 'Finalized date is invalid' });
  if (allowed.finalizeNote !== undefined) allowed.finalizeNote = String(allowed.finalizeNote).slice(0, 1000);
  const data = { ...current.rows[0].data, ...allowed, updatedAt: now() };
  await q('UPDATE results SET data = $2 WHERE id = $1', [req.params.id, data]);
  res.json({ ok: true });
});
app.delete('/api/results/:id', auth, staffOnly, (req, res) => deleteRow('results', req.params.id, res, req));

// ---------- blogs (write = super admin) ----------

app.get('/api/blogs-all', auth, superAdmin, async (req, res) => {
  const { rows } = await q('SELECT * FROM blogs');
  res.json(toDocs(rows).sort(byDateDesc('createdAt')));
});

app.post('/api/blogs', auth, superAdmin, async (req, res) => {
  const body = req.body || {};
  if (typeof body.title !== 'string' || !body.title.trim() || typeof body.content !== 'string' || !body.content.trim()) {
    return res.status(400).json({ error: 'Blog title and content are required' });
  }
  const id = newId();
  const published = body.published === true;
  const timestamp = now();
  const data = { ...body, title: body.title.trim(), published, createdAt: timestamp, updatedAt: timestamp, publishedAt: published ? timestamp : null };
  await q('INSERT INTO blogs (id, published, data) VALUES ($1,$2,$3)', [id, published, data]);
  res.json({ id, ...data });
});

app.patch('/api/blogs/:id', auth, superAdmin, async (req, res) => {
  const cur = await q('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  const data = { ...cur.rows[0].data, ...req.body, updatedAt: now() };
  data.published = req.body.published === undefined ? cur.rows[0].published : req.body.published === true;
  data.publishedAt = data.published ? data.publishedAt || now() : null;
  await q('UPDATE blogs SET data = $2, published = $3 WHERE id = $1', [req.params.id, data, data.published]);
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

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request payload is too large' });
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Malformed JSON request' });
  if (error.code === '23505') return res.status(409).json({ error: 'A record with those details already exists' });
  console.error('API request failed:', req.method, req.path, error.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- boot ----------

async function boot() {
  await q('CREATE TABLE IF NOT EXISTS revoked_tokens (jti TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now())');
  await q('CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expiry ON revoked_tokens(expires_at)');
  await q('DELETE FROM revoked_tokens WHERE expires_at < now()');
  setInterval(() => q('DELETE FROM revoked_tokens WHERE expires_at < now()').catch(() => {}), 60 * 60 * 1000).unref();
  await q('ALTER TABLE results ADD COLUMN IF NOT EXISTS attempt_id TEXT');
  await q(`CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    submitted_at TIMESTAMPTZ,
    result_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q('ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ');
  await q('ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS result_id TEXT');
  await q("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_inst_username ON users(institution_id, lower(coalesce(nullif(data->>'username',''), username))) WHERE coalesce(data->>'isActive','true') <> 'false' AND nullif(btrim(coalesce(data->>'username', username)), '') IS NOT NULL");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_inst_email ON users(institution_id, lower(data->>'email')) WHERE coalesce(data->>'isActive','true') <> 'false' AND nullif(btrim(data->>'email'), '') IS NOT NULL");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_inst_username ON admins(institution_id, lower(coalesce(nullif(username,''), data->>'username'))) WHERE coalesce(data->>'isActive','true') <> 'false' AND nullif(btrim(coalesce(username, data->>'username')), '') IS NOT NULL");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_inst_email ON admins(institution_id, lower(coalesce(nullif(email,''), data->>'email'))) WHERE coalesce(data->>'isActive','true') <> 'false' AND nullif(btrim(coalesce(email, data->>'email')), '') IS NOT NULL");
  await q('CREATE UNIQUE INDEX IF NOT EXISTS uq_results_attempt ON results(attempt_id) WHERE attempt_id IS NOT NULL');
  await q("CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempt_active ON exam_attempts(exam_id, user_id) WHERE status = 'in_progress'");
  await q('CREATE INDEX IF NOT EXISTS idx_exam_attempt_user_exam ON exam_attempts(user_id, exam_id, status)');

  // Seed a super admin if none exists
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM super_admins');
  if (rows[0].n === 0) {
    if (!SUPER_ADMIN_PASSWORD) throw new Error('Set SUPER_ADMIN_PASSWORD before initializing an empty database');
    const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    await q(
      'INSERT INTO super_admins (id, username, email, password_hash, data) VALUES ($1,$2,$3,$4,$5)',
      [newId(), 'admin', 'admin@pisairtel.com', hash, { fullName: 'Super Administrator', authVersion: 0 }]
    );
    console.log('Seeded the initial super-admin account.');
  }
  app.listen(PORT, () => console.log(`CBT API listening on :${PORT}`));
}

boot().catch(e => { console.error('Boot failed:', e); process.exit(1); });
