#!/usr/bin/env node

/**
 * Production Firebase Setup Script
 * Helps set up the production Firebase project and migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔥 Firebase Production Setup Helper\n');

console.log('📋 Step-by-Step Migration Guide:\n');

console.log('1️⃣  CREATE PRODUCTION FIREBASE PROJECT:');
console.log('   • Go to: https://console.firebase.google.com/');
console.log('   • Click "Create a project"');
console.log('   • Name: cbtpromax-prod');
console.log('   • Enable Google Analytics (optional)');
console.log('   • Click "Create project"\n');

console.log('2️⃣  ENABLE REQUIRED SERVICES:');
console.log('   • Authentication → Sign-in method → Enable Email/Password');
console.log('   • Firestore Database → Create database → Production mode');
console.log('   • Select location: us-central1 (or closest to users)\n');

console.log('3️⃣  GET PRODUCTION CONFIG:');
console.log('   • Project Settings → General → Your apps');
console.log('   • Click Web icon (</>)');
console.log('   • App nickname: cbtpromax-production');
console.log('   • Copy the configuration object\n');

console.log('4️⃣  UPDATE CONFIGURATION FILES:');
console.log('   • Replace config in: frontend/src/firebase/config.production.js');
console.log('   • Copy to: frontend/src/firebase/config.js');
console.log('   • Update: .firebaserc with production project ID\n');

console.log('5️⃣  BACKUP CURRENT DATA:');
console.log('   • Run: node backup-firebase-data.js backup');
console.log('   • This creates a backup of your test data\n');

console.log('6️⃣  MIGRATE DATA:');
console.log('   • Run: node firebase-migration-script.js export');
console.log('   • Update PRODUCTION_PROJECT_ID in migration script');
console.log('   • Run: node firebase-migration-script.js import <export-file>\n');

console.log('7️⃣  DEPLOY TO PRODUCTION:');
console.log('   • Build frontend: cd frontend && npm run build');
console.log('   • Deploy: firebase deploy --only hosting\n');

console.log('8️⃣  VERIFY MIGRATION:');
console.log('   • Visit: https://cbtpromax.com');
console.log('   • Test all functionality');
console.log('   • Verify data integrity\n');

console.log('📁 Files created for migration:');
console.log('   • firebase-migration-script.js - Data migration script');
console.log('   • backup-firebase-data.js - Data backup script');
console.log('   • FIREBASE_PRODUCTION_MIGRATION_GUIDE.md - Detailed guide');
console.log('   • frontend/src/firebase/config.production.js - Production config template');
console.log('   • .firebaserc.production - Production Firebase project config\n');

console.log('⚠️  IMPORTANT NOTES:');
console.log('   • Keep your test project as backup during migration');
console.log('   • Test with a small subset of data first');
console.log('   • Update security rules for production');
console.log('   • Monitor the migration process carefully\n');

console.log('🚀 Ready to start migration? Follow the steps above!');
console.log('   For detailed instructions, see: FIREBASE_PRODUCTION_MIGRATION_GUIDE.md\n');
