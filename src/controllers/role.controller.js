const {
  createRole,
  getAllRolesSimple,
  findRoleById,
  findRoleByName,
  findAllRoles,
  updateRole,
  deleteRole,
  softDeleteRole
} = require('../models/role.model');
const { asyncHandler, ValidationError, NotFoundError, ConflictError } = require('../middlewares/error.middleware');
const { validationResult } = require('express-validator');

// Create Role (Admin only)
const createRoleController = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { name, description, is_active = true } = req.body;

  // Check if role already exists
  const existingRole = await findRoleByName(name);
  if (existingRole) {
    throw new ConflictError('Role with this name already exists');
  }

  const role = await createRole({
    name,
    description,
    is_active
  });

  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: {
      role
    }
  });
});

// Get All Roles
const getAllRoles = asyncHandler(async (req, res) => {
  // Use simple function to avoid pagination issues
  const roles = await getAllRolesSimple();
  
  res.json({
    success: true,
    message: 'Roles retrieved successfully',
    data: {
      roles,
      count: roles.length
    }
  });
});

// Get Role by ID
const getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await findRoleById(id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  res.json({
    success: true,
    message: 'Role retrieved successfully',
    data: {
      role
    }
  });
});

// Update Role by ID (Admin only)
const updateRoleById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { name, description, is_active } = req.body;

  const role = await findRoleById(id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  // Check if name is already taken by another role
  if (name && name !== role.name) {
    const existingRole = await findRoleByName(name);
    if (existingRole && existingRole.id !== parseInt(id)) {
      throw new ConflictError('Role name is already taken');
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;

  const updatedRole = await updateRole(id, updateData);

  res.json({
    success: true,
    message: 'Role updated successfully',
    data: {
      role: updatedRole
    }
  });
});

// Delete Role by ID (Admin only)
const deleteRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await findRoleById(id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  await deleteRole(id);

  res.json({
    success: true,
    message: 'Role deleted successfully'
  });
});

// Soft Delete Role by ID (Admin only)
const softDeleteRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await findRoleById(id);
  if (!role) {
    throw new NotFoundError('Role');
  }

  await softDeleteRole(id);

  res.json({
    success: true,
    message: 'Role deactivated successfully'
  });
});

module.exports = {
  createRole: createRoleController,
  getAllRoles,
  getRoleById,
  updateRoleById,
  deleteRoleById,
  softDeleteRoleById
};