const express = require('express');
const { body } = require('express-validator');
const {
  createRolePermission,
  getAllRolePermissions,
  getRolePermissionById,
  updateRolePermission,
  deleteRolePermission,
  deleteRolePermissionByRoleAndPermission,
  getPermissionsByRole,
  getRolesByPermission,
  bulkCreateRolePermissions,
  bulkDeleteRolePermissions,
  getRolePermissionStatistics,
  assignPermissionsToRole,
  removePermissionsFromRole,
  assignRoleToPermissions,
  removeRoleFromPermissions,
  replaceRolePermissions
} = require('../controllers/rolePermission.controller');

const {
  protectRoute,
  requireRoles
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Validation rules
const createRolePermissionValidation = [
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  body('permission_id')
    .isInt({ min: 1 })
    .withMessage('Permission ID must be a positive integer')
];

const updateRolePermissionValidation = [
  body('role_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  body('permission_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Permission ID must be a positive integer')
];

const deleteByRoleAndPermissionValidation = [
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  body('permission_id')
    .isInt({ min: 1 })
    .withMessage('Permission ID must be a positive integer')
];

const bulkCreateValidation = [
  body('assignments')
    .isArray({ min: 1 })
    .withMessage('Assignments must be a non-empty array'),
  body('assignments.*.role_id')
    .isInt({ min: 1 })
    .withMessage('Each assignment must have a valid role_id'),
  body('assignments.*.permission_id')
    .isInt({ min: 1 })
    .withMessage('Each assignment must have a valid permission_id')
];

const bulkDeleteValidation = [
  body('assignments')
    .isArray({ min: 1 })
    .withMessage('Assignments must be a non-empty array'),
  body('assignments.*.role_id')
    .isInt({ min: 1 })
    .withMessage('Each assignment must have a valid role_id'),
  body('assignments.*.permission_id')
    .isInt({ min: 1 })
    .withMessage('Each assignment must have a valid permission_id')
];

const assignPermissionsValidation = [
  body('permission_ids')
    .isArray({ min: 1 })
    .withMessage('Permission IDs must be a non-empty array')
    .custom((value) => {
      if (!value.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All permission IDs must be positive integers');
      }
      return true;
    })
];

const assignRolesValidation = [
  body('role_ids')
    .isArray({ min: 1 })
    .withMessage('Role IDs must be a non-empty array')
    .custom((value) => {
      if (!value.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All role IDs must be positive integers');
      }
      return true;
    })
];

const replacePermissionsValidation = [
  body('permission_ids')
    .isArray()
    .withMessage('Permission IDs must be an array')
    .custom((value) => {
      if (value.length > 0 && !value.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All permission IDs must be positive integers');
      }
      return true;
    })
];

// All routes require authentication
router.use(protectRoute);
router.use(requireRoles('Super Admin', 'Admin'));

// Public routes (authenticated users can view role-permissions)
router.get('/', getAllRolePermissions);
router.get('/statistics', getRolePermissionStatistics);
router.get('/:id', getRolePermissionById);
router.get('/role/:role_id/permissions', getPermissionsByRole);
router.get('/permission/:permission_id/roles', getRolesByPermission);

// Admin-only routes
router.post('/', createRolePermissionValidation, createRolePermission);
router.put('/:id', updateRolePermissionValidation, updateRolePermission);
router.delete('/:id', deleteRolePermission);
router.delete('/by-assignment', deleteByRoleAndPermissionValidation, deleteRolePermissionByRoleAndPermission);

// Bulk operations (Admin only)
router.post('/bulk', bulkCreateValidation, bulkCreateRolePermissions);
router.delete('/bulk', bulkDeleteValidation, bulkDeleteRolePermissions);

// Role-based operations (Admin only)
router.post('/role/:role_id/assign-permissions', assignPermissionsValidation, assignPermissionsToRole);
router.delete('/role/:role_id/remove-permissions', assignPermissionsValidation, removePermissionsFromRole);
router.put('/role/:role_id/replace-permissions', replacePermissionsValidation, replaceRolePermissions);

// Permission-based operations (Admin only)
router.post('/permission/:permission_id/assign-roles', assignRolesValidation, assignRoleToPermissions);
router.delete('/permission/:permission_id/remove-roles', assignRolesValidation, removeRoleFromPermissions);

module.exports = router;
