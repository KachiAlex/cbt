// Exports all Firestore collections to deploy/firestore-export.json
// Run: node deploy/export-firestore.cjs  (uses frontend/node_modules/firebase)
const path = require('path');
const fs = require('fs');

// Resolve firebase from the frontend app's node_modules
const frontendModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { initializeApp } = require(path.join(frontendModules, 'firebase', 'app'));
const { getFirestore, collection, getDocs } = require(path.join(frontendModules, 'firebase', 'firestore'));

const firebaseConfig = {
  apiKey: "AIzaSyB5oUy7N8G633FCjmu34FrLBZvjsm1tdVc",
  authDomain: "cbt-91a97.firebaseapp.com",
  projectId: "cbt-91a97",
  storageBucket: "cbt-91a97.firebasestorage.app",
  messagingSenderId: "273021677586",
  appId: "1:273021677586:web:f1170c3a9a9f25493028cb",
};

const TOP_LEVEL = ['institutions', 'admins', 'users', 'exams', 'questions', 'results', 'blogs', 'super_admins', 'settings', 'notifications', 'analytics'];

function serialize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(serialize);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = serialize(v[k]);
    return o;
  }
  return v;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const out = {};

  for (const name of TOP_LEVEL) {
    try {
      const snap = await getDocs(collection(db, name));
      out[name] = snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }));
      console.log(`${name}: ${out[name].length} docs`);
    } catch (e) {
      console.log(`${name}: FAILED (${e.message})`);
      out[name] = [];
    }
  }

  // departments subcollection per institution
  out.departments = [];
  for (const inst of out.institutions || []) {
    try {
      const snap = await getDocs(collection(db, 'institutions', inst.id, 'departments'));
      for (const d of snap.docs) {
        out.departments.push({ id: d.id, institutionId: inst.id, ...serialize(d.data()) });
      }
    } catch (e) {
      console.log(`departments for ${inst.id}: FAILED (${e.message})`);
    }
  }
  console.log(`departments: ${out.departments.length} docs`);

  const dest = path.join(__dirname, 'firestore-export.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log('Wrote', dest);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
