const express = require('express');
const { body } = require('express-validator');
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRoleById,
  deleteRoleById,
  softDeleteRoleById
} = require('../controllers/role.controller');

const {
  protectRoute,
  requireRoles
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Validation rules
const createRoleValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_\s]+$/)
    .withMessage('Role name can only contain letters, numbers, underscores, and spaces'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const updateRoleValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_\s]+$/)
    .withMessage('Role name can only contain letters, numbers, underscores, and spaces'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const permissionAssignmentValidation = [
  body('permission_id')
    .isInt({ min: 1 })
    .withMessage('Permission ID must be a positive integer')
];

const setPermissionsValidation = [
  body('permission_ids')
    .isArray({ min: 0 })
    .withMessage('Permission IDs must be an array')
    .custom((value) => {
      if (!value.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All permission IDs must be positive integers');
      }
      return true;
    })
];

// All routes require authentication
router.use(protectRoute);
router.use(requireRoles('Super Admin', 'Admin'));

// Public routes (authenticated users can view roles)
router.get('/', getAllRoles);
router.get('/:id', getRoleById);

// Admin-only routes
router.post('/create', createRoleValidation, createRole);
router.put('/:id', updateRoleValidation, updateRoleById);
router.delete('/:id', deleteRoleById);
router.patch('/:id/deactivate', softDeleteRoleById);

module.exports = router;
