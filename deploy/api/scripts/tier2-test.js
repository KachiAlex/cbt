#!/usr/bin/env node
/**
 * E2E test for the Tier 2/3 hardening features:
 *   seeded random question draws (fetch == scoring == review subset)
 *   proctoring-lite attempt events
 *   per-exam resultsVisibility overrides
 *   scrypt hashing + mustChangePassword + change-password endpoint
 *   question analytics endpoint
 *
 * Runs inside the api container against the live API; uses a scratch tenant
 * that is deleted at the end (FK cascade removes everything).
 *
 * Usage: TOKEN=<minted-super-admin-jwt> node /app/scripts/tier2-test.js
 *    or: SUPER_ADMIN_PASSWORD=... node /app/scripts/tier2-test.js
 */

const BASE = process.env.API_URL || 'http://localhost:5000';
const ADMIN_USER = process.env.SUPER_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.SUPER_ADMIN_PASSWORD || '';
const PRESET_TOKEN = process.env.TOKEN || '';

if (!ADMIN_PASS && !PRESET_TOKEN) {
  console.error('SUPER_ADMIN_PASSWORD (or TOKEN) env is required');
  process.exit(1);
}

let token = '';
let studentToken = '';
let passed = 0;
let failed = 0;
const results = [];

async function api(method, path, body, expected = 200, asStudent = false) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${asStudent ? studentToken : token}`,
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

const mcq = (n, correct) => ({
  question: `Draw test Q${n}: pick option ${correct}`,
  type: 'multiple-choice',
  options: ['A0', 'B1', 'C2', 'D3'],
  correctIndex: correct - 1,
  points: 1,
});

async function main() {
  if (PRESET_TOKEN) {
    token = PRESET_TOKEN;
    console.log('(using pre-minted token — login step skipped)');
  } else {
    const login = await api('POST', '/auth/super-admin/login', { email: ADMIN_USER, password: ADMIN_PASS });
    token = login.token;
  }

  const stamp = Date.now().toString(36);
  const inst = await api('POST', '/institutions', { name: `Tier2 ${stamp}`, slug: `t2-${stamp}` });
  const iid = inst.id;
  console.log(`\nScratch tenant: ${inst.name} (${iid})\n`);

  let examDrawId = '';
  let examHideId = '';
  let attemptId = '';
  let resultId = '';
  let poolIds = [];
  let drawnIds = [];
  let generatedPassword = '';
  let student2Id = '';

  try {
    // ---------- seeded random draw ----------
    await check('create draw exam (randomDrawCount=3)', async () => {
      const exam = await api('POST', `/institutions/${iid}/exams`, {
        title: 'Draw Exam', duration: 30, passingScore: 50, type: 'Objective', isActive: true, randomDrawCount: 3,
      });
      examDrawId = exam.id;
      if (exam.randomDrawCount !== 3) throw new Error(`stored ${exam.randomDrawCount}`);
    });

    await check('invalid randomDrawCount rejected (400)', async () => {
      await api('POST', `/institutions/${iid}/exams`, {
        title: 'Bad Draw', duration: 30, passingScore: 50, type: 'Objective', randomDrawCount: 1.5,
      }, 400);
    });

    await check('seed 5 questions into the draw exam', async () => {
      for (let n = 1; n <= 5; n++) {
        const created = await api('POST', '/questions', {
          examId: examDrawId, institutionId: iid, ...mcq(n, ((n - 1) % 4) + 1),
        });
        poolIds.push(created.id);
      }
      if (poolIds.length !== 5) throw new Error(`created ${poolIds.length}`);
    });

    await check('create student via single-create', async () => {
      const s = await api('POST', `/institutions/${iid}/users`, {
        fullName: 'Draw Student', username: 'drawstu', email: `drawstu-${stamp}@test.dev`,
        password: 'StudentPass1', level: '100', role: 'student',
      });
      student2Id = s.id;
    });

    await check('student login works (scrypt verify)', async () => {
      const login = await fetch(`${BASE}/api/auth/institution/${inst.slug}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'drawstu', password: 'StudentPass1' }),
      });
      const data = await login.json();
      if (login.status !== 200 || !data.token) throw new Error(`HTTP ${login.status}: ${JSON.stringify(data).slice(0, 120)}`);
      studentToken = data.token;
      if (data.user.mustChangePassword !== false) throw new Error('unexpected mustChangePassword flag');
    });

    await check('password stored as scrypt hash', async () => {
      const { q } = require('/app/db');
      const { rows } = await q('SELECT data FROM users WHERE id = $1', [student2Id]);
      if (!String(rows[0]?.data?.password || '').startsWith('scrypt$')) {
        throw new Error(`unexpected hash format: ${String(rows[0]?.data?.password).slice(0, 12)}`);
      }
    });

    await check('student questions endpoint returns exactly 3 drawn', async () => {
      const attempt = await api('POST', `/exams/${examDrawId}/attempts`, {}, 200, true);
      attemptId = attempt.id;
      const questions = await api('GET', `/exams/${examDrawId}/questions`, undefined, 200, true);
      if (questions.length !== 3) throw new Error(`expected 3, got ${questions.length}`);
      drawnIds = questions.map(question => question.id);
      if (!drawnIds.every(id => poolIds.includes(id))) throw new Error('drawn id outside pool');
      if (questions.some(question => 'correctIndex' in question || 'correctAnswer' in question)) {
        throw new Error('answer key leaked to student');
      }
      return `drawn ${drawnIds.length} of ${poolIds.length}`;
    });

    await check('second fetch returns the same subset (deterministic)', async () => {
      const questions = await api('GET', `/exams/${examDrawId}/questions`, undefined, 200, true);
      if (questions.length !== 3) throw new Error(`expected 3, got ${questions.length}`);
      const ids = questions.map(question => question.id).sort();
      if (JSON.stringify(ids) !== JSON.stringify([...drawnIds].sort())) {
        throw new Error('subset changed between fetches');
      }
    });

    await check('proctor event accepted (tab-hidden)', async () => {
      const r = await api('POST', `/attempts/${attemptId}/events`, { type: 'tab-hidden' }, 200, true);
      if (r.ok !== true) throw new Error(JSON.stringify(r));
    });

    await check('proctor event accepted (copy w/ detail)', async () => {
      await api('POST', `/attempts/${attemptId}/events`, { type: 'copy', detail: 'clipboard event' }, 200, true);
    });

    await check('unsupported proctor event rejected (400)', async () => {
      await api('POST', `/attempts/${attemptId}/events`, { type: 'screenshot' }, 400, true);
    });

    await check('event on foreign attempt rejected (404/403)', async () => {
      const res = await fetch(`${BASE}/api/attempts/${attemptId}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'paste' }),
      });
      if (res.status !== 403) throw new Error(`expected 403 (staff blocked), got ${res.status}`);
    });

    await check('submit draw exam — scored over the 3 drawn only', async () => {
      const answers = {};
      // Answer all drawn questions with option index-mapped text (options are A0..D3)
      const questions = await api('GET', `/exams/${examDrawId}/questions`, undefined, 200, true);
      for (const question of questions) {
        // every question's correct option is its first-listed? no — options shuffled client-side;
        // we just answer 'A0' for all so score is whatever it is; the point is totalQuestions=3
        answers[question.id] = question.options[0];
      }
      const submitted = await api('POST', '/results', { examId: examDrawId, attemptId, answers }, 200, true);
      resultId = submitted.id;
      if (submitted.totalQuestions !== 3) throw new Error(`totalQuestions ${submitted.totalQuestions}, expected 3`);
      return `scored ${submitted.totalQuestions} questions`;
    });

    await check('staff review lists exactly the drawn questions', async () => {
      const review = await api('GET', `/results/${resultId}/review`);
      if (review.questions.length !== 3) throw new Error(`expected 3, got ${review.questions.length}`);
      const ids = review.questions.map(question => question.id).sort();
      if (JSON.stringify(ids) !== JSON.stringify([...drawnIds].sort())) {
        throw new Error('review subset differs from served subset');
      }
    });

    await check('staff review exposes proctor events', async () => {
      const review = await api('GET', `/results/${resultId}/review`);
      if (!Array.isArray(review.proctorEvents) || review.proctorEvents.length < 2) {
        throw new Error(`expected >=2 events, got ${JSON.stringify(review.proctorEvents)}`);
      }
      const types = review.proctorEvents.map(event => event.type);
      if (!types.includes('tab-hidden') || !types.includes('copy')) throw new Error(`missing types: ${types}`);
      return `${review.proctorEvents.length} events`;
    });

    // ---------- per-exam visibility ----------
    await check('exam with resultsVisibility=hide', async () => {
      const exam = await api('POST', `/institutions/${iid}/exams`, {
        title: 'Hidden Exam', duration: 30, passingScore: 50, type: 'Objective', isActive: true, resultsVisibility: 'hide',
      });
      examHideId = exam.id;
      await api('POST', '/questions', { examId: examHideId, institutionId: iid, ...mcq(1, 2) });
    });

    await check('hidden-exam submit returns resultsPublished=false', async () => {
      const attempt = await api('POST', `/exams/${examHideId}/attempts`, {}, 200, true);
      const questions = await api('GET', `/exams/${examHideId}/questions`, undefined, 200, true);
      const submitted = await api('POST', '/results', {
        examId: examHideId, attemptId: attempt.id, answers: { [questions[0].id]: questions[0].options[0] },
      }, 200, true);
      if (submitted.resultsPublished !== false) throw new Error(JSON.stringify(submitted).slice(0, 150));
      if (submitted.percentage !== undefined) throw new Error('score leaked on hidden exam');
    });

    await check('hidden result absent from student list', async () => {
      const list = await api('GET', `/users/${student2Id}/results`, undefined, 200, true);
      if (list.some(row => row.examId === examHideId)) throw new Error('hidden result listed');
      if (!list.some(row => row.examId === examDrawId)) throw new Error('visible result missing');
    });

    await check('hidden result GET blocked (403)', async () => {
      const list = await api('GET', `/institutions/${iid}/results`);
      const hidden = list.find(row => row.examId === examHideId);
      if (!hidden) throw new Error('hidden result not found as staff');
      const res = await fetch(`${BASE}/api/results/${hidden.id}`, { headers: { Authorization: `Bearer ${studentToken}` } });
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
    });

    // ---------- mustChangePassword + change-password ----------
    await check('bulk import generates password + mustChangePassword', async () => {
      const r = await api('POST', `/institutions/${iid}/users/bulk`, {
        students: [{ fullName: 'Import Student', username: `imp-${stamp}`, email: `imp-${stamp}@test.dev`, level: '100' }],
      });
      if (r.created !== 1) throw new Error(JSON.stringify(r).slice(0, 200));
      const entry = r.results[0];
      if (!entry.generatedPassword) throw new Error('no generated password returned');
      generatedPassword = entry.generatedPassword;
    });

    await check('imported login carries mustChangePassword=true', async () => {
      const login = await fetch(`${BASE}/api/auth/institution/${inst.slug}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `imp-${stamp}`, password: generatedPassword }),
      });
      const data = await login.json();
      if (login.status !== 200) throw new Error(`HTTP ${login.status}`);
      if (data.user.mustChangePassword !== true) throw new Error('flag missing');
      studentToken = data.token;
    });

    await check('change-password clears the flag', async () => {
      await api('POST', '/auth/change-password', { currentPassword: generatedPassword, newPassword: 'NewSecure99' }, 200, true);
      const login = await fetch(`${BASE}/api/auth/institution/${inst.slug}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `imp-${stamp}`, password: 'NewSecure99' }),
      });
      const data = await login.json();
      if (login.status !== 200) throw new Error(`re-login failed: HTTP ${login.status}`);
      if (data.user.mustChangePassword !== false) throw new Error('flag not cleared');
    });

    await check('change-password rejects wrong current (403)', async () => {
      const res = await fetch(`${BASE}/api/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'AnotherNew99' }),
      });
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
    });

    // ---------- question analytics ----------
    await check('question analytics returns per-question stats', async () => {
      const analytics = await api('GET', `/institutions/${iid}/analytics/questions`);
      if (!Array.isArray(analytics.questions)) throw new Error('questions array missing');
      const drawn = analytics.questions.filter(question => drawnIds.includes(question.questionId));
      if (!drawn.length) throw new Error('drawn questions absent from analytics');
      if (!drawn.every(question => question.attempts >= 1)) throw new Error('attempt counts missing');
      return `${analytics.questions.length} questions, ${analytics.totalResults} results`;
    });

    await check('analytics on empty tenant returns no rows', async () => {
      const empty = await api('POST', '/institutions', { name: `T2 empty ${stamp}`, slug: `t2e-${stamp}` });
      const analytics = await api('GET', `/institutions/${empty.id}/analytics/questions`);
      await api('DELETE', `/institutions/${empty.id}`);
      if (analytics.questions.length !== 0 || analytics.totalResults !== 0) {
        throw new Error(`expected empty, got ${analytics.questions.length}/${analytics.totalResults}`);
      }
    });

    await check('student cannot reach analytics (403)', async () => {
      const res = await fetch(`${BASE}/api/institutions/${iid}/analytics/questions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
    });
  } finally {
    await api('DELETE', `/institutions/${iid}`);
    const gone = await fetch(`${BASE}/api/institutions/${iid}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`Scratch tenant removed (GET now returns ${gone.status})`);
  }
}

main()
  .catch(error => { failed++; results.push(`  FATAL ${error.message}`); })
  .finally(() => {
    console.log('\n==== TIER 2/3 E2E TEST ====');
    results.forEach(line => console.log(line));
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
