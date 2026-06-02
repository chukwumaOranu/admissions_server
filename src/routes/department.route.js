const express = require('express');
const router = express.Router();

// Import controllers
const DepartmentController = require('../controllers/department.controller');

// Import middleware
const { protectRoute } = require('../middlewares/auth.middleware');

// =====================================================
// DEPARTMENT ROUTES
// =====================================================

// Create department
router.post('/', protectRoute,  DepartmentController.createDepartmentController);

// Get all departments
router.get('/', protectRoute,  DepartmentController.getAllDepartmentsController);

// Get department by ID
router.get('/:id', protectRoute,  DepartmentController.getDepartmentByIdController);

// Update department
router.put('/:id', protectRoute,  DepartmentController.updateDepartmentController);

// Delete department
router.delete('/:id', protectRoute,  DepartmentController.deleteDepartmentController);

// Get department statistics
router.get('/stats/overview', protectRoute,  DepartmentController.getDepartmentStatsController);

// Get employees by department
router.get('/:id/employees', protectRoute,  DepartmentController.getEmployeesByDepartmentController);

module.exports = router;
