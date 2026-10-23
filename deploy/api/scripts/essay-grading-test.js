#!/usr/bin/env node
/**
 * End-to-end test of the AI essay grading pipeline against the live API.
 *
 * Flow: scratch tenant -> subject -> Essay exam -> essay question -> student
 * -> student login -> attempt -> submit a PARAPHRASED correct answer -> poll
 * until the async grader finishes -> verify score/confidence/feedback ->
 * staff review carries per-question grading detail -> cleanup.
 *
 * Usage (inside the api container):
 *   TOKEN=<super-admin JWT> node /app/essay-grading-test.js
 */

const BASE = process.env.API_URL || 'http://localhost:5000';
const TOKEN = process.env.TOKEN || '';
if (!TOKEN) { console.error('TOKEN env is required'); process.exit(1); }

let passed = 0, failed = 0;
const results = [];
const check = async (name, fn) => {
  try { const d = await fn(); passed++; results.push(`  PASS  ${name}${d ? ` — ${d}` : ''}`); }
  catch (e) { failed++; results.push(`  FAIL  ${name} — ${e.message}`); }
};

async function api(method, path, { body, token = TOKEN, expected = 200 } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== expected) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MODEL_ANSWER = 'Photosynthesis is the process by which green plants use sunlight, water and carbon dioxide to produce glucose and release oxygen.';
// Deliberately paraphrased — shares few exact words with the model answer.
const STUDENT_ANSWER = 'Green plants make their own food by capturing energy from sunlight and combining water with CO2 to form glucose, while giving off oxygen into the air.';

async function main() {
  const stamp = Date.now().toString(36);
  const inst = await api('POST', '/institutions', { body: { name: `Grader Test ${stamp}`, slug: `grader-${stamp}` } });
  const iid = inst.id;
  console.log(`\nScratch tenant: ${inst.name} (${iid})\n`);

  try {
    let questionId = '', examId = '', resultId = '', result = null;
    let studentToken = '';

    await check('create subject + essay exam', async () => {
      const subject = await api('POST', `/institutions/${iid}/subjects`, { body: { name: 'Biology', code: 'BIO101' } });
      const exam = await api('POST', `/institutions/${iid}/exams`, {
        body: { title: 'Essay Grading Test', type: 'Essay', subjectId: subject.id, duration: 30, passingScore: 50, isActive: true },
      });
      examId = exam.id;
      return `subject=${subject.name} exam type=${exam.type}`;
    });

    await check('create essay question (model answer + rubric)', async () => {
      const q = await api('POST', '/questions', {
        body: {
          examId, institutionId: iid,
          question: 'Explain the process of photosynthesis in green plants.',
          type: 'essay',
          modelAnswer: MODEL_ANSWER,
          rubricKeywords: 'sunlight,carbon dioxide,water,glucose,oxygen',
          minWords: 15,
          points: 10,
        },
      });
      questionId = q.id;
    });

    await check('create student + student login', async () => {
      const username = `gradestudent${stamp}`;
      await api('POST', `/institutions/${iid}/users`, {
        body: { fullName: 'Grader Student', username, email: `${username}@test.local`, password: 'TestPass123!', level: '100' },
      });
      const login = await api('POST', `/auth/institution/${inst.slug}/login`, { body: { username, password: 'TestPass123!' } });
      studentToken = login.token;
      if (!studentToken) throw new Error('no student token');
    });

    await check('start attempt + submit (status=grading)', async () => {
      const attempt = await api('POST', `/exams/${examId}/attempts`, { token: studentToken });
      const submitted = await api('POST', '/results', {
        token: studentToken,
        body: { attemptId: attempt.id, examId, answers: { [questionId]: STUDENT_ANSWER } },
      });
      resultId = submitted.id;
      if (submitted.status !== 'grading') throw new Error(`expected status 'grading', got '${submitted.status}' (AI grader may be disabled)`);
    });

    await check('AI grading completes', async () => {
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        result = await api('GET', `/results/${resultId}`);
        if (result.status !== 'grading') break;
        await sleep(3000);
      }
      if (!result || result.status === 'grading') throw new Error('timed out waiting for grader');
      if (!['completed', 'pending_review'].includes(result.status)) throw new Error(`unexpected status '${result.status}'`);
      return `status=${result.status} in ${result.grading?.attempts || '?'} attempt(s)`;
    });

    await check('semantic score is sensible (paraphrased answer)', async () => {
      const g = result.grading;
      if (!g || g.state !== 'done') throw new Error(`grading state: ${g?.state}`);
      if (g.fallback === true) throw new Error('fell back to heuristic — Groq call failed');
      const per = g.perQuestion?.[questionId];
      if (!per || per.gradedBy !== 'ai') throw new Error('question not AI-graded');
      if (typeof result.percentage !== 'number' || result.percentage < 0 || result.percentage > 100) {
        throw new Error(`bad percentage: ${result.percentage}`);
      }
      // A correct paraphrase must not be failed — that was the old heuristic's failure mode.
      if (result.percentage < 40) throw new Error(`correct paraphrase scored only ${result.percentage}%`);
      return `${result.percentage}% · conf ${Math.round((per.confidence ?? 0) * 100)}% · ${result.status === 'completed' ? 'auto-released' : 'flagged for review'}`;
    });

    await check('staff review carries AI grading detail', async () => {
      const review = await api('GET', `/results/${resultId}/review`);
      const q = review.questions?.[0];
      if (!q?.grading) throw new Error('per-question grading missing from review');
      if (!q.grading.feedback) throw new Error('feedback missing');
      console.log(`\nAI verdict: ${q.grading.percent}% (${Math.round((q.grading.confidence ?? 0) * 100)}% conf)`);
      console.log(`Feedback  : ${q.grading.feedback}`);
      if (q.grading.hits?.length) console.log(`Hits      : ${q.grading.hits.join('; ')}`);
      if (q.grading.misses?.length) console.log(`Misses    : ${q.grading.misses.join('; ')}\n`);
    });
  } finally {
    await api('DELETE', `/institutions/${iid}`);
    console.log('Scratch tenant removed\n');
  }
}

main()
  .catch(e => { failed++; results.push(`  FATAL ${e.message}`); })
  .finally(() => {
    console.log('==== ESSAY GRADING TEST ====');
    results.forEach(l => console.log(l));
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
