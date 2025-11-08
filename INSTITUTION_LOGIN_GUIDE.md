# 🏫 Institution Login Guide

## 🎯 Quick Fix Summary

**Problem:** Institution login pages couldn't load because Firestore security rules blocked unauthenticated access.

**Solution:** Updated Firestore rules to allow public read access to institution data (needed for login pages).

## 🚀 Deploy the Fix NOW

### Easiest Method - Firebase Console:

1. Go to: https://console.firebase.google.com
2. Select project: **cbt-91a97**
3. Click **Firestore Database** (left sidebar)
4. Click **Rules** tab
5. Copy the rules from `frontend_disabled/firestore.rules`
6. Paste and click **Publish**

✅ **Done!** Your institution login should work immediately.

---

## 🔐 Login Credentials

### For Institution Admin/Student Login:

**These credentials are set when creating the institution in the Multi-Tenant Admin panel.**

When an institution is created, the super admin sets:
- Admin username
- Admin password
- Admin email

**Example:**
```
Username: admin
Password: admin123
```

OR whatever credentials were set during institution creation.

### For Multi-Tenant Super Admin:

This is a different system. Access via:
- URL: `https://your-backend-url/admin` or multi-tenant admin interface
- Credentials: As set in backend (`superadmin` / `superadmin123`)

---

## 🏫 How Institution Login Works

### Step 1: Access Institution URL
```
https://your-frontend.netlify.app?slug=institution-slug
```

### Step 2: System Loads Institution Data
- Fetches institution name from Firestore
- Loads institution logo (if available)
- Displays custom login page

### Step 3: User Logs In
- **Admin login:** Uses credentials set by super admin
- **Student login:** Uses credentials created by institution admin

### Step 4: Authentication
- Credentials are validated against institution's user collection in Firestore
- NO Firebase Authentication required for institution access
- Firebase Auth is only for Multi-Tenant Super Admin

---

## ⚠️ Current Issue & Fix

**Before Fix:**
```
❌ FirebaseError: Missing or insufficient permissions
```

**After Deploying Rules:**
```
✅ Institution data loads successfully
✅ Login page displays with institution name/logo
✅ Users can login with their credentials
```

---

## 🧪 Testing Steps

1. **Deploy the Firestore rules** (see above)
2. **Wait 30 seconds** for rules to propagate
3. **Clear browser cache** (Ctrl + Shift + Delete)
4. **Visit institution URL:** `?slug=your-institution-slug`
5. **Verify:**
   - ✅ Institution name appears
   - ✅ No permission errors
   - ✅ Login form is visible
6. **Try logging in** with institution admin credentials

---

## 🔍 Finding Your Institution Slug

If you don't know your institution slug:

1. Go to Multi-Tenant Admin panel
2. View institutions list
3. The slug is shown in the institution details
4. OR check the institution URL that was generated

Common format: `college-of-nursing-eku` (lowercase with hyphens)

---

## 🆘 Troubleshooting

### "Missing or insufficient permissions"
- Deploy the Firestore rules (see above)
- Wait 30 seconds for propagation
- Clear browser cache and refresh

### "Institution not found"
- Check the slug is correct (lowercase, hyphens)
- Verify institution exists in Multi-Tenant Admin panel
- Check browser console for errors

### "Invalid credentials"
- Verify username/password with whoever created the institution
- Check if account is active in institution admin panel
- Try resetting the password via Multi-Tenant Admin

### "Cannot read institution data"
- Ensure Firestore rules are deployed
- Check Firebase console for rule errors
- Verify institution document exists in Firestore

---

## 📞 Need Help?

Check these files for more info:
- `FIRESTORE_RULES_FIX.md` - Detailed fix explanation
- `frontend_disabled/firestore.rules` - Current security rules
- `INSTITUTION_URLS_IMPLEMENTATION.md` - Full feature documentation

---

## ✅ Summary

**To fix your login issue RIGHT NOW:**

1. Deploy Firestore rules via Firebase Console (5 minutes)
2. Wait 30 seconds
3. Try logging in again with: `admin` / `admin123`
4. If that doesn't work, check what credentials were set when the institution was created

**The issue is NOT the credentials** - it's the Firestore security rules blocking access. Once you deploy the updated rules, everything should work!

