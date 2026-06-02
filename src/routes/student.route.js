const express = require('express');
const router = express.Router();

// Import controllers
const StudentSchemaController = require('../controllers/studentSchema.controller');
const StudentController = require('../controllers/student.controller');

// Import middleware
const { protectRoute, requireRoles, requirePermissions } = require('../middlewares/auth.middleware');
const { uploadProfilePhoto, handleMulterError } = require('../middlewares/upload.middleware');
const multer = require('multer');
const path = require('path');

// ✅ Multer config for CSV upload
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/csv/';
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `students_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadCSV = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// =====================================================
// STUDENT SCHEMA ROUTES
// =====================================================

// Create new student schema
router.post('/schemas', protectRoute, StudentSchemaController.createSchemaController);

// Get all student schemas
router.get('/schemas', protectRoute, StudentSchemaController.getAllSchemasController);

// Get schema by ID with fields
router.get('/schemas/:schemaId', protectRoute, StudentSchemaController.getSchemaByIdController);

// Update schema
router.put('/schemas/:schemaId', protectRoute, StudentSchemaController.updateSchemaController);

// Delete schema
router.delete('/schemas/:schemaId', protectRoute, StudentSchemaController.deleteSchemaController);

// =====================================================
// STUDENT SCHEMA FIELD ROUTES
// =====================================================

// Add field to schema
router.post('/schemas/:schemaId/fields', protectRoute, StudentSchemaController.addFieldController);

// Get schema fields only
router.get('/schemas/:schemaId/fields', protectRoute, StudentSchemaController.getSchemaFieldsController);

// Update field
router.put('/fields/:fieldId', protectRoute, StudentSchemaController.updateFieldController);

// Delete field
router.delete('/fields/:fieldId', protectRoute, StudentSchemaController.deleteFieldController);

// =====================================================
// STUDENT ROUTES
// =====================================================

// Public endpoints for external school websites
router.get('/public/schemas', StudentController.getPublicStudentSchemasController);
router.post('/public/register', StudentController.createPublicStudentRegistrationController);

// Get current student's own profile (must be before /:id route)
router.get('/me', protectRoute, StudentController.getMyProfileController);

// Generate next student ID
router.get('/generate-id', protectRoute, StudentController.generateStudentIdController);

// Create new student
router.post('/', protectRoute, StudentController.createStudentController);

// ✅ Bulk create students from CSV
router.post('/bulk-create', protectRoute, uploadCSV.single('file'), StudentController.bulkCreateStudentsController);

// Get all students
router.get('/', protectRoute, StudentController.getAllStudentsController);

// Get student by ID
router.get('/:id', protectRoute, StudentController.getStudentByIdController);

// Update student
router.put('/:id', protectRoute, StudentController.updateStudentController);

// Delete student
router.delete('/:id', protectRoute, StudentController.deleteStudentController);

// =====================================================
// STUDENT USER ACCOUNT ROUTES
// =====================================================

// Create user login for existing student
router.post('/:id/create-login', protectRoute, StudentController.createStudentLoginController);
router.post('/send-logins/bulk', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('student.login.send'), StudentController.sendLoginDetailsToStudentsController);

// =====================================================
// STUDENT PROFILE PHOTO ROUTES
// =====================================================

// Upload profile photo
router.post('/:id/upload-photo', protectRoute, uploadProfilePhoto, handleMulterError, StudentController.uploadProfilePhotoController);

// Delete profile photo
router.delete('/:id/delete-photo', protectRoute, StudentController.deleteProfilePhotoController);

// =====================================================
// STUDENT UTILITY ROUTES
// =====================================================

// Get student statistics
router.get('/stats/overview', protectRoute, StudentController.getStudentStatsController);

module.exports = router;
