#!/usr/bin/env node
/**
 * Post-deploy smoke test for the subject question-bank flow.
 *
 * Drives the real HTTP API end to end:
 *   regression: existing tenants/exams/questions still work
 *   new flow:  subject -> bank questions -> exam -> attach -> rename cascade -> guards
 *   cleanup:   deletes the scratch institution (FK cascades remove everything it created)
 *
 * Usage (inside the api container):
 *   SUPER_ADMIN_USER=admin SUPER_ADMIN_PASSWORD=... node /app/smoke-test.js
 * Optional: API_URL=http://localhost:5000 (default)
 */

const BASE = process.env.API_URL || 'http://localhost:5000';
const ADMIN_USER = process.env.SUPER_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.SUPER_ADMIN_PASSWORD || '';
// Optional pre-minted bearer token — when set, the login step is skipped.
const PRESET_TOKEN = process.env.TOKEN || '';

if (!ADMIN_PASS && !PRESET_TOKEN) {
  console.error('SUPER_ADMIN_PASSWORD (or TOKEN) env is required');
  process.exit(1);
}

let token = '';
let passed = 0;
let failed = 0;
const results = [];

async function api(method, path, body, expected = 200) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== expected) {
    throw new Error(`${method} ${path} -> HTTP ${res.status} (expected ${expected}): ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

async function check(name, fn) {
  try {
    const detail = await fn();
    passed++;
    results.push(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    failed++;
    results.push(`  FAIL  ${name} — ${error.message}`);
  }
}

const mcq = {
  question: 'What is 2 + 2?',
  type: 'multiple-choice',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
  points: 2,
};

async function main() {
  // ---------- auth ----------
  if (PRESET_TOKEN) {
    token = PRESET_TOKEN;
    console.log('(using pre-minted token — login step skipped)');
  } else {
    const login = await api('POST', '/auth/super-admin/login', { email: ADMIN_USER, password: ADMIN_PASS });
    token = login.token;
  }

  // ---------- regression on real data ----------
  const institutions = await api('GET', '/institutions');
  const faith = institutions.find(i => i.slug === 'faith-academy-ogba');
  await check('list institutions', async () => {
    if (!faith) throw new Error('faith-academy-ogba not found');
    return `${institutions.length} tenant(s)`;
  });

  if (faith) {
    const faithExams = await api('GET', `/institutions/${faith.id}/exams`);
    await check('legacy exam list (Faith Academy)', async () => {
      const physics = faithExams.find(e => e.title === 'PHYSICS');
      if (!physics) throw new Error('PHYSICS exam missing');
      return `${faithExams.length} exam(s), PHYSICS has ${physics.totalQuestions} questions`;
    });
    const physics = faithExams.find(e => e.title === 'PHYSICS');
    if (physics) {
      const qs = await api('GET', `/exams/${physics.id}/questions`);
      await check('legacy exam questions still query', async () => `${qs.length} question(s) returned`);
    }
    const faithResults = await api('GET', `/institutions/${faith.id}/results`);
    await check('legacy results list', async () => `${faithResults.length} result(s)`);
  }

  // ---------- scratch tenant ----------
  const stamp = Date.now().toString(36);
  const inst = await api('POST', '/institutions', { name: `Smoke Test ${stamp}`, slug: `smoke-${stamp}` });
  const iid = inst.id;
  console.log(`\nScratch tenant: ${inst.name} (${iid})\n`);

  try {
    let subjectId = '';
    let q1 = null;
    let qEssay = null;
    let examId = '';

    await check('subjects list is empty on new tenant', async () => {
      const list = await api('GET', `/institutions/${iid}/subjects`);
      if (list.length !== 0) throw new Error(`expected 0, got ${list.length}`);
    });

    await check('create subject', async () => {
      const s = await api('POST', `/institutions/${iid}/subjects`, { name: 'Mathematics', code: 'MTH101' });
      subjectId = s.id;
      return s.name;
    });

    await check('duplicate subject rejected (409)', async () => {
      const dup = await fetch(`${BASE}/api/institutions/${iid}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'mathematics' }),
      });
      if (dup.status !== 409) throw new Error(`expected 409, got ${dup.status}`);
    });

    await check('subjects list shows counts', async () => {
      const list = await api('GET', `/institutions/${iid}/subjects`);
      const s = list.find(x => x.id === subjectId);
      if (!s) throw new Error('subject missing');
      if (typeof s.questionCount !== 'number' || typeof s.examCount !== 'number') throw new Error('counts missing');
      return `bank=${s.questionCount} exams=${s.examCount}`;
    });

    await check('create bank question (mcq)', async () => {
      q1 = await api('POST', `/institutions/${iid}/subjects/${subjectId}/questions`, mcq);
      return q1.id;
    });
    await check('create bank question (essay allowed in bank)', async () => {
      qEssay = await api('POST', `/institutions/${iid}/subjects/${subjectId}/questions`, {
        question: 'Discuss photosynthesis', type: 'essay', rubricKeywords: 'chlorophyll,sunlight', points: 10,
      });
    });

    await check('bank list returns both', async () => {
      const bank = await api('GET', `/institutions/${iid}/subjects/${subjectId}/questions`);
      if (bank.length !== 2) throw new Error(`expected 2, got ${bank.length}`);
    });

    await check('institution questions scope=bank filter', async () => {
      const bank = await api('GET', `/institutions/${iid}/questions?scope=bank`);
      if (bank.length !== 2) throw new Error(`expected 2, got ${bank.length}`);
    });

    await check('create exam with subjectId (denormalizes subject)', async () => {
      const exam = await api('POST', `/institutions/${iid}/exams`, {
        title: 'Smoke Exam', subjectId, duration: 30, passingScore: 50, type: 'Objective', isActive: true,
      });
      if (exam.subject !== 'Mathematics') throw new Error(`subject snapshot wrong: ${exam.subject}`);
      examId = exam.id;
    });

    await check('attach bank question to exam', async () => {
      const r = await api('POST', `/exams/${examId}/questions/attach`, { questionIds: [q1.id] });
      if (r.attached !== 1 || r.skipped !== 0) throw new Error(JSON.stringify(r));
    });

    await check('re-attach is idempotent (skipped)', async () => {
      const r = await api('POST', `/exams/${examId}/questions/attach`, { questionIds: [q1.id] });
      if (r.attached !== 0 || r.skipped !== 1) throw new Error(JSON.stringify(r));
    });

    await check('essay bank item rejected by objective exam (400)', async () => {
      const res = await fetch(`${BASE}/api/exams/${examId}/questions/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionIds: [qEssay.id] }),
      });
      if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    });

    await check('exam questions include attached copy w/ sourceQuestionId', async () => {
      const qs = await api('GET', `/exams/${examId}/questions`);
      if (qs.length !== 1) throw new Error(`expected 1, got ${qs.length}`);
      if (qs[0].sourceQuestionId !== q1.id) throw new Error('sourceQuestionId missing');
      if (qs[0].subjectId !== subjectId) throw new Error('subjectId not stamped');
    });

    await check('subject rename cascades to exam', async () => {
      await api('PATCH', `/subjects/${subjectId}`, { name: 'Mathematics II', code: 'MTH102' });
      const exams = await api('GET', `/institutions/${iid}/exams`);
      const exam = exams.find(e => e.id === examId);
      if (exam.subject !== 'Mathematics II' || exam.subjectCode !== 'MTH102') {
        throw new Error(`cascade failed: ${exam.subject} / ${exam.subjectCode}`);
      }
    });

    await check('subject delete blocked while in use (409)', async () => {
      const res = await fetch(`${BASE}/api/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status !== 409) throw new Error(`expected 409, got ${res.status}`);
    });

    // ---------- cleanup inside the tenant ----------
    await check('delete exam (no attempts)', async () => {
      await api('DELETE', `/exams/${examId}`);
      const remaining = await api('GET', `/institutions/${iid}/questions?scope=exam`);
      if (remaining.length !== 0) throw new Error('exam questions not cascaded');
    });
    await check('delete bank questions', async () => {
      await api('DELETE', `/questions/${q1.id}`);
      await api('DELETE', `/questions/${qEssay.id}`);
      const bank = await api('GET', `/institutions/${iid}/subjects/${subjectId}/questions`);
      if (bank.length !== 0) throw new Error('bank not empty');
    });
    await check('delete subject now allowed', async () => {
      await api('DELETE', `/subjects/${subjectId}`);
    });
  } finally {
    // Institution delete cascades subjects/exams/questions/anything left behind
    await api('DELETE', `/institutions/${iid}`);
    const gone = await fetch(`${BASE}/api/institutions/${iid}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`Scratch tenant removed (GET now returns ${gone.status})`);
  }
}

main()
  .catch(error => { failed++; results.push(`  FATAL ${error.message}`); })
  .finally(() => {
    console.log('\n==== SMOKE TEST ====');
    results.forEach(line => console.log(line));
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
