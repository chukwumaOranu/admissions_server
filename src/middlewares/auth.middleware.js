const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { findAllPermissions, getAllPermissionsSimple } = require('../models/permission.model');
const { getRolePermissions } = require('../models/userRole.model');
const { findRoleById } = require('../models/role.model');

const normalizeRoleName = (roleName) => {
  const normalized = String(roleName || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
  if (normalized === 'administrator') {
    return 'admin';
  }
  return normalized;
};
const isSuperAdminRole = (roleName) => normalizeRoleName(roleName) === 'super admin';
const getCanonicalRoleName = (roleName) => {
  const normalized = normalizeRoleName(roleName);
  if (normalized === 'super admin') return 'Super Admin';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'student') return 'Student';
  return roleName || null;
};

// Route Protection Middleware (for authenticated users)
const protectRoute = async (req, res, next) => {
  try {
    let userId = null;
    let token = null;

    // Method 1: Check Authorization header (NextAuth.js sends JWT tokens here)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      try {
        // Try NextAuth.js secret first
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        userId = decoded.sub || decoded.userId; // NextAuth.js uses 'sub' for user ID
      } catch (nextAuthError) {
        try {
          // Try custom JWT secret as fallback
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (customJwtError) {
          // Both token verifications failed, will try other methods
        }
      }
    }

    // Method 2: Check HTTP-only cookie (fallback for existing system)
    if (!userId) {
      token = req.cookies.authToken;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (error) {
          // Cookie token verification failed, will try other methods
        }
      }
    }

    // Method 3: Check token query param for mobile PDF/download links.
    // Mobile Linking.openURL cannot attach Authorization headers.
    if (!userId && req.query?.token) {
      token = String(req.query.token);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (customJwtError) {
        try {
          const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
          userId = decoded.sub || decoded.userId;
        } catch (nextAuthError) {
          // Query token verification failed, will try session
        }
      }
    }

    // Method 4: Check session (for server-side requests)
    if (!userId && req.session && req.session.user) {
      userId = req.session.user.id;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Find user by ID
    const user = await User.findUserById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Get user role and permissions (same logic as loginAuthAndPermissions)
    let role = null;
    if (user.role_id) {
      role = await findRoleById(user.role_id);
      if (!role) {
        // If role doesn't exist, set role_id to null to allow user to continue
        // This handles cases where user was assigned to a non-existent role
        console.warn(`⚠️  User ${userId} has invalid role_id ${user.role_id}`);
        user.role_id = null;
      }
    }

    // Check if user is Super Admin and assign all permissions
    if (role && isSuperAdminRole(role.name)) {
      // Super Admin gets all permissions automatically
      const allPermissions = await getAllPermissionsSimple();
      req.user = {
        ...user,
        permissions: allPermissions,
        role: getCanonicalRoleName(role.name),
        role_name: getCanonicalRoleName(role.name),
        role_description: role.description
      };
      return next();
    }

    // For other roles, get their assigned permissions
    if (role) {
      const userPermissions = await getRolePermissions(user.role_id);
      const allPermissions = await getAllPermissionsSimple(); // Use simple version to avoid pagination issues

      // Map permissions to include names
      // Note: getRolePermissions returns permission objects directly, not role-permission relationships
      const mappedPermissions = userPermissions.map(perm => {
        // Check if permission object is valid
        if (!perm || !perm.id) {
          console.warn(`Invalid permission object:`, perm);
          return null;
        }
        
        // Return the permission object directly since it already has all the needed fields
        return {
          id: perm.id,
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          action: perm.action
        };
      }).filter(p => p !== null); // Remove null entries

      req.user = {
        ...user,
        permissions: mappedPermissions,
        role: getCanonicalRoleName(role.name),
        role_name: getCanonicalRoleName(role.name),
        role_description: role.description
      };
    } else {
      // User has no role assigned
      req.user = {
        ...user,
        permissions: [],
        role: null,
        role_name: null,
        role_description: null
      };
    }

    next();
  } catch (error) {
    console.error('Route protection error:', error);

    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const normalizedAllowedRoles = roles.map(normalizeRoleName);
    const normalizedUserRole = normalizeRoleName(req.user.role_name);

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    return next();
  };
};

// Permission-based authorization middleware
const requirePermissions = (...permissionNames) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super Admin bypass
    if (isSuperAdminRole(req.user.role_name)) {
      return next();
    }

    const userPermissionNames = (req.user.permissions || [])
      .map((permission) => {
        if (typeof permission === 'string') return permission;
        if (permission && typeof permission === 'object') return permission.name || permission.permission_name;
        return null;
      })
      .filter(Boolean);

    const missing = permissionNames.filter((permissionName) => !userPermissionNames.includes(permissionName));
    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        missing_permissions: missing
      });
    }

    return next();
  };
};

// Login authentication and permission assignment middleware
const loginAuthAndPermissions = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyUserPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get user role information
    let role = null;
    if (user.role_id) {
      role = await findRoleById(user.role_id);
      if (!role) {
        return res.status(401).json({
          success: false,
          message: 'User role not found'
        });
      }
    }

    // Check if user is Super Admin and assign all permissions
    if (role && isSuperAdminRole(role.name)) {
      // Super Admin gets all permissions automatically
      const allPermissions = await getAllPermissionsSimple();
      req.user = {
        ...user,
        permissions: allPermissions,
        role: getCanonicalRoleName(role.name),
        role_name: getCanonicalRoleName(role.name),
        role_description: role.description
      };
      return next();
    }

    // For other roles, get their assigned permissions
    if (role) {
      const userPermissions = await getRolePermissions(user.role_id);
      req.user = {
        ...user,
        permissions: userPermissions,
        role: getCanonicalRoleName(role.name),
        role_name: getCanonicalRoleName(role.name),
        role_description: role.description
      };
    } else {
      // User has no role assigned
      req.user = {
        ...user,
        permissions: [],
        role: null,
        role_name: null,
        role_description: null
      };
    }

    next();
  } catch (error) {
    console.error('Login authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login authentication failed'
    });
  }
};

// JWT Token Generation
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// Set HTTP-only Cookie
const setTokenCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour
  });
};

// Clear HTTP-only Cookie
const clearTokenCookie = (res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

// Validation Functions
const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

module.exports = {
  protectRoute,
  requireRoles,
  requirePermissions,
  loginAuthAndPermissions,
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  validatePassword,
  validateEmail,
  validateUsername
};
