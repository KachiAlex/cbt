const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://cbt:cbt@localhost:5432/cbt',
  max: 10,
});

const q = (text, params) => pool.query(text, params);

// Reconstruct a Firestore-style doc: { id, ...data }
const toDoc = (row) => row ? { id: row.id, ...row.data } : null;
const toDocs = (rows) => rows.map(toDoc);

// Sort newest-first by a timestamp-ish field inside data (mirrors the old JS-side sorting)
const byDateDesc = (field) => (a, b) => {
  const da = a[field] ? new Date(a[field]) : null;
  const db = b[field] ? new Date(b[field]) : null;
  if (da && db) return db - da;
  return 0;
};

module.exports = { pool, q, toDoc, toDocs, byDateDesc };
