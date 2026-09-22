# 🔧 MongoDB Atlas Troubleshooting Guide

## 🚨 **Current Issue: Database Connection Failed**

Your CBT backend is deployed but cannot connect to MongoDB Atlas. This is the most common issue with cloud deployments.

## ✅ **Quick Fix (5 minutes):**

### **Step 1: Access MongoDB Atlas**
1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Sign in to your account
3. Select your cluster

### **Step 2: Fix Network Access (IP Whitelist)**
1. **Click "Network Access"** in the left sidebar
2. **Click "ADD IP ADDRESS"**
3. **Click "ALLOW ACCESS FROM ANYWHERE"** (adds `0.0.0.0/0`)
4. **Click "Confirm"**
5. **Wait 2 minutes** for changes to apply

### **Step 3: Verify Connection**
1. Check your backend health: `https://cbt-rew7.onrender.com/health`
2. Check database status: `https://cbt-rew7.onrender.com/api/debug/db-status`
3. Look for: `✅ MongoDB Connected: [your-cluster-host]`

## 🔍 **Diagnostic Endpoints**

### **Health Check**
```
GET https://cbt-rew7.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "type": "mongodb",
    "status": {
      "connected": true,
      "state": "connected",
      "host": "cluster0.abc123.mongodb.net"
    }
  }
}
```

### **Database Status**
```
GET https://cbt-rew7.onrender.com/api/debug/db-status
```
**Expected Response:**
```json
{
  "connection": "connected",
  "state": "connected",
  "host": "cluster0.abc123.mongodb.net",
  "name": "cbt_multi_tenant",
  "collections": ["users", "tenants", "exams", "results"],
  "userCount": 5,
  "tenantCount": 3
}
```

## 🚨 **Common Error Messages & Solutions**

### **Error: "Could not connect to any servers in your MongoDB Atlas cluster"**
- **Cause:** IP address not whitelisted
- **Solution:** Add `0.0.0.0/0` to Network Access

### **Error: "Authentication failed"**
- **Cause:** Wrong username/password
- **Solution:** Check MONGODB_URI in Render environment variables

### **Error: "Connection timeout"**
- **Cause:** Network issues or wrong connection string
- **Solution:** Verify MONGODB_URI format

### **Error: "Database name not specified"**
- **Cause:** Missing database name in connection string
- **Solution:** Add database name to MONGODB_URI

## 🔧 **Environment Variables Check**

In your Render dashboard, verify these environment variables:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.abc123.mongodb.net/cbt_multi_tenant?retryWrites=true&w=majority
DB_TYPE=mongodb
JWT_SECRET=your-secret-key
NODE_ENV=production
```

## 📊 **Connection String Format**

Your MONGODB_URI should look like:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

**Example:**
```
mongodb+srv://cbtuser:password123@cluster0.abc123.mongodb.net/cbt_multi_tenant?retryWrites=true&w=majority
```

## 🧪 **Testing Steps**

### **1. Test Backend Health**
```bash
curl https://cbt-rew7.onrender.com/health
```

### **2. Test Database Status**
```bash
curl https://cbt-rew7.onrender.com/api/debug/db-status
```

### **3. Test User Registration**
1. Go to your CBT frontend
2. Try to register a new student
3. Check if user appears in admin dashboard

### **4. Check Render Logs**
- Go to Render dashboard
- Check deployment logs
- Look for: `✅ MongoDB Connected: [cluster-host]`

## 🎯 **Success Indicators**

After fixing the IP whitelist, you should see:

✅ **Backend Logs:**
```
✅ MongoDB Atlas Connected: cluster0.abc123.mongodb.net
🌐 Database: cbt_multi_tenant
📊 Connection State: Connected
```

✅ **Health Check Response:**
```json
{
  "status": "healthy",
  "database": {
    "status": {
      "connected": true
    }
  }
}
```

✅ **Frontend Functionality:**
- User registration works
- Admin login works
- Data persists between sessions

## 🚀 **Next Steps After Fix**

1. **Test User Registration:** Create a new student account
2. **Test Admin Login:** Login with admin credentials
3. **Test Exam Creation:** Upload questions and create exams
4. **Test Student Portal:** Take an exam as a student
5. **Verify Data Persistence:** Check that data saves correctly

## 🔒 **Security Notes**

- `0.0.0.0/0` is safe for cloud deployments
- Your database is still protected by username/password
- Only your application can access with correct credentials
- Consider using specific IP ranges for enhanced security

## 📞 **Still Having Issues?**

If the problem persists after following this guide:

1. **Check Render Logs** for detailed error messages
2. **Verify MONGODB_URI** format and credentials
3. **Test Connection String** in MongoDB Compass
4. **Contact Support** with specific error messages

Your CBT system will work perfectly once the database connection is established! 🎯
