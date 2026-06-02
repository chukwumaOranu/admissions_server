const express = require('express');
const { body, param, query } = require('express-validator');
const { protectRoute, requireRoles } = require('../middlewares/auth.middleware');
const {
  assignUserToRole,
  removeUserFromRole,
  getUserRoles,
  getRoleUsers,
  getUserPermissions,
  checkUserPermission,
  bulkAssignUsersToRole,
  bulkRemoveUsersFromRole
} = require('../controllers/userRole.controller');

const router = express.Router();

// Validation middleware
const validateUserRoleAssignment = [
  body('user_id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('role_id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer')
];

const validateBulkUserRoleAssignment = [
  body('user_ids').isArray({ min: 1 }).withMessage('User IDs must be an array with at least one element'),
  body('user_ids.*').isInt({ min: 1 }).withMessage('Each user ID must be a positive integer'),
  body('role_id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer')
];

const validateUserRoleRemoval = [
  body('user_id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('role_id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer')
];

const validateBulkUserRoleRemoval = [
  body('user_ids').isArray({ min: 1 }).withMessage('User IDs must be an array with at least one element'),
  body('user_ids.*').isInt({ min: 1 }).withMessage('Each user ID must be a positive integer'),
  body('role_id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer')
];

const validateUserId = [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
];

const validateRoleId = [
  param('id').isInt({ min: 1 }).withMessage('Role ID must be a positive integer')
];

const validatePermissionCheck = [
  param('user_id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  param('permission_name').notEmpty().withMessage('Permission name is required')
];

// All routes require authentication
router.use(protectRoute);
router.use(requireRoles('Super Admin', 'Admin'));

// Assign User to Role (Admin only)
router.post('/assign', validateUserRoleAssignment, assignUserToRole);

// Remove User from Role (Admin only)
router.post('/remove', validateUserRoleRemoval, removeUserFromRole);

// Get User Roles
router.get('/user/:id/roles', validateUserId, getUserRoles);

// Get Role Users
router.get('/role/:id/users', validateRoleId, getRoleUsers);

// Get User Permissions
router.get('/user/:id/permissions', validateUserId, getUserPermissions);

// Check User Permission
router.get('/user/:user_id/permission/:permission_name', validatePermissionCheck, checkUserPermission);

// Bulk Assign Users to Role (Admin only)
router.post('/bulk-assign', validateBulkUserRoleAssignment, bulkAssignUsersToRole);

// Bulk Remove Users from Role (Admin only)
router.post('/bulk-remove', validateBulkUserRoleRemoval, bulkRemoveUsersFromRole);

module.exports = router;
