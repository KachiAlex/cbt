// Authentication middleware for multi-tenant admin platform
const { generateToken, generateRefreshToken, verifyToken } = require('../config/jwt');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Super admin credentials
const SUPER_ADMIN = {
  username: 'superadmin',
  password: 'superadmin123'
};

// Role-based access control
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGED_ADMIN: 'managed_admin',
  TENANT_ADMIN: 'tenant_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

// Permission levels
const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'], // All permissions
  [ROLES.MANAGED_ADMIN]: ['manage_tenants', 'view_all_data', 'manage_admins'],
  [ROLES.TENANT_ADMIN]: ['manage_tenant', 'manage_users', 'manage_exams', 'view_results'],
  [ROLES.ADMIN]: ['manage_exams', 'manage_questions', 'view_results'],
  [ROLES.TEACHER]: ['view_exams', 'view_results'],
  [ROLES.STUDENT]: ['take_exams', 'view_own_results']
};

// Enhanced JWT authentication middleware with role-based access control
const authenticateMultiTenantAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN',
        message: 'Please provide a valid authentication token'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = verifyToken(token);
    
    // For multi-tenant admin, we can trust the token payload
    if (decoded.type === 'multi_tenant_admin') {
      req.user = decoded;
      return next();
    }
    
    // For regular users, verify against database
    const user = await User.findById(decoded.userId).populate('tenant_id');
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Check if tenant is suspended
    if (user.tenant_id && user.tenant_id.suspended) {
      return res.status(401).json({ 
        error: 'Institution account is suspended',
        code: 'TENANT_SUSPENDED'
      });
    }
    
    req.user = {
      ...decoded,
      user: user,
      tenant: user.tenant_id
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        message: 'Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: 'Please provide a valid authentication token'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'NO_AUTH'
        });
      }
      
      const userRole = req.user.role || req.user.user?.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${allowedRoles.join(' or ')}, your role: ${userRole}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        error: 'Authorization failed',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'NO_AUTH'
        });
      }
      
      const userRole = req.user.role || req.user.user?.role;
      const userPermissions = PERMISSIONS[userRole] || [];
      
      if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required permission: ${permission}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

// Tenant isolation middleware
const requireTenantAccess = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    // Super admins can access any tenant
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }
    
    const userTenantId = req.user.user?.tenant_id || req.user.tenant_id;
    const requestedTenantId = req.params.tenantId || req.body.tenant_id;
    
    if (requestedTenantId && userTenantId.toString() !== requestedTenantId.toString()) {
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'TENANT_ACCESS_DENIED',
        message: 'You can only access your own institution data'
      });
    }
    
    next();
  } catch (error) {
    console.error('Tenant access check error:', error);
    return res.status(500).json({ 
      error: 'Tenant access check failed',
      code: 'TENANT_ERROR'
    });
  }
};

// Enhanced login with better error handling
const loginMultiTenantAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // Check credentials
    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      // Generate JWT tokens
      const userPayload = {
        username: SUPER_ADMIN.username,
        role: 'super_admin',
        type: 'multi_tenant_admin'
      };
      
      const accessToken = generateToken(userPayload);
      const refreshToken = generateRefreshToken(userPayload);
      
      res.json({
        success: true,
        message: 'Login successful',
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        user: {
          username: SUPER_ADMIN.username,
          role: 'super_admin'
        }
      });
    } else {
      res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        message: 'Please check your username and password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR',
      message: 'An error occurred during login. Please try again.'
    });
  }
};

// Token refresh endpoint
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }
    
    const decoded = verifyToken(refreshToken);
    const newAccessToken = generateToken(decoded);
    
    res.json({
      success: true,
      token: newAccessToken,
      expiresIn: 30 * 24 * 60 * 60 * 1000
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

module.exports = {
  authenticateMultiTenantAdmin,
  requireRole,
  requirePermission,
  requireTenantAccess,
  loginMultiTenantAdmin,
  refreshToken,
  ROLES,
  PERMISSIONS
}; 