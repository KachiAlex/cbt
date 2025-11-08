# 🔥 Firestore Rules Fix - Institution Login Access

## 🚨 Problem

The institution login page was showing:
```
FirebaseError: Missing or insufficient permissions
```

This happened because the Firestore security rules required authentication to read institution data, but the login page needs to load institution info (name, logo) BEFORE users log in.

## ✅ Solution Applied

Updated Firestore security rules to allow **public read access** to the institutions collection:

```javascript
// Institutions Collection - Public read for login pages, authenticated write
match /institutions/{institutionId} {
  // Allow anyone to read institution basic info (needed for login page)
  allow read: if true;
  // Only authenticated users can create/update/delete institutions
  allow write: if request.auth != null;
  
  // ... subcollections still require authentication
}
```

## 🚀 Deploy the Fix

### Option 1: Using Firebase Console (Easiest)

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `cbt-91a97`
3. **Go to Firestore Database** (left sidebar)
4. **Click "Rules" tab**
5. **Replace the rules** with the content from `frontend_disabled/firestore.rules`
6. **Click "Publish"**

### Option 2: Using Firebase CLI

```bash
# Make sure you're logged in
firebase login

# Navigate to frontend_disabled folder
cd frontend_disabled

# Deploy the rules
firebase deploy --only firestore:rules
```

### Option 3: Use the batch script (Windows)

```bash
# From the CBT root directory
deploy-firestore-rules.bat
```

## 🔒 Security Notes

### What's Now Public:
- ✅ Institution names, slugs, logos (needed for login pages)
- ✅ Institution basic profile information

### What's Still Protected:
- ✅ Institution admins (requires authentication)
- ✅ Institution users/students (requires authentication)
- ✅ Exams and questions (requires authentication)
- ✅ Results (requires authentication)
- ✅ Creating/updating/deleting institutions (requires authentication)

**This is safe!** Institution basic info needs to be public so users can see which school they're logging into.

## ✅ After Deployment

Once the rules are deployed:

1. **Refresh your institution login page**
2. **The institution name and logo should now load**
3. **No more "Missing or insufficient permissions" error**
4. **Login with institution admin credentials:**
   - Username/Email: (as set by super admin when creating the institution)
   - Password: (as set by super admin)

## 🧪 Test It

Visit your institution URL:
```
https://your-frontend.netlify.app?slug=your-institution-slug
```

You should now see:
- ✅ Institution name displayed
- ✅ Institution logo (if uploaded)
- ✅ Login form visible
- ✅ No Firebase permission errors

## 📝 Note About Admin Login

For the **Multi-Tenant Super Admin** login (managing all institutions), that still uses Firebase Authentication with email/password. Use the `create-firebase-admin.html` tool to create that account if needed.

For **Institution-specific logins** (individual school admins and students), those credentials are stored in Firestore and don't require Firebase Authentication - they're validated against the institution's user collection.

