const {
  createRolePermission,
  getAllRolePermissionsSimple,
  findRolePermissionById,
  findRolePermissionByRoleAndPermission,
  findAllRolePermissions,
  getPermissionsByRole,
  getRolesByPermission,
  bulkCreateRolePermissions
} = require('../models/rolePermission.model');

const { asyncHandler, ValidationError, NotFoundError, ConflictError } = require('../middlewares/error.middleware');
const { validationResult } = require('express-validator');

// Create Role-Permission Assignment (Admin only)
const createRolePermissionController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { role_id, permission_id } = req.body;

  // Create role-permission assignment
  const rolePermission = await createRolePermission({
    role_id,
    permission_id
  });

  res.status(201).json({
    success: true,
    message: 'Role-permission assignment created successfully',
    data: {
      rolePermission
    }
  });
});

// Get All Role-Permission Assignments
const getAllRolePermissionsController = asyncHandler(async (req, res) => {
  // Use simple function to avoid pagination issues
  const rolePermissions = await getAllRolePermissionsSimple();

  res.json({
    success: true,
    message: 'Role-permission assignments retrieved successfully',
    data: {
      rolePermissions,
      count: rolePermissions.length
    }
  });
});

// Get Role-Permission Assignment by ID
const getRolePermissionByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rolePermission = await findRolePermissionById(id);
  if (!rolePermission) {
    throw new NotFoundError('Role-permission assignment');
  }

  res.json({
    success: true,
    message: 'Role-permission assignment retrieved successfully',
    data: {
      rolePermission
    }
  });
});

// Update Role-Permission Assignment (Admin only)
const updateRolePermissionController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { role_id, permission_id } = req.body;

  const rolePermission = await findRolePermissionById(id);
  if (!rolePermission) {
    throw new NotFoundError('Role-permission assignment');
  }

  const updatedRolePermission = await updateRolePermission(id, {
    role_id,
    permission_id
  });

  res.json({
    success: true,
    message: 'Role-permission assignment updated successfully',
    data: {
      rolePermission: updatedRolePermission
    }
  });
});

// Delete Role-Permission Assignment (Admin only)
const deleteRolePermissionController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rolePermission = await findRolePermissionById(id);
  if (!rolePermission) {
    throw new NotFoundError('Role-permission assignment');
  }

  await deleteRolePermission();

  res.json({
    success: true,
    message: 'Role-permission assignment deleted successfully'
  });
});

// Delete Role-Permission Assignment by Role and Permission (Admin only)
const deleteRolePermissionByRoleAndPermissionController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { role_id, permission_id } = req.body;

  const rolePermission = await findRolePermissionByRoleAndPermission(role_id, permission_id);
  if (!rolePermission) {
    throw new NotFoundError('Role-permission assignment');
  }

  await deleteRolePermissionByRoleAndPermission(role_id, permission_id);

  res.json({
    success: true,
    message: 'Role-permission assignment deleted successfully'
  });
});

// Get Permissions for a Specific Role
const getPermissionsByRoleController = asyncHandler(async (req, res) => {
  const { role_id } = req.params;

  const permissions = await getPermissionsByRole(role_id);

  res.json({
    success: true,
    message: 'Role permissions retrieved successfully',
    data: {
      role_id: parseInt(role_id),
      permissions
    }
  });
});

// Get Roles for a Specific Permission
const getRolesByPermissionController = asyncHandler(async (req, res) => {
  const { permission_id } = req.params;

  const roles = await getRolesByPermission(permission_id);

  res.json({
    success: true,
    message: 'Permission roles retrieved successfully',
    data: {
      permission_id: parseInt(permission_id),
      roles
    }
  });
});

// Bulk Create Role-Permission Assignments (Admin only)
const bulkCreateRolePermissionsController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { assignments } = req.body;

  const result = await bulkCreateRolePermissions(assignments);

  res.status(201).json({
    success: true,
    message: 'Bulk role-permission creation completed',
    data: result
  });
});

// Bulk Delete Role-Permission Assignments (Admin only)
const bulkDeleteRolePermissionsController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { assignments } = req.body;

  const result = await bulkDeleteRolePermissions(assignments);

  res.json({
    success: true,
    message: 'Bulk role-permission deletion completed',
    data: result
  });
});

// Get Role-Permission Statistics (Admin only)
const getRolePermissionStatisticsController = asyncHandler(async (req, res) => {
  const statistics = await getRolePermissionStatistics();

  res.json({
    success: true,
    message: 'Role-permission statistics retrieved successfully',
    data: {
      statistics
    }
  });
});

// Assign Multiple Permissions to Role (Admin only)
const assignPermissionsToRole = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { role_id } = req.params;
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids) || permission_ids.length === 0) {
    throw new ValidationError('Permission IDs array is required and must not be empty');
  }

  // Create assignments array
  const assignments = permission_ids.map(permission_id => ({
    role_id: parseInt(role_id),
    permission_id: parseInt(permission_id)
  }));

  const result = await bulkCreateRolePermissions(assignments);

  res.status(201).json({
    success: true,
    message: 'Permissions assigned to role successfully',
    data: result
  });
});

// Remove Multiple Permissions from Role (Admin only)
const removePermissionsFromRole = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { role_id } = req.params;
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids) || permission_ids.length === 0) {
    throw new ValidationError('Permission IDs array is required and must not be empty');
  }

  // Create assignments array
  const assignments = permission_ids.map(permission_id => ({
    role_id: parseInt(role_id),
    permission_id: parseInt(permission_id)
  }));

  const result = await bulkDeleteRolePermissions(assignments);

  res.json({
    success: true,
    message: 'Permissions removed from role successfully',
    data: result
  });
});

// Assign Role to Multiple Permissions (Admin only)
const assignRoleToPermissions = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { permission_id } = req.params;
  const { role_ids } = req.body;

  if (!Array.isArray(role_ids) || role_ids.length === 0) {
    throw new ValidationError('Role IDs array is required and must not be empty');
  }

  // Create assignments array
  const assignments = role_ids.map(role_id => ({
    role_id: parseInt(role_id),
    permission_id: parseInt(permission_id)
  }));

  const result = await bulkCreateRolePermissions(assignments);

  res.status(201).json({
    success: true,
    message: 'Role assigned to permissions successfully',
    data: result
  });
});

// Remove Role from Multiple Permissions (Admin only)
const removeRoleFromPermissions = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { permission_id } = req.params;
  const { role_ids } = req.body;

  if (!Array.isArray(role_ids) || role_ids.length === 0) {
    throw new ValidationError('Role IDs array is required and must not be empty');
  }

  // Create assignments array
  const assignments = role_ids.map(role_id => ({
    role_id: parseInt(role_id),
    permission_id: parseInt(permission_id)
  }));

  const result = await bulkDeleteRolePermissions(assignments);

  res.json({
    success: true,
    message: 'Role removed from permissions successfully',
    data: result
  });
});

// Replace All Permissions for a Role (Admin only)
const replaceRolePermissions = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { role_id } = req.params;
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids)) {
    throw new ValidationError('Permission IDs must be an array');
  }

  // First, get all current permissions for the role
  const currentPermissions = await getPermissionsByRole(role_id);
  
  // Create assignments to delete (current permissions)
  const assignmentsToDelete = currentPermissions.map(perm => ({
    role_id: parseInt(role_id),
    permission_id: perm.permission_id
  }));

  // Create assignments to add (new permissions)
  const assignmentsToAdd = permission_ids.map(permission_id => ({
    role_id: parseInt(role_id),
    permission_id: parseInt(permission_id)
  }));

  // Delete current assignments
  let deleteResult = { deletedAssignments: [], errors: [] };
  if (assignmentsToDelete.length > 0) {
    deleteResult = await bulkDeleteRolePermissions(assignmentsToDelete);
  }

  // Add new assignments
  let createResult = { createdAssignments: [], errors: [] };
  if (assignmentsToAdd.length > 0) {
    createResult = await bulkCreateRolePermissions(assignmentsToAdd);
  }

  res.json({
    success: true,
    message: 'Role permissions replaced successfully',
    data: {
      removed: deleteResult,
      added: createResult,
      summary: {
        totalRemoved: deleteResult.deletedAssignments.length,
        totalAdded: createResult.createdAssignments.length,
        totalErrors: deleteResult.errors.length + createResult.errors.length
      }
    }
  });
});

module.exports = {
  createRolePermission: createRolePermissionController,
  getAllRolePermissions: getAllRolePermissionsController,
  getRolePermissionById: getRolePermissionByIdController,
  updateRolePermission: updateRolePermissionController,
  deleteRolePermission: deleteRolePermissionController,
  deleteRolePermissionByRoleAndPermission: deleteRolePermissionByRoleAndPermissionController,
  getPermissionsByRole: getPermissionsByRoleController,
  getRolesByPermission: getRolesByPermissionController,
  bulkCreateRolePermissions: bulkCreateRolePermissionsController,
  bulkDeleteRolePermissions: bulkDeleteRolePermissionsController,
  getRolePermissionStatistics: getRolePermissionStatisticsController,
  assignPermissionsToRole,
  removePermissionsFromRole,
  assignRoleToPermissions,
  removeRoleFromPermissions,
  replaceRolePermissions
};