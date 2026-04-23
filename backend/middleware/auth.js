import { verifyToken } from '../utils/auth.js';
import User from '../models/User.js';
import ApiClient from '../models/ApiClient.js';
import crypto from 'crypto';

// Authenticate API Client using client credentials
export const authenticateApiClient = async (req, res, next) => {
  try {
    const clientId = req.headers['x-client-id'];
    const clientSecret = req.headers['x-client-secret'];
    
    if (!clientId || !clientSecret) {
      return res.status(401).json({
        success: false,
        message: 'API credentials required. Provide X-Client-Id and X-Client-Secret headers'
      });
    }

    const apiClient = await ApiClient.findOne({ clientId, status: 'active' });
    
    if (!apiClient) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API credentials'
      });
    }

    // Check if client is expired
    if (apiClient.expiresAt && apiClient.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'API credentials expired'
      });
    }

    // Verify secret
    if (!(await apiClient.verifySecret(clientSecret))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API credentials'
      });
    }

    // Check IP whitelist if configured
    if (apiClient.allowedIPs.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!apiClient.allowedIPs.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied from this IP address'
        });
      }
    }

    // Update usage stats
    apiClient.lastUsedAt = new Date();
    apiClient.usageCount += 1;
    await apiClient.save();

    req.apiClient = apiClient;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'API authentication failed'
    });
  }
};

// Check API client scopes
export const requireScope = (...requiredScopes) => {
  return (req, res, next) => {
    if (!req.apiClient) {
      return res.status(401).json({
        success: false,
        message: 'API authentication required'
      });
    }

    const hasScope = requiredScopes.some(scope => 
      req.apiClient.scopes.includes(scope) || req.apiClient.scopes.includes('admin:all')
    );

    if (!hasScope) {
      return res.status(403).json({
        success: false,
        message: `Insufficient scope. Required: ${requiredScopes.join(' or ')}`
      });
    }

    next();
  };
};

// Authenticate user
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Require specific role
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Require admin role
export const requireAdmin = requireRole('admin', 'manager');

// Require seller role (formerly outlet)
export const requireVendor = requireRole('seller', 'admin', 'manager');

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (decoded) {
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.status === 'active') {
          req.user = user;
        }
      }
    }
  } catch (error) {
    // Continue without authentication
  }
  
  next();
};
