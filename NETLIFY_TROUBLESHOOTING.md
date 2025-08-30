# Netlify Deployment Troubleshooting Guide

## 🚨 Common Netlify Build Issues

### Issue 1: "Can't resolve 'react-scripts'"

**Symptoms:**
```
Module not found: Error: Can't resolve 'react-scripts' in '/opt/build/repo'
```

**Causes:**
- Netlify not recognizing the `base` directory setting
- Missing `react-scripts` in dependencies
- Build running from wrong directory

**Solutions:**

#### Solution A: Manual Netlify Configuration
1. Go to Netlify Dashboard → Site Settings → Build & Deploy
2. Set these values manually:
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `build`

#### Solution B: Alternative Build Command
Update `netlify.toml`:
```toml
[build]
  base = "frontend"
  publish = "build"
  command = "npm install && npm run build"
```

#### Solution C: Use Build Script
1. Make the build script executable:
   ```bash
   chmod +x frontend/netlify-build.sh
   ```
2. Update `netlify.toml`:
   ```toml
   [build]
     base = "frontend"
     publish = "build"
     command = "./netlify-build.sh"
   ```

### Issue 2: Build Fails with Node Version

**Symptoms:**
```
Node version not supported
```

**Solutions:**
1. Add `.nvmrc` file in frontend directory:
   ```
   18
   ```
2. Set Node version in `netlify.toml`:
   ```toml
   [build.environment]
     NODE_VERSION = "18"
   ```

### Issue 3: Environment Variables Not Set

**Symptoms:**
```
REACT_APP_API_URL is undefined
```

**Solutions:**
1. Set environment variables in Netlify Dashboard:
   - Go to Site Settings → Environment Variables
   - Add:
     - `REACT_APP_API_URL`
     - `REACT_APP_USE_API`
     - `REACT_APP_ENVIRONMENT`

### Issue 4: Build Timeout

**Symptoms:**
```
Build timed out
```

**Solutions:**
1. Optimize build process:
   ```toml
   [build.environment]
     NPM_CONFIG_PRODUCTION = "false"
     CI = "false"
   ```

## 🔧 Manual Netlify Setup

### Step 1: Connect Repository
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repository

### Step 2: Configure Build Settings
Set these values in the build settings:

**Build settings:**
- **Base directory**: `frontend`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `build`

**Environment variables:**
```
REACT_APP_ENVIRONMENT=production
REACT_APP_API_URL=https://your-render-app.onrender.com
REACT_APP_USE_API=true
```

### Step 3: Deploy
1. Click "Deploy site"
2. Monitor build logs
3. Check for any errors

## 🐛 Debug Steps

### 1. Check Build Logs
1. Go to Netlify Dashboard
2. Click on your site
3. Go to "Deploys" tab
4. Click on the failed deploy
5. Check the build log for specific errors

### 2. Test Locally
```bash
cd frontend
npm install
npm run build
```

### 3. Check Dependencies
```bash
cd frontend
npm ls react-scripts
```

### 4. Verify Package.json
Ensure `package.json` has:
```json
{
  "dependencies": {
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "build": "react-scripts build"
  }
}
```

## 🔄 Alternative Deployment Methods

### Method 1: Manual Upload
1. Build locally: `cd frontend && npm run build`
2. Upload `build` folder to Netlify manually

### Method 2: GitHub Actions
Create `.github/workflows/netlify.yml`:
```yaml
name: Deploy to Netlify
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm install
          npm run build
      - uses: nwtgck/actions-netlify@v1.2
        with:
          publish-dir: './frontend/build'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 📋 Pre-Deployment Checklist

- [ ] `frontend/package.json` includes `react-scripts`
- [ ] `frontend/.nvmrc` specifies Node version
- [ ] `netlify.toml` is in root directory
- [ ] Environment variables are set in Netlify
- [ ] Build works locally: `cd frontend && npm run build`
- [ ] No TypeScript errors (if using TypeScript)
- [ ] All imports are correct
- [ ] No missing dependencies

## 🆘 Getting Help

### Netlify Support
- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Community](https://community.netlify.com/)
- [Netlify Status](https://status.netlify.com/)

### Common Commands
```bash
# Test build locally
cd frontend
npm install
npm run build

# Check for missing dependencies
npm ls

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Quick Fix Commands

If you're still having issues, try these commands in order:

```bash
# 1. Clear everything and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# 2. Test build
npm run build

# 3. If successful, commit and push
git add .
git commit -m "Fix Netlify build issues"
git push origin main
```

The build should work after these steps! 