#!/usr/bin/env node
/**
 * One-off cleanup: permanently delete a single exam and its records for ONE tenant.
 *
 * Deletes (all scoped to the resolved institution AND exam id):
 *   - results for the exam
 *   - exam_attempts for the exam
 *   - questions attached to the exam (bank questions, exam_id IS NULL, are untouched)
 *   - the exam itself
 *
 * Usage (dry run — prints what would be deleted, changes nothing):
 *   node scripts/delete-exam.js --institution "Faith Academy" --exam "Chemistry"
 *
 * Execute the deletion:
 *   node scripts/delete-exam.js --institution "Faith Academy" --exam "Chemistry" --confirm
 *
 * Target a specific exam id (required if several exams share the title):
 *   node scripts/delete-exam.js --institution "Faith Academy" --exam-id <uuid> --confirm
 *
 * DATABASE_URL must be set (it already is inside the api container):
 *   docker exec deploy-api-1 node scripts/delete-exam.js --institution "Faith Academy" --exam "Chemistry" --confirm
 */

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const institutionQuery = option('--institution');
const examTitle = option('--exam');
const examIdOption = option('--exam-id');
const confirm = flag('--confirm');

if ((!institutionQuery && !examIdOption) || (!examTitle && !examIdOption) || flag('--help')) {
  console.log('Usage: node scripts/delete-exam.js --institution "<name or slug>" (--exam "<title>" | --exam-id <id>) [--confirm]');
  process.exit(flag('--help') ? 0 : 1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const norm = value => String(value || '').trim().toLowerCase();

async function resolveInstitution() {
  if (!institutionQuery) return null;
  const { rows } = await pool.query(
    "SELECT id, slug, data->>'name' AS name FROM institutions WHERE lower(btrim(data->>'name')) = $1 OR lower(btrim(slug)) = $1",
    [norm(institutionQuery)]
  );
  if (rows.length === 1) return rows[0];
  if (rows.length > 1) {
    console.error(`Multiple institutions match "${institutionQuery}". Narrow it down:`);
    rows.forEach(row => console.error(`  - ${row.name} (slug: ${row.slug}, id: ${row.id})`));
    process.exit(1);
  }
  const similar = await pool.query(
    "SELECT id, slug, data->>'name' AS name FROM institutions WHERE data->>'name' ILIKE $1 OR slug ILIKE $1 LIMIT 10",
    [`%${institutionQuery.trim()}%`]
  );
  console.error(`No institution exactly matches "${institutionQuery}".`);
  similar.rows.forEach(row => console.error(`  Did you mean: ${row.name} (slug: ${row.slug})`));
  process.exit(1);
}

async function resolveExam(institutionId) {
  if (examIdOption) {
    const params = [examIdOption];
    let sql = "SELECT id, institution_id, data->>'title' AS title FROM exams WHERE id = $1";
    if (institutionId) {
      params.push(institutionId);
      sql += ' AND institution_id = $2';
    }
    const { rows } = await pool.query(sql, params);
    if (!rows.length) {
      console.error(`No exam with id "${examIdOption}"${institutionId ? ' in this institution' : ''}.`);
      process.exit(1);
    }
    return rows[0];
  }
  const { rows } = await pool.query(
    "SELECT id, institution_id, data->>'title' AS title, data->>'createdAt' AS created_at FROM exams WHERE institution_id = $1 AND lower(btrim(data->>'title')) = $2",
    [institutionId, norm(examTitle)]
  );
  if (rows.length === 1) return rows[0];
  if (rows.length > 1) {
    console.error(`Several exams titled "${examTitle}" exist in this institution. Re-run with --exam-id:`);
    rows.forEach(row => console.error(`  - id: ${row.id}  created: ${row.created_at || 'unknown'}`));
    process.exit(1);
  }
  const similar = await pool.query(
    "SELECT id, data->>'title' AS title FROM exams WHERE institution_id = $1 AND data->>'title' ILIKE $2 LIMIT 10",
    [institutionId, `%${examTitle.trim()}%`]
  );
  console.error(`No exam titled "${examTitle}" in this institution.`);
  similar.rows.forEach(row => console.error(`  Similar: "${row.title}" (id: ${row.id})`));
  process.exit(1);
}

async function report(institution, exam) {
  // subject_id only exists once the question-bank migration has run — probe first
  const hasSubjectColumn = (await pool.query(
    "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'subject_id'"
  )).rows[0].n > 0;
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM questions WHERE exam_id = $1 AND institution_id = $2) AS questions,
       ${hasSubjectColumn ? "(SELECT count(*)::int FROM questions WHERE exam_id IS NULL AND institution_id = $2 AND subject_id IS NOT NULL) AS bank_questions_untouched," : ''}
       (SELECT count(*)::int FROM exam_attempts WHERE exam_id = $1 AND institution_id = $2) AS attempts,
       (SELECT count(*)::int FROM results WHERE exam_id = $1 AND institution_id = $2) AS results`,
    [exam.id, exam.institution_id]
  );
  const counts = rows[0];
  console.log(`Tenant : ${institution ? `${institution.name} (${institution.id})` : exam.institution_id}`);
  console.log(`Exam   : "${exam.title}" (${exam.id})`);
  console.log(`Will delete: ${counts.results} result(s), ${counts.attempts} attempt(s), ${counts.questions} exam question(s), 1 exam`);
  console.log(`Untouched  : ${hasSubjectColumn ? `${counts.bank_questions_untouched} question-bank item(s), ` : ''}all other exams and tenants`);
  return counts;
}

async function main() {
  const institution = await resolveInstitution();
  const exam = await resolveExam(institution?.id);

  // Every delete below is double-scoped: exam id AND the tenant's institution id.
  const institutionId = exam.institution_id;
  await report(institution, exam);

  if (!confirm) {
    console.log('\nDry run only — re-run with --confirm to delete.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      'SELECT id FROM exams WHERE id = $1 AND institution_id = $2 FOR UPDATE',
      [exam.id, institutionId]
    );
    if (!locked.rows.length) {
      await client.query('ROLLBACK');
      console.error('Exam no longer exists — nothing deleted.');
      return;
    }
    const results = await client.query('DELETE FROM results WHERE exam_id = $1 AND institution_id = $2', [exam.id, institutionId]);
    const attempts = await client.query('DELETE FROM exam_attempts WHERE exam_id = $1 AND institution_id = $2', [exam.id, institutionId]);
    const questions = await client.query('DELETE FROM questions WHERE exam_id = $1 AND institution_id = $2', [exam.id, institutionId]);
    const deleted = await client.query('DELETE FROM exams WHERE id = $1 AND institution_id = $2', [exam.id, institutionId]);
    if (deleted.rowCount !== 1) {
      await client.query('ROLLBACK');
      throw new Error(`Expected to delete exactly 1 exam, matched ${deleted.rowCount} — rolled back`);
    }
    await client.query('COMMIT');
    console.log(`\nDeleted: ${results.rowCount} result(s), ${attempts.rowCount} attempt(s), ${questions.rowCount} question(s), exam "${exam.title}".`);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch(error => { console.error('Failed:', error.message); process.exitCode = 1; })
  .finally(() => pool.end());
