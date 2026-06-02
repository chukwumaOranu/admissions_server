const {
  createUser,
  getAllUsersSimple,
  findUserById,
  findUserByEmail,
  findUserByUsername,
  findAllUsers,
  updateUser,
  changeUserPassword,
  verifyUserPassword,
  deleteUser,
  softDeleteUser,
  userToSafeObject
} = require('../models/user.model');

const { findRoleById } = require('../models/role.model');
const { findAllPermissions, getAllPermissionsSimple } = require('../models/permission.model');
const { getRolePermissions } = require('../models/userRole.model');
const { asyncHandler, ValidationError, NotFoundError, ConflictError } = require('../middlewares/error.middleware');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const canonicalRoleName = (roleName) => {
  const normalized = String(roleName || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
  if (normalized === 'super admin') return 'Super Admin';
  if (normalized === 'administrator' || normalized === 'admin') return 'Admin';
  if (normalized === 'student') return 'Student';
  return roleName || null;
};

// Note: Most authentication functions (register, logout, checkAuth) 
// are handled by NextAuth.js in the frontend
// But we still need login for NextAuth.js to authenticate against

// User Login (for NextAuth.js)
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find user by username
  const user = await findUserByUsername(username);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Verify password
  const isPasswordValid = await verifyUserPassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.is_active) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Get user role and permissions
  const role = await findRoleById(user.role_id);
  
  let userPermissions = [];
  
  // Check if user is Super Admin and assign all permissions
  if (role && role.name === 'Super Admin') {
    // Super Admin gets all permissions automatically
    const allPermissions = await getAllPermissionsSimple();
    // Return only permission names (minimal payload)
    userPermissions = allPermissions.map(permission => permission.name);
  } else {
    // For other roles, get their assigned permissions
    // getRolePermissions already returns full permission objects
    const permissions = await getRolePermissions(user.role_id);
    
    // Return only permission names (minimal payload)
    userPermissions = permissions.map(permission => permission.name);
  }

  // Generate JWT token for NextAuth.js
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: role ? canonicalRoleName(role.name) : null,
        role_description: role ? role.description : null,
        permissions: userPermissions,
        is_active: user.is_active,
        email_verified: user.email_verified
      },
      token: token
    }
  });
});

// Debug Session (for development/testing)
const debugSession = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Session debug info',
    data: {
      session: req.session,
      sessionId: req.sessionID,
      user: req.user || null,
      cookies: req.cookies
    }
  });
});

// Get User Profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Get user role and permissions
  const role = await findRoleById(user.role_id);
  const permissions = await getRolePermissions(user.role_id);
  const allPermissions = await getAllPermissionsSimple();

  // Map permissions to include names
  const userPermissions = permissions.map(perm => {
    const permission = allPermissions.find(p => p.id === (perm.id || perm.permission_id));
    if (!permission) return null;
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action
    };
  }).filter(Boolean);

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: userToSafeObject(user),
      role: role ? {
        id: role.id,
        name: canonicalRoleName(role.name),
        description: role.description
      } : null,
      permissions: userPermissions
    }
  });
});

// Update User Profile
const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { username, email } = req.body;
  const userId = req.user.id;

  // Check if username is already taken by another user
  if (username) {
    const existingUser = await findUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictError('Username is already taken');
    }
  }

  // Check if email is already taken by another user
  if (email) {
    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictError('Email is already taken');
    }
  }

  const updatedUser = await updateUser(userId, { username, email });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: userToSafeObject(updatedUser)
    }
  });
});

// Change User Password
const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get user's current password from database
  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyUserPassword(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new ValidationError('Current password is incorrect');
  }

  // Update password
  await changeUserPassword(userId, newPassword);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Get All Users (Admin only)
const getAllUsers = asyncHandler(async (req, res) => {
  // Use simple function to avoid pagination issues
  const users = await getAllUsersSimple();
  
  res.json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users,
      count: users.length
    }
  });
});

// Get User by ID (Admin only)
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Get user role and permissions
  const role = await findRoleById(user.role_id);
  const permissions = await getRolePermissions(user.role_id);
  const allPermissions = await getAllPermissionsSimple();

  // Map permissions to include names
  const userPermissions = permissions.map(perm => {
    const permission = allPermissions.find(p => p.id === (perm.id || perm.permission_id));
    if (!permission) {
      console.warn(`Permission with ID ${perm.id || perm.permission_id} not found in permissions table`);
      return null;
    }
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action
    };
  }).filter(p => p !== null); // Remove null entries

  res.json({
    success: true,
    message: 'User retrieved successfully',
    data: {
      user: userToSafeObject(user),
      role: role ? {
        id: role.id,
        name: role.name,
        description: role.description
      } : null,
      permissions: userPermissions
    }
  });
});

// Update User by ID (Admin only)
const updateUserById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const updateData = req.body;

  // Check if user exists
  const existingUser = await findUserById(id);
  if (!existingUser) {
    throw new NotFoundError('User');
  }

  // Check for conflicts if updating username or email
  if (updateData.username) {
    const userWithUsername = await findUserByUsername(updateData.username);
    if (userWithUsername && userWithUsername.id !== parseInt(id)) {
      throw new ConflictError('Username is already taken');
    }
  }

  if (updateData.email) {
    const userWithEmail = await findUserByEmail(updateData.email);
    if (userWithEmail && userWithEmail.id !== parseInt(id)) {
      throw new ConflictError('Email is already taken');
    }
  }

  const updatedUser = await updateUser(id, updateData);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: userToSafeObject(updatedUser)
    }
  });
});

// Delete User by ID (Admin only)
const deleteUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  await deleteUser(id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Soft Delete User by ID (Admin only)
const softDeleteUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  await softDeleteUser(id);

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});

module.exports = {
  // Authentication (for NextAuth.js)
  login,
  
  // User CRUD Operations (NextAuth.js handles authentication)
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  softDeleteUserById,
  
  // User Profile Management
  getProfile,
  updateProfile,
  changePassword,
  
  // Debug/Utility Functions
  debugSession
};
