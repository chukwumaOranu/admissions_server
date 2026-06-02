const express = require('express');
const router = express.Router();

// Import controllers
const EmployeeSchemaController = require('../controllers/employeeSchema.controller');
const EmployeeController = require('../controllers/employee.controller');

// Import middleware
const { protectRoute } = require('../middlewares/auth.middleware');
const { uploadProfilePhoto, handleMulterError } = require('../middlewares/upload.middleware');

// =====================================================
// EMPLOYEE SCHEMA ROUTES
// =====================================================

// Create new employee schema
router.post('/schemas', protectRoute, EmployeeSchemaController.createSchema);

// Get all employee schemas
router.get('/schemas', protectRoute, EmployeeSchemaController.getAllSchemas);

// Get schema by ID with fields
router.get('/schemas/:schemaId', protectRoute, EmployeeSchemaController.getSchemaById);

// Update schema
router.put('/schemas/:schemaId', protectRoute, EmployeeSchemaController.updateSchema);

// Delete schema
router.delete('/schemas/:schemaId', protectRoute, EmployeeSchemaController.deleteSchema);

// Duplicate schema
router.post('/schemas/:schemaId/duplicate', protectRoute, EmployeeSchemaController.duplicateSchema);

// =====================================================
// EMPLOYEE SCHEMA FIELD ROUTES
// =====================================================

// Add field to schema
router.post('/schemas/:schemaId/fields', protectRoute, EmployeeSchemaController.addField);

// Get schema fields only
router.get('/schemas/:schemaId/fields', protectRoute, EmployeeSchemaController.getSchemaFields);

// Update field
router.put('/fields/:fieldId', protectRoute, EmployeeSchemaController.updateField);

// Delete field
router.delete('/fields/:fieldId', protectRoute, EmployeeSchemaController.deleteField);

// =====================================================
// EMPLOYEE ROUTES
// =====================================================

// Create new employee
router.post('/', protectRoute, EmployeeController.createEmployeeController);

// Get all employees with pagination and filters
router.get('/', protectRoute, EmployeeController.getAllEmployeesController);

// Get employee by ID
router.get('/:id', protectRoute, EmployeeController.getEmployeeByIdController);

// Get employee by employee ID
router.get('/employee-id/:employeeId', protectRoute, EmployeeController.getEmployeeByEmployeeIdController);

// Update employee
router.put('/:id', protectRoute, EmployeeController.updateEmployeeController);

// Delete employee
router.delete('/:id', protectRoute, EmployeeController.deleteEmployeeController);

// =====================================================
// EMPLOYEE UTILITY ROUTES
// =====================================================

// Get employees by department
router.get('/department/:department', protectRoute, EmployeeController.getEmployeesByDepartmentController);

// Get employee statistics
router.get('/stats/overview', protectRoute, EmployeeController.getEmployeeStatsController);

// Get employee departments
router.get('/stats/departments', protectRoute, EmployeeController.getEmployeeDepartmentsController);

// Check if employee ID exists
router.get('/check/employee-id/:employeeId', protectRoute, EmployeeController.checkEmployeeIdExistsController);

// Check if email exists
router.get('/check/email/:email', protectRoute, EmployeeController.checkEmployeeEmailExistsController);

// Search employees
router.get('/search/query', protectRoute, EmployeeController.searchEmployeesController);

// Get employee dashboard data
router.get('/dashboard/overview', protectRoute, EmployeeController.getEmployeeDashboardController);

// =====================================================
// EMPLOYEE USER ACCOUNT ROUTES
// =====================================================

// Create user login for existing employee
router.post('/:id/create-login', protectRoute, EmployeeController.createEmployeeLoginController);

// =====================================================
// EMPLOYEE FILE UPLOAD ROUTES
// =====================================================

// Upload employee profile image (similar to student profile photo)
router.post('/:id/upload-photo', 
  protectRoute, 
  uploadProfilePhoto,
  handleMulterError,
  EmployeeController.uploadProfileImageController
);

// Delete employee profile photo
router.delete('/:id/delete-photo', 
  protectRoute, 
  EmployeeController.deleteProfilePhotoController
);

module.exports = router;
