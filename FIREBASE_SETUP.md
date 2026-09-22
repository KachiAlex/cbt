# 🔥 Firebase Setup Guide for CBT Multi-Tenant Admin

## Prerequisites
- Firebase account (free tier available)
- Google account

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `cbt-multitenant-admin`
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

## Step 4: Get Firebase Configuration

1. In Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (`</>`)
4. Enter app nickname: `cbt-frontend`
5. Click "Register app"
6. Copy the Firebase configuration object

## Step 5: Update Frontend Configuration

Replace the placeholder configuration in `frontend/src/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

## Step 6: Set Up Firestore Security Rules

In Firebase Console, go to "Firestore Database" > "Rules" and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to institutions collection
    match /institutions/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow read/write access to admins collection
    match /admins/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow read/write access to users collection
    match /users/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 7: Test the Migration

1. Start your development server: `npm start`
2. Navigate to the multi-tenant admin section
3. Try creating a new institution
4. Verify data appears in Firebase Console

## Benefits of Firebase Migration

✅ **No more timeout issues** - Firebase is highly reliable
✅ **Real-time updates** - Data syncs automatically
✅ **Built-in authentication** - Secure user management
✅ **Automatic scaling** - Handles growth automatically
✅ **Cloud-native** - Perfect for your cloud-first approach
✅ **Cost-effective** - Generous free tier

## Data Structure

### Institutions Collection
```javascript
{
  name: "College of Nursing Sciences",
  slug: "college-of-nursing-sciences",
  adminFullName: "John Doe",
  adminUsername: "john.doe",
  adminEmail: "john@college.edu",
  logo: "data:image/png;base64...",
  plan: "basic",
  totalUsers: 0,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Admins Collection
```javascript
{
  institutionId: "institution_doc_id",
  uid: "firebase_auth_uid",
  username: "john.doe",
  email: "john@college.edu",
  fullName: "John Doe",
  role: "super_admin",
  isDefaultAdmin: true,
  createdAt: timestamp
}
```

### Users Collection
```javascript
{
  institutionId: "institution_doc_id",
  username: "student123",
  email: "student@college.edu",
  fullName: "Jane Student",
  role: "student",
  createdAt: timestamp
}
```

## Next Steps

1. Complete the Firebase project setup
2. Update the configuration file
3. Test the migration
4. Deploy to production

Your multi-tenant admin platform will now be powered by Firebase! 🚀
