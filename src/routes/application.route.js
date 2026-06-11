const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

// Import controllers
const ApplicationSchemaController = require('../controllers/applicationSchema.controller');
const ApplicantController = require('../controllers/applicant.controller');
const ApplicationDownloadController = require('../controllers/applicationDownload.controller');
const AdmissionController = require('../controllers/admission.controller');

// Import middleware
const { protectRoute, requireRoles, requirePermissions } = require('../middlewares/auth.middleware');
const { uploadDocument, handleMulterError } = require('../middlewares/upload.middleware');

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/csv/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `admission-scores-${Date.now()}-${file.originalname}`)
});

const uploadAdmissionCsv = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) return cb(null, true);
    cb(new Error('Only CSV files are allowed'));
  }
});

// =====================================================
// APPLICATION SCHEMA ROUTES
// =====================================================

// Create new application schema
router.post('/schemas', protectRoute, ApplicationSchemaController.createApplicationSchemaController);

// Get all application schemas
router.get('/schemas', protectRoute, ApplicationSchemaController.getAllApplicationSchemasController);

// Get schema by ID with fields
router.get('/schemas/:schemaId', protectRoute, ApplicationSchemaController.getApplicationSchemaByIdController);

// Update schema
router.put('/schemas/:schemaId', protectRoute, ApplicationSchemaController.updateApplicationSchemaController);

// Delete schema
router.delete('/schemas/:schemaId', protectRoute, ApplicationSchemaController.deleteApplicationSchemaController);

// Duplicate schema
router.post('/schemas/:schemaId/duplicate', protectRoute, ApplicationSchemaController.duplicateApplicationSchemaController);

// Get schema statistics
router.get('/schemas/stats/overview', protectRoute, ApplicationSchemaController.getApplicationSchemaStatsController);

// =====================================================
// APPLICATION SCHEMA FIELD ROUTES
// =====================================================

// Add field to schema
router.post('/schemas/:schemaId/fields', protectRoute, ApplicationSchemaController.addApplicationSchemaFieldController);

// Get schema fields only
router.get('/schemas/:schemaId/fields', protectRoute, ApplicationSchemaController.getApplicationSchemaFieldsController);

// Get field by ID
router.get('/fields/:fieldId', protectRoute, ApplicationSchemaController.getApplicationSchemaFieldByIdController);

// Update field
router.put('/schemas/:schemaId/fields/:fieldId', protectRoute, ApplicationSchemaController.updateApplicationSchemaFieldController);

// Delete field
router.delete('/schemas/:schemaId/fields/:fieldId', protectRoute, ApplicationSchemaController.deleteApplicationSchemaFieldController);

// =====================================================
// ADMISSION RESULTS + LETTER ROUTES
// Must be declared before /:id applicant routes.
// =====================================================

router.get('/admission/subjects', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_subject.read'), AdmissionController.getAdmissionSubjectsController);
router.post('/admission/subjects', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_subject.create'), AdmissionController.createAdmissionSubjectController);
router.put('/admission/subjects/:id', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_subject.update'), AdmissionController.updateAdmissionSubjectController);
router.get('/admission/subject-assignments', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_result.read'), AdmissionController.getSubjectAssignmentsController);
router.post('/admission/applicants/subjects/bulk', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_score.create'), AdmissionController.assignSelectedApplicantsSubjectsController);
router.get('/admission/applicants/:applicantId/subjects', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_result.read'), AdmissionController.getApplicantSubjectsController);
router.put('/admission/applicants/:applicantId/subjects', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_score.create'), AdmissionController.assignApplicantSubjectsController);
router.post('/admission/exam-dates/:examDateId/subjects', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_score.create'), AdmissionController.assignExamDateSubjectsController);

router.get('/admission/benchmark', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_benchmark.read'), AdmissionController.getBenchmarkController);
router.put('/admission/benchmark', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_benchmark.update'), AdmissionController.updateBenchmarkController);

router.get('/admission/scores/export.csv', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_result.read'), AdmissionController.exportScoresCsvController);
router.post('/admission/scores/import', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_score.create'), uploadAdmissionCsv.single('file'), AdmissionController.importScoresCsvController);
router.get('/admission/scores/sheet', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_result.read'), AdmissionController.getScoreSheetController);
router.post('/admission/scores/bulk', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_score.create'), AdmissionController.upsertBulkScoresController);
router.post('/admission/scores/:applicantId', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_score.create'), AdmissionController.upsertApplicantScoresController);
router.get('/admission/results/:applicantId', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_result.read'), AdmissionController.getApplicantResultController);
router.get('/admission/my-results', protectRoute, requireRoles('Student'), AdmissionController.getMyResultsController);
router.get('/admission/successful', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_result.read'), AdmissionController.listSuccessfulCandidatesController);
router.put('/admission/decision/:applicantId', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_decision.update'), AdmissionController.updateAdmissionDecisionController);

router.get('/admission/letters/:applicantId/download', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_letter.generate'), AdmissionController.generateAdmissionLetterController);
router.get('/admission/letters/:applicantId/my-download', protectRoute, requireRoles('Student'), AdmissionController.generateMyAdmissionLetterController);
router.post('/admission/letters/send', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('admission_letter.send'), AdmissionController.sendAdmissionLettersController);

// =====================================================
// APPLICANT ROUTES
// =====================================================

// Generate application number
router.get('/generate-number', protectRoute, ApplicantController.generateApplicationNumberController);

// Create new applicant
router.post('/create', protectRoute, ApplicantController.createApplicantController);

// Get all applicants with pagination and filters
router.get('/', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getAllApplicantsController);

// Get all applicants with pagination and filters
router.get('/my', protectRoute, ApplicantController.getApplicantsByUserIdController);

// Download application as PDF (must come before /:id route)
router.get('/:id/download', protectRoute, ApplicationDownloadController.downloadApplicationController);

// Get applicant by ID or by user ID
// If id matches current user's ID, return all their applications
// Otherwise, treat it as an application ID and return single application
router.get('/:id', protectRoute, async (req, res, next) => {
  const { id } = req.params;
  
  // Skip if the route is "my" - this should not happen if route order is correct
  // but adding as safety check - return 404 to prevent it from being treated as an ID
  if (id === 'my' || id === 'stats' || id === 'recent' || id === 'search' || id === 'dashboard' || id === 'exam-assignment' || id === 'status' || id === 'exam-date' || id === 'check') {
    return res.status(404).json({
      success: false,
      message: 'Route not found. Please use the correct endpoint.'
    });
  }
  
  try {
    const currentUserId = req.user?.id;
    
    // Convert both to numbers for comparison (MySQL IDs are numbers)
    const requestedId = parseInt(id, 10);
    const userId = currentUserId ? parseInt(String(currentUserId), 10) : null;
    
    // If the ID matches the current user's ID, return all their applications
    if (userId && !isNaN(requestedId) && !isNaN(userId) && requestedId === userId) {
      return ApplicantController.getApplicantsByUserIdController(req, res);
    }
    
    // Otherwise, treat it as an application ID
    next();
  } catch (error) {
    // If error occurs, fall through to application ID lookup
    next();
  }
}, ApplicantController.getApplicantByIdController);

// Get applicant by application number
router.get('/application-number/:applicationNumber', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getApplicantByApplicationNumberController);

// Update applicant
router.put('/:id', protectRoute, ApplicantController.updateApplicantController);

// Delete applicant
router.delete('/:id', protectRoute, ApplicantController.deleteApplicantController);

// =====================================================
// APPLICATION STATUS ROUTES
// =====================================================

// Submit application
router.post('/:id/submit', protectRoute, ApplicantController.submitApplicationController);

// Update application status
router.put('/:id/status', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.updateApplicationStatusController);

// Update payment status
router.put('/:id/payment-status', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.updatePaymentStatusController);

// =====================================================
// APPLICANT UTILITY ROUTES
// =====================================================

// Get applicants by status
router.get('/status/:status', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getApplicantsByStatusController);

// Get applicants by exam date
router.get('/exam-date/:examDateId', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getApplicantsByExamDateController);

// Get applicant statistics
router.get('/stats/overview', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getApplicantStatsController);

// Check if email exists
router.get('/check/email/:email', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.checkApplicantEmailExistsController);

// Check if application number exists
router.get('/check/application-number/:applicationNumber', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.checkApplicationNumberExistsController);

// Get recent applications
router.get('/recent/list', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getRecentApplicationsController);

// Search applicants
router.get('/search/query', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.searchApplicantsController);

// Get applicant dashboard data
router.get('/dashboard/overview', protectRoute, requireRoles('Super Admin', 'Admin'), ApplicantController.getApplicantDashboardController);

// =====================================================
// EXAM ASSIGNMENT MANAGEMENT ROUTES
// =====================================================

// Assign exam to multiple applicants
router.post('/assign-exam', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('exam_assignment.manage'), ApplicantController.assignExamController);
router.put('/:id/select-exam-date', protectRoute, requireRoles('Student'), requirePermissions('student_exam.read'), ApplicantController.selectMyExamDateController);

// Update exam assignment for a single applicant
router.put('/:id/exam-assignment', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('exam_assignment.manage'), ApplicantController.updateExamAssignmentController);

// Remove exam assignment from multiple applicants
router.post('/remove-exam-assignment', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('exam_assignment.manage'), ApplicantController.removeExamAssignmentController);

// Get exam assignment statistics
router.get('/exam-assignment/stats', protectRoute, requireRoles('Super Admin', 'Admin'), requirePermissions('exam_assignment.manage'), ApplicantController.getExamAssignmentStatsController);

// =====================================================
// APPLICANT FILE UPLOAD ROUTES
// =====================================================

// Upload passport photo (for applications)
router.post('/:id/passport-photo', 
  protectRoute, 
  uploadDocument,
  handleMulterError,
  ApplicantController.uploadPassportPhotoController
);

// Upload a document selected for a dynamic application field
router.post('/:id/documents',
  protectRoute,
  uploadDocument,
  handleMulterError,
  ApplicantController.uploadApplicationDocumentController
);

// Delete passport photo
router.delete('/:id/passport-photo', 
  protectRoute, 
  ApplicantController.deletePassportPhotoController
);

module.exports = router;
