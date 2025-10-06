# 🔥 Firebase Database Migration Guide (Same Project)

## Overview
This guide helps you migrate from a test database to a production database within the **same Firebase project** (`cbt-91a97`). This approach is much cleaner and safer than creating a new project.

## Current Setup
- **Firebase Project**: `cbt-91a97` ✅ (Keep this)
- **Current Database**: `(default)` (test data)
- **Target Database**: `production` (new database for production data)

## Why This Approach is Better
✅ **Same Firebase project** - No configuration changes needed  
✅ **Same authentication** - Users remain the same  
✅ **Same hosting** - No deployment changes  
✅ **Easy rollback** - Can switch databases instantly  
✅ **Zero downtime** - Seamless migration  

## Step 1: Create Production Database

### 1.1 Create New Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `cbt-91a97`
3. Go to **Firestore Database**
4. Click **"Create database"**
5. Choose **"Start in production mode"**
6. Select location: **us-central1** (same as current)
7. Database ID: **`production`**
8. Click **"Done"**

### 1.2 Set Production Security Rules
Go to the new `production` database → **Rules** and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/production/documents {
    // Institutions - authenticated users only
    match /institutions/{institutionId} {
      allow read, write: if request.auth != null;
    }
    
    // Admins - authenticated users only
    match /admins/{adminId} {
      allow read, write: if request.auth != null;
    }
    
    // Users - authenticated users only
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Exams - authenticated users only
    match /exams/{examId} {
      allow read, write: if request.auth != null;
    }
    
    // Questions - authenticated users only
    match /questions/{questionId} {
      allow read, write: if request.auth != null;
    }
    
    // Results - authenticated users only
    match /results/{resultId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 2: Update Application Configuration

### 2.1 Update Firebase Config
Update `frontend_disabled/src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration for cbt-91a97 project
const firebaseConfig = {
  apiKey: "AIzaSyB5oUy7N8G633FCjmu34FrLBZvjsm1tdVc",
  authDomain: "cbt-91a97.firebaseapp.com",
  projectId: "cbt-91a97",
  storageBucket: "cbt-91a97.firebasestorage.app",
  messagingSenderId: "273021677586",
  appId: "1:273021677586:web:f1170c3a9a9f25493028cb",
  measurementId: "G-PMMHZEBZ92"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with production database
export const db = getFirestore(app, 'production'); // This connects to the 'production' database

// Initialize Firebase Auth (same for all databases)
export const auth = getAuth(app);

export default app;
```

### 2.2 Create Environment-Based Configuration
Create `frontend_disabled/src/firebase/config.env.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB5oUy7N8G633FCjmu34FrLBZvjsm1tdVc",
  authDomain: "cbt-91a97.firebaseapp.com",
  projectId: "cbt-91a97",
  storageBucket: "cbt-91a97.firebasestorage.app",
  messagingSenderId: "273021677586",
  appId: "1:273021677586:web:f1170c3a9a9f25493028cb",
  measurementId: "G-PMMHZEBZ92"
};

const app = initializeApp(firebaseConfig);

// Use environment variable to determine database
const databaseId = process.env.NODE_ENV === 'production' ? 'production' : '(default)';
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

export default app;
```

## Step 3: Migrate Data

### 3.1 Run Migration Script
Use the existing migration script but update it for database migration:

```bash
# Export from default database
node firebase-database-migration-script.js export

# Import to production database  
node firebase-database-migration-script.js import <export-file>
```

### 3.2 Verify Migration
```bash
node firebase-database-migration-script.js verify
```

## Step 4: Switch to Production Database

### 4.1 Update Configuration for Production
Update your main config file to use the production database:

```javascript
// In frontend_disabled/src/firebase/config.js
export const db = getFirestore(app, 'production');
```

### 4.2 Deploy Changes
```bash
cd frontend_disabled
npm run build
firebase deploy --only hosting
```

## Step 5: Test Production Database

### 5.1 Verify Data Access
1. Visit https://cbtpromax.com
2. Test login functionality
3. Verify all data is accessible
4. Check Firebase Console → Firestore Database → production

### 5.2 Test All Features
- [ ] Multi-tenant admin login
- [ ] Institution creation
- [ ] User management
- [ ] Exam creation and management
- [ ] Question management
- [ ] Results tracking

## Step 6: Clean Up (Optional)

### 6.1 Archive Test Database
1. Go to Firebase Console
2. Select `(default)` database
3. Export all data as backup
4. Keep as backup or delete if confident

## Rollback Plan

If you need to rollback to the test database:

1. Update `frontend_disabled/src/firebase/config.js`:
```javascript
export const db = getFirestore(app, '(default)'); // Back to default database
```

2. Deploy:
```bash
npm run build
firebase deploy --only hosting
```

## Benefits of This Approach

✅ **Zero configuration changes** - Same Firebase project  
✅ **Same authentication** - No user migration needed  
✅ **Same hosting** - No deployment changes  
✅ **Easy switching** - Change one line of code  
✅ **Safe rollback** - Instant rollback if needed  
✅ **No downtime** - Seamless migration  

## Database Structure

Both databases will have the same structure:

```
institutions/
├── {institutionId}/
│   ├── name: "College Name"
│   ├── slug: "college-slug"
│   ├── adminFullName: "Admin Name"
│   └── ...

admins/
├── {adminId}/
│   ├── institutionId: "institution_id"
│   ├── username: "admin.username"
│   └── ...

users/
├── {userId}/
│   ├── institutionId: "institution_id"
│   ├── username: "student.username"
│   └── ...

exams/
├── {examId}/
│   ├── title: "Exam Title"
│   ├── institutionId: "institution_id"
│   └── ...

questions/
├── {questionId}/
│   ├── examId: "exam_id"
│   ├── question: "Question text"
│   └── ...

results/
├── {resultId}/
│   ├── examId: "exam_id"
│   ├── userId: "user_id"
│   └── ...
```

## Success Criteria

✅ **Migration Complete When:**
- Production database created successfully
- All data migrated without loss
- Application works with production database
- All functionality tested and working
- Can rollback to test database if needed

---

**This approach is much cleaner and safer than creating a new Firebase project!**
