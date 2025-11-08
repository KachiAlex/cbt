# 🛡️ CBT Application Development Guidelines

## 🚨 **CRITICAL RULES TO PREVENT COMPILATION ERRORS**

### **1. Function Declaration Rules**
- ✅ **NEVER declare the same function twice** in the same file
- ✅ **NEVER use the same variable name** for different purposes
- ✅ **ALWAYS check for existing declarations** before adding new ones

### **2. Common Issues to Avoid**
- ❌ **Duplicate function declarations** (like `ensureAdminUserExists`)
- ❌ **Redeclaring variables** with `const` or `let`
- ❌ **Mixing function declarations** and arrow functions with same names

### **3. Before Making Changes**
1. **Search for existing declarations**: `Ctrl+F` for function/variable names
2. **Check the entire file** for duplicates
3. **Use unique names** for new functions
4. **Test compilation** after changes

### **4. Authentication Functions**
- **Admin authentication**: Use `authenticateUser` in `dataService.js`
- **Admin user creation**: Logic is inline in `useEffect` in `App.js`
- **Student authentication**: Use `authenticateUser` in `dataService.js`

### **5. File Structure**
```
src/
├── App.js              # Main app component (NO duplicate functions!)
├── services/
│   └── dataService.js  # Data management and authentication
└── components/         # UI components
```

### **6. Quick Fix Commands**
```bash
# If compilation error occurs:
node fix-compilation-error.js

# Clear cache if needed:
rmdir /s /q node_modules\.cache

# Restart development server:
npm start
```

### **7. Testing Checklist**
- [ ] App compiles without errors
- [ ] Admin login works (`admin` / `admin123`)
- [ ] Student registration works
- [ ] Student login works
- [ ] Admin dashboard shows student data

## 🔧 **Emergency Fixes**

### **If Admin Login Fails:**
1. Open browser console
2. Run the admin fix script from `test-admin-auth.html`
3. Test login again

### **If Compilation Fails:**
1. Run `node fix-compilation-error.js`
2. Restart development server
3. Check for duplicate declarations

## 📞 **Contact**
If issues persist, check the error logs and ensure no duplicate function declarations exist. 