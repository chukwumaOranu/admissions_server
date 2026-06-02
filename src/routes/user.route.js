const express = require('express');
const { body } = require('express-validator');
const {
  login,
  debugSession,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  softDeleteUserById
} = require('../controllers/user.controller');

const {
  protectRoute,
  loginAuthAndPermissions,
  requireRoles
} = require('../middlewares/auth.middleware');

// Validation rules
const loginValidation = [
  body('username')
    .notEmpty()
    .trim()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const router = express.Router();

// Note: Most authentication routes (register, logout, check-auth) 
// are handled by NextAuth.js in the frontend
// But we still need login endpoint for NextAuth.js to authenticate against

// Public login route (for NextAuth.js)
router.post('/login', loginValidation, login);

// Validation rules
const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('email_verified')
    .optional()
    .isBoolean()
    .withMessage('email_verified must be a boolean')
];

// All routes require authentication and permission assignment
router.use(protectRoute);

// User Profile Management Routes
router.get('/debug-session', debugSession);
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);
router.put('/change-password', changePasswordValidation, changePassword);

// Admin-only User Management Routes
router.use(requireRoles('Super Admin', 'Admin'));
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUserValidation, updateUserById);
router.delete('/:id', deleteUserById);
router.patch('/:id/deactivate', softDeleteUserById);

module.exports = router;
