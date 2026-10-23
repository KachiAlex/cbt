#!/usr/bin/env node
// Mints a super_admin JWT using the container's JWT_SECRET — used for E2E
// testing when the seeded .env password no longer matches the stored hash.
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('/app/db');

(async () => {
  const { rows } = await pool.query('SELECT id, data FROM super_admins LIMIT 1');
  if (!rows.length) { console.error('no super_admin found'); process.exit(1); }
  const token = jwt.sign(
    { role: 'super_admin', sub: rows[0].id, authVersion: Number(rows[0].data?.authVersion || 0) },
    process.env.JWT_SECRET,
    { expiresIn: '1h', jwtid: crypto.randomUUID() }
  );
  console.log(token);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
