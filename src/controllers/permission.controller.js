const {
  createPermission,
  getAllPermissionsSimple,
  findPermissionById,
  findPermissionByName,
  findAllPermissions,
  updatePermission,
  deletePermission,
  softDeletePermission
} = require('../models/permission.model');
const { asyncHandler, ValidationError, NotFoundError, ConflictError } = require('../middlewares/error.middleware');
const { validationResult } = require('express-validator');

// Create Permission (Admin only)
const createPermissionController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { name, description, is_active = true } = req.body;

  // Check if permission already exists
  const existingPermission = await findPermissionByName(name);
  if (existingPermission) {
    throw new ConflictError('Permission with this name already exists');
  }

  const permission = await createPermission({
    name,
    description,
    is_active
  });

  res.status(201).json({
    success: true,
    message: 'Permission created successfully',
    data: {
      permission
    }
  });
});

// Get All Permissions
const getAllPermissions = asyncHandler(async (req, res) => {
  // Use simple function to avoid pagination issues
  const permissions = await getAllPermissionsSimple();
  
  res.json({
    success: true,
    message: 'Permissions retrieved successfully',
    data: {
      permissions,
      count: permissions.length
    }
  });
});

// Get Permission by ID
const getPermissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const permission = await findPermissionById(id);
  if (!permission) {
    throw new NotFoundError('Permission');
  }

  res.json({
    success: true,
    message: 'Permission retrieved successfully',
    data: {
      permission
    }
  });
});

// Update Permission by ID (Admin only)
const updatePermissionById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { name, description, is_active } = req.body;

  const permission = await findPermissionById(id);
  if (!permission) {
    throw new NotFoundError('Permission');
  }

  // Check if name is already taken by another permission
  if (name && name !== permission.name) {
    const existingPermission = await findPermissionByName(name);
    if (existingPermission && existingPermission.id !== parseInt(id)) {
      throw new ConflictError('Permission name is already taken');
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;

  const updatedPermission = await updatePermission(id, updateData);

  res.json({
    success: true,
    message: 'Permission updated successfully',
    data: {
      permission: updatedPermission
    }
  });
});

// Delete Permission by ID (Admin only)
const deletePermissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const permission = await findPermissionById(id);
  if (!permission) {
    throw new NotFoundError('Permission');
  }

  await deletePermission(id);

  res.json({
    success: true,
    message: 'Permission deleted successfully'
  });
});

// Soft Delete Permission by ID (Admin only)
const softDeletePermissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const permission = await findPermissionById(id);
  if (!permission) {
    throw new NotFoundError('Permission');
  }

  await softDeletePermission(id);

  res.json({
    success: true,
    message: 'Permission deactivated successfully'
  });
});

module.exports = {
  createPermission: createPermissionController,
  getAllPermissions,
  getPermissionById,
  updatePermissionById,
  deletePermissionById,
  softDeletePermissionById
};