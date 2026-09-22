/**
 * TEST MODE FIRESTORE SECURITY RULES
 * Allows read/write access to all collections for testing
 * 
 * WARNING: These rules allow unrestricted access to your database
 * Only use in test environments, never in production!
 */

const testModeRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
`;

console.log('📋 Test Mode Firestore Rules:');
console.log(testModeRules);

console.log(`
🚀 DEPLOYMENT INSTRUCTIONS:

1. Copy the rules above
2. Go to Firebase Console: https://console.firebase.google.com/project/cbt-91a97/firestore/rules
3. Replace the existing rules with the test mode rules above
4. Click "Publish"

⚠️  IMPORTANT WARNINGS:
- These rules allow unrestricted access to your database
- Anyone can read/write your data
- Only use for testing/development
- Switch back to production rules before going live

✅ BENEFITS:
- Admin panel will load without authentication issues
- No "Missing or insufficient permissions" errors
- Easy testing and development
`);

export { testModeRules };
