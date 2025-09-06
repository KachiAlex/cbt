const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = { userId: user._id, user };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Community-based authorization middleware
const authorizeCommunity = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = req.user.user;
    
    // Admin can access everything
    if (user.role === 'admin') {
      return next();
    }

    // Get community from request params or body
    const communityId = req.params.communityId || req.body.community;
    
    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: 'Community ID is required'
      });
    }

    // Check if user belongs to the community or has access
    if (user.community && user.community.toString() === communityId.toString()) {
      return next();
    }

    // Check if user is a ruler, chief, or elder with broader access
    if (['ruler', 'chief', 'elder'].includes(user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to access this community.'
    });

  } catch (error) {
    console.error('Community authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authorization'
    });
  }
};

// Resource ownership authorization
const authorizeResource = (resourceModel, resourceIdParam = 'id', userIdField = 'user') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = req.user.user;
      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      // Admin can access everything
      if (user.role === 'admin') {
        return next();
      }

      const resource = await resourceModel.findById(resourceId);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check ownership
      const ownerId = resource[userIdField];
      if (ownerId && ownerId.toString() === user._id.toString()) {
        return next();
      }

      // Check community access for rulers, chiefs, elders
      if (['ruler', 'chief', 'elder'].includes(user.role)) {
        if (resource.community && user.community && 
            resource.community.toString() === user.community.toString()) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this resource.'
      });

    } catch (error) {
      console.error('Resource authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

module.exports = {
  auth,
  authorize,
  authorizeCommunity,
  authorizeResource
};
