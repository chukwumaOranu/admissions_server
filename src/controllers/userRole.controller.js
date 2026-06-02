const { asyncHandler, ValidationError, NotFoundError, ConflictError } = require('../middlewares/error.middleware');
const { validationResult } = require('express-validator');
const { 
  findUserById
} = require('../models/user.model');
const {
  findRoleById
} = require('../models/role.model');
const {
  assignUserToRole,
  removeUserFromRole,
  getUserRoles,
  getRoleUsers,
  getUserPermissions,
  userHasPermission
} = require('../models/userRole.model');

// Assign User to Role (Admin only)
const assignUserToRoleController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { user_id, role_id } = req.body;

  const user = await findUserById(user_id);
  if (!user) {
    throw new NotFoundError('User');
  }

  const role = await findRoleById(role_id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  await assignUserToRole(user_id, role_id);

  res.json({
    success: true,
    message: 'User assigned to role successfully'
  });
});

// Remove User from Role (Admin only)
const removeUserFromRoleController = asyncHandler(async (req, res) => {
  const { user_id, role_id } = req.body;

  const user = await findUserById(user_id);
  if (!user) {
    throw new NotFoundError('User');
  }

  const role = await findRoleById(role_id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  await removeUserFromRole(user_id, role_id);

  res.json({
    success: true,
    message: 'User removed from role successfully'
  });
});

// Get User Roles
const getUserRolesController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  const roles = await getUserRoles(id);

  res.json({
    success: true,
    message: 'User roles retrieved successfully',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      roles
    }
  });
});

// Get Role Users
const getRoleUsersController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await findRoleById(id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  const users = await getRoleUsers(id);

  res.json({
    success: true,
    message: 'Role users retrieved successfully',
    data: {
      role: {
        id: role.id,
        name: role.name,
        description: role.description
      },
      users
    }
  });
});

// Get User Permissions
const getUserPermissionsController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  const permissions = await getUserPermissions(user.role_id);

  res.json({
    success: true,
    message: 'User permissions retrieved successfully',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id
      },
      permissions
    }
  });
});

// Check User Permission
const checkUserPermissionController = asyncHandler(async (req, res) => {
  const { user_id, permission_name } = req.params;

  const user = await findUserById(user_id);
  if (!user) {
    throw new NotFoundError('User');
  }

  const hasPermission = await userHasPermission(user.role_id, permission_name);

  res.json({
    success: true,
    message: 'Permission check completed',
    data: {
      user_id: user.id,
      permission_name,
      has_permission: hasPermission
    }
  });
});

// Bulk Assign Users to Role (Admin only)
const bulkAssignUsersToRole = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { user_ids, role_id } = req.body;

  const role = await findRoleById(role_id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  const results = [];
  for (const user_id of user_ids) {
    try {
      const user = await findUserById(user_id);
      if (user) {
        await assignUserToRole(user_id, role_id);
        results.push({ user_id, status: 'success' });
      } else {
        results.push({ user_id, status: 'failed', error: 'User not found' });
      }
    } catch (error) {
      results.push({ user_id, status: 'failed', error: error.message });
    }
  }

  res.json({
    success: true,
    message: 'Bulk user assignment completed',
    data: results
  });
});

// Bulk Remove Users from Role (Admin only)
const bulkRemoveUsersFromRole = asyncHandler(async (req, res) => {
  const { user_ids, role_id } = req.body;

  const role = await findRoleById(role_id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  const results = [];
  for (const user_id of user_ids) {
    try {
      const user = await findUserById(user_id);
      if (user) {
        await removeUserFromRole(user_id, role_id);
        results.push({ user_id, status: 'success' });
      } else {
        results.push({ user_id, status: 'failed', error: 'User not found' });
      }
    } catch (error) {
      results.push({ user_id, status: 'failed', error: error.message });
    }
  }

  res.json({
    success: true,
    message: 'Bulk user removal completed',
    data: results
  });
});

module.exports = {
  assignUserToRole: assignUserToRoleController,
  removeUserFromRole: removeUserFromRoleController,
  getUserRoles: getUserRolesController,
  getRoleUsers: getRoleUsersController,
  getUserPermissions: getUserPermissionsController,
  checkUserPermission: checkUserPermissionController,
  bulkAssignUsersToRole,
  bulkRemoveUsersFromRole
};