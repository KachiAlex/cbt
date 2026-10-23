#!/usr/bin/env node
/**
 * End-to-end test of the student bulk import + logo data-URL upload.
 *
 * Flow: scratch tenant -> bulk import (mixed valid/invalid rows, incl.
 * auto-generated passwords and an in-file duplicate) -> student login with
 * the generated password -> PATCH logo as data URL -> verify stored ->
 * invalid logo rejected -> cleanup.
 *
 * Usage (inside the api container):
 *   TOKEN=<super-admin JWT> node /app/bulk-import-test.js
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

// 1x1 transparent PNG
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  const stamp = Date.now().toString(36);
  const inst = await api('POST', '/institutions', { body: { name: `Import Test ${stamp}`, slug: `import-${stamp}` } });
  const iid = inst.id;
  console.log(`\nScratch tenant: ${inst.name} (${iid})\n`);

  try {
    let generated = null;

    await check('bulk import: valid rows created, bad rows skipped', async () => {
      const r = await api('POST', `/institutions/${iid}/users/bulk`, {
        body: {
          students: [
            { fullName: 'Alice One', username: `alice.${stamp}`, email: `alice.${stamp}@test.local`, level: 'SS1', password: 'Passw0rd!9' },
            { fullName: 'Bob Two', username: `bob.${stamp}`, email: `bob.${stamp}@test.local`, level: 'SS2' }, // auto password
            { fullName: 'Bad Email', username: `bad.${stamp}`, email: 'not-an-email', level: 'SS1' },
            { fullName: 'No Level', username: `nolevel.${stamp}`, email: `nolevel.${stamp}@test.local`, level: '' },
            { fullName: 'Dup Alice', username: `alice.${stamp}`, email: `dup.${stamp}@test.local`, level: 'SS1' },
          ],
        },
      });
      if (r.created !== 2 || r.failed !== 3) throw new Error(`expected 2 created / 3 failed, got ${r.created}/${r.failed}`);
      generated = r.results.find(x => x.ok && x.generatedPassword);
      if (!generated?.generatedPassword) throw new Error('no generated password returned for blank-password row');
      const dupError = r.results.find(x => x.index === 4);
      if (!dupError || dupError.ok) throw new Error('in-file duplicate was not rejected');
      return `created=${r.created} failed=${r.failed}, gen-password for ${generated.username}`;
    });

    await check('generated-password student can log in', async () => {
      const login = await api('POST', `/auth/institution/${inst.slug}/login`, {
        body: { username: generated.username, password: generated.generatedPassword },
      });
      if (!login.token) throw new Error('no token returned');
    });

    await check('explicit-password student can log in', async () => {
      const login = await api('POST', `/auth/institution/${inst.slug}/login`, {
        body: { username: `alice.${stamp}`, password: 'Passw0rd!9' },
      });
      if (!login.token) throw new Error('no token returned');
    });

    await check('re-import same students -> all conflict, none duplicated', async () => {
      const r = await api('POST', `/institutions/${iid}/users/bulk`, {
        body: { students: [{ fullName: 'Alice One', username: `alice.${stamp}`, email: `alice.${stamp}@test.local`, level: 'SS1' }] },
      });
      if (r.created !== 0 || r.failed !== 1) throw new Error(`expected 0/1, got ${r.created}/${r.failed}`);
    });

    await check('logo PATCH accepts data URL and persists', async () => {
      await api('PATCH', `/institutions/${iid}`, { body: { logo: TINY_PNG } });
      const got = await api('GET', `/institutions/${iid}`);
      if (got.logo !== TINY_PNG) throw new Error('logo not persisted');
    });

    await check('oversized logo rejected (400)', async () => {
      const big = 'data:image/png;base64,' + 'A'.repeat(400_001);
      const res = await fetch(`${BASE}/api/institutions/${iid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ logo: big }),
      });
      if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    });

    await check('non-image logo rejected (400)', async () => {
      const res = await fetch(`${BASE}/api/institutions/${iid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ logo: 'javascript:alert(1)' }),
      });
      if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    });
  } finally {
    await api('DELETE', `/institutions/${iid}`);
    console.log('Scratch tenant removed\n');
  }
}

main()
  .catch(e => { failed++; results.push(`  FATAL ${e.message}`); })
  .finally(() => {
    console.log('==== BULK IMPORT + LOGO TEST ====');
    results.forEach(l => console.log(l));
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
