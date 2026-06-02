const express = require('express');
const { body } = require('express-validator');
const {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermissionById,
  deletePermissionById,
  softDeletePermissionById
} = require('../controllers/permission.controller');

const {
  protectRoute,
  requireRoles
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Validation rules
const createPermissionValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Permission name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Permission name can only contain letters, numbers, dots, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('resource')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Resource must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Resource can only contain letters, numbers, dots, hyphens, and underscores'),
  body('action')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Action must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Action can only contain letters, numbers, dots, hyphens, and underscores'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const updatePermissionValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Permission name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Permission name can only contain letters, numbers, dots, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('resource')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Resource must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Resource can only contain letters, numbers, dots, hyphens, and underscores'),
  body('action')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Action must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Action can only contain letters, numbers, dots, hyphens, and underscores'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const checkAssignmentValidation = [
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer')
];

const bulkCreateValidation = [
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('Permissions must be a non-empty array'),
  body('permissions.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Permission name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Permission name can only contain letters, numbers, dots, hyphens, and underscores'),
  body('permissions.*.description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('permissions.*.resource')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Resource must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Resource can only contain letters, numbers, dots, hyphens, and underscores'),
  body('permissions.*.action')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Action must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Action can only contain letters, numbers, dots, hyphens, and underscores'),
  body('permissions.*.is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

// All routes require authentication
router.use(protectRoute);
router.use(requireRoles('Super Admin', 'Admin'));

// Public routes (authenticated users can view permissions)
router.get('/', getAllPermissions);
router.get('/:id', getPermissionById);

// Admin-only routes
router.post('/', createPermissionValidation, createPermission);
router.put('/:id', updatePermissionValidation, updatePermissionById);
router.delete('/:id', deletePermissionById);
router.patch('/:id/deactivate', softDeletePermissionById);

module.exports = router;
