// Imports deploy/firestore-export.json into Postgres. Idempotent (ON CONFLICT DO NOTHING).
// Usage: node migrate.cjs [path-to-export.json]
const fs = require('fs');
const path = require('path');
const { q, pool } = require('./db');

const file = process.argv[2] || path.join(__dirname, 'firestore-export.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

async function run() {
  let n = 0;
  const ins = async (sql, params) => { const r = await q(sql, params); n += r.rowCount || 0; };

  for (const d of data.institutions || []) {
    await ins('INSERT INTO institutions (id, slug, data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',
      [d.id, d.slug || null, d]);
  }
  for (const d of data.departments || []) {
    await ins('INSERT INTO departments (id, institution_id, data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',
      [d.id, d.institutionId, d]);
  }
  for (const d of data.admins || []) {
    await ins('INSERT INTO admins (id, institution_id, username, email, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
      [d.id, d.institutionId || null, d.username || null, d.email || null, d]);
  }
  for (const d of data.users || []) {
    await ins('INSERT INTO users (id, institution_id, username, role, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
      [d.id, d.institutionId || null, d.username || null, d.role || null, d]);
  }
  for (const d of data.exams || []) {
    await ins('INSERT INTO exams (id, institution_id, data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',
      [d.id, d.institutionId || null, d]);
  }
  for (const d of data.questions || []) {
    await ins('INSERT INTO questions (id, institution_id, exam_id, data) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
      [d.id, d.institutionId || null, d.examId || null, d]);
  }
  for (const d of data.results || []) {
    await ins('INSERT INTO results (id, institution_id, exam_id, user_id, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
      [d.id, d.institutionId || null, d.examId || null, d.userId || d.studentId || null, d]);
  }
  for (const d of data.blogs || []) {
    await ins('INSERT INTO blogs (id, published, data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',
      [d.id, !!d.published, d]);
  }

  console.log('Import complete.');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
