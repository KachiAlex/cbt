# 🔥 Firebase Production Migration Guide

## Overview
This guide will help you migrate your CBT multi-tenant app from the test Firebase project (`cbt-91a97`) to a production Firebase project.

## Current Status
- **Test Project**: `cbt-91a97` (currently in use)
- **Production URL**: https://cbtpromax.com
- **Collections**: institutions, admins, users, exams, questions, results

## Step 1: Create Production Firebase Project

### 1.1 Create New Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `cbtpromax-prod`
4. Enable Google Analytics (recommended)
5. Click **"Create project"**

### 1.2 Enable Required Services
1. **Authentication**:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password** provider
   - Click **Save**

2. **Firestore Database**:
   - Go to **Firestore Database**
   - Click **"Create database"**
   - Choose **"Start in production mode"** (for security)
   - Select location: **us-central1** (or closest to your users)
   - Click **Done**

3. **Hosting** (if needed):
   - Go to **Hosting**
   - Click **"Get started"**
   - Follow setup instructions

### 1.3 Configure Security Rules
Go to **Firestore Database** → **Rules** and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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

## Step 2: Set Up Firebase Admin SDK

### 2.1 Generate Service Account Key
1. Go to **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Save as `firebase-admin-key.json` in your project root

### 2.2 Install Dependencies
```bash
npm install firebase-admin
```

## Step 3: Export Data from Test Project

### 3.1 Run Export Script
```bash
# Make sure you're in the project root
node firebase-migration-script.js export
```

This will create a file like `firebase-export-1234567890.json` with all your data.

### 3.2 Verify Export
Check the export file contains all collections:
- institutions
- admins
- users
- exams
- questions
- results

## Step 4: Import Data to Production

### 4.1 Update Migration Script
Edit `firebase-migration-script.js` and update:
```javascript
const PRODUCTION_PROJECT_ID = 'cbtpromax-prod'; // Your new project ID
```

### 4.2 Run Import
```bash
node firebase-migration-script.js import firebase-export-1234567890.json
```

### 4.3 Verify Migration
```bash
node firebase-migration-script.js verify
```

## Step 5: Update Application Configuration

### 5.1 Get Production Firebase Config
1. Go to **Project Settings** → **General**
2. Scroll to **"Your apps"**
3. Click **Web** icon (`</>`)
4. Enter app nickname: `cbtpromax-production`
5. Copy the configuration object

### 5.2 Update Frontend Configuration
Replace the configuration in `frontend/src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Production Firebase configuration
const firebaseConfig = {
  apiKey: "your-production-api-key",
  authDomain: "cbtpromax-prod.firebaseapp.com",
  projectId: "cbtpromax-prod",
  storageBucket: "cbtpromax-prod.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-production-app-id",
  measurementId: "your-measurement-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
```

### 5.3 Update Firebase Hosting Configuration
Update `firebase.json`:

```json
{
  "hosting": {
    "public": "frontend/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      { "source": "/api/**", "function": "webApi" },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### 5.4 Update .firebaserc
Create/update `.firebaserc`:

```json
{
  "projects": {
    "default": "cbtpromax-prod"
  }
}
```

## Step 6: Deploy to Production

### 6.1 Build Frontend
```bash
cd frontend
npm run build
```

### 6.2 Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### 6.3 Verify Deployment
1. Visit https://cbtpromax.com
2. Test login functionality
3. Verify data is accessible
4. Check Firebase Console for production project

## Step 7: Post-Migration Checklist

### 7.1 Test All Functionality
- [ ] Multi-tenant admin login
- [ ] Institution creation
- [ ] User management
- [ ] Exam creation and management
- [ ] Question management
- [ ] Results tracking

### 7.2 Monitor Production
- [ ] Check Firebase Console for errors
- [ ] Monitor usage and performance
- [ ] Set up alerts for critical issues

### 7.3 Clean Up Test Environment
- [ ] Archive test project data
- [ ] Update documentation
- [ ] Remove test project access if no longer needed

## Troubleshooting

### Common Issues:

#### ❌ "Permission denied" errors
- Check Firestore security rules
- Verify authentication is working
- Ensure user is properly authenticated

#### ❌ Data not appearing
- Check if collections exist in production
- Verify import was successful
- Check browser console for errors

#### ❌ Authentication issues
- Verify Email/Password provider is enabled
- Check Firebase configuration
- Clear browser cache and cookies

### Debug Commands:
```bash
# Check Firebase project
firebase projects:list

# Check current project
firebase use

# Switch to production project
firebase use cbtpromax-prod

# View project info
firebase projects:list --filter="cbtpromax-prod"
```

## Security Considerations

### Production Security Rules
The security rules above allow authenticated users to read/write all data. For enhanced security, consider:

1. **Role-based access control**
2. **Institution-specific data isolation**
3. **Audit logging**
4. **Rate limiting**

### Environment Variables
Consider using environment variables for sensitive configuration:

```bash
# .env.production
REACT_APP_FIREBASE_API_KEY=your-production-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=cbtpromax-prod.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=cbtpromax-prod
```

## Success Criteria

✅ **Migration Complete When:**
- All data successfully imported to production
- Application works on https://cbtpromax.com
- No data loss or corruption
- All functionality tested and working
- Security rules properly configured

## Next Steps

1. **Monitor Performance**: Set up monitoring and alerts
2. **Backup Strategy**: Implement regular backups
3. **Scaling**: Plan for growth and scaling
4. **Security**: Regular security audits
5. **Documentation**: Keep documentation updated

---

**Need Help?**
- Check Firebase Console for errors
- Review browser console for client-side issues
- Test with a small subset of data first
- Keep test environment as backup during transition
