const bcrypt = require('bcryptjs');

// Super admin credentials
const SUPER_ADMIN = {
  username: 'superadmin',
  password: 'superadmin123'
};

// Simple authentication middleware for multi-tenant admin
const authenticateMultiTenantAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // For now, we'll use a simple token validation
  // In production, you should use JWT tokens
  if (token === 'superadmin-token') {
    next();
  } else {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Login endpoint for multi-tenant admin
const loginMultiTenantAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check credentials
    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      // In production, you should hash passwords and use JWT tokens
      res.json({
        message: 'Login successful',
        token: 'superadmin-token',
        user: {
          username: SUPER_ADMIN.username,
          role: 'super_admin'
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = {
  authenticateMultiTenantAdmin,
  loginMultiTenantAdmin
}; 