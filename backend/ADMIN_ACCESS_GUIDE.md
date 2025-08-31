# 🚀 CBT System - Managed Admin Access Guide

## 📋 Quick Access Options

### Option 1: Direct HTML File (Immediate Access)
1. **Download the file**: `managed-admin-ui.html` from the backend directory
2. **Open in browser**: Double-click the file or drag it into your browser
3. **Configure API URL**: Set the API Base URL to `https://cbt-rew7.onrender.com`
4. **Get Auth Token**: Use the default credentials below

### Option 2: Local Server (Development)
1. **Navigate to backend**: `cd CBT/backend`
2. **Start local server**: `npm start` or `node src/server.js`
3. **Access locally**: `http://localhost:5000/admin` or `http://localhost:5000/managed-admin`

### Option 3: Cloud Deployment (After Redeploy)
1. **Wait for redeploy**: The server needs to be redeployed with new routes
2. **Access via URL**: `https://cbt-rew7.onrender.com/admin`
3. **Alternative URL**: `https://cbt-rew7.onrender.com/managed-admin`

## 🔐 Default Credentials

### Super Admin
- **Email**: `superadmin@cbt-system.com`
- **Password**: `superadmin123`
- **Role**: Full system access, database management

### Managed Admin
- **Email**: `managedadmin@cbt-system.com`
- **Password**: `managedadmin123`
- **Role**: Tenant management, user administration

⚠️ **IMPORTANT**: Change these passwords immediately in production!

## 🌐 API Endpoints

### Base URL
```
https://cbt-rew7.onrender.com
```

### Available Endpoints
- **Health Check**: `/health`
- **API Info**: `/api`
- **Admin UI**: `/admin` (after redeploy)
- **Managed Admin UI**: `/managed-admin` (after redeploy)
- **Managed Admin API**: `/api/v1/managed-admin/*`
- **Database API**: `/api/v1/database/*`

## 🛠️ Setup Instructions

### Step 1: Get the Admin UI File
The `managed-admin-ui.html` file is located in the `CBT/backend/` directory.

### Step 2: Open the File
- Double-click the file to open it in your default browser
- Or drag and drop it into any modern browser

### Step 3: Configure the Interface
1. **API Base URL**: `https://cbt-rew7.onrender.com`
2. **Auth Token**: Leave empty initially (will be provided after login)

### Step 4: Test Connection
1. Click "Test Connection" to verify API connectivity
2. You should see a success message

### Step 5: Get Authentication Token
1. Use the default credentials above
2. Make a login request to get a JWT token
3. Copy the token and paste it in the "Auth Token" field

## 📱 Alternative Access Methods

### Method 1: GitHub Pages
1. Upload `managed-admin-ui.html` to a GitHub repository
2. Enable GitHub Pages
3. Access via: `https://yourusername.github.io/repository/managed-admin-ui.html`

### Method 2: Netlify/Vercel
1. Upload the HTML file to Netlify or Vercel
2. Get a public URL
3. Configure the API URL in the interface

### Method 3: Local Development Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

## 🔧 Troubleshooting

### Connection Issues
- **Check API URL**: Ensure it's `https://cbt-rew7.onrender.com`
- **Test Health**: Visit `/health` endpoint directly
- **CORS Issues**: The API has CORS enabled for all origins

### Authentication Issues
- **Verify Credentials**: Use the exact default credentials
- **Check Token**: Ensure JWT token is valid and not expired
- **Role Permissions**: Ensure user has appropriate role

### File Access Issues
- **File Location**: Ensure you're opening the correct HTML file
- **Browser Compatibility**: Use modern browsers (Chrome, Firefox, Safari, Edge)
- **Local Server**: Try running a local server if direct file access doesn't work

## 📞 Support

### Immediate Help
1. **Test API Health**: `https://cbt-rew7.onrender.com/health`
2. **Check API Info**: `https://cbt-rew7.onrender.com/api`
3. **Review Documentation**: `MULTI_TENANT_README.md`

### Common Issues
- **404 Errors**: Server may need redeployment
- **CORS Errors**: API has CORS enabled, should work
- **Authentication Failures**: Check credentials and token format

## 🚀 Quick Start Commands

### Test API Health
```bash
curl https://cbt-rew7.onrender.com/health
```

### Get API Info
```bash
curl https://cbt-rew7.onrender.com/api
```

### Test Authentication
```bash
curl -X POST https://cbt-rew7.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "superadmin123"}'
```

---

## ✅ Ready to Use!

The Managed Admin UI is ready to use with the HTML file. Simply open `managed-admin-ui.html` in your browser and configure the API URL to `https://cbt-rew7.onrender.com`.

**Next Steps:**
1. Open the HTML file in your browser
2. Configure the API URL
3. Test the connection
4. Create your first school tenant
5. Start managing your multi-tenant CBT system!

🎉 **Happy Administering!**
