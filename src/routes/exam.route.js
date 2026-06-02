const express = require('express');
const router = express.Router();

// Import controllers
const EntryDateController = require('../controllers/entryDate.controller');
const ExamCardController = require('../controllers/examCard.controller');
const ExamCardGenerationController = require('../controllers/examCardGeneration.controller');

// Import middleware
const { protectRoute, requirePermissions } = require('../middlewares/auth.middleware');
const { uploadMultipleDocuments, handleMulterError } = require('../middlewares/upload.middleware');

// =====================================================
// ENTRY DATE ROUTES
// =====================================================

// Create new entry date
router.post('/entry-dates', protectRoute, EntryDateController.createEntryDateController);

// Get all entry dates
router.get('/entry-dates', protectRoute, EntryDateController.getAllEntryDatesController);

// Get all entry dates including inactive (admin only)
router.get('/entry-dates/admin/all', protectRoute, EntryDateController.getAllEntryDatesAdminController);

// Get entry date by ID
router.get('/entry-dates/:id', protectRoute, EntryDateController.getEntryDateByIdController);

// Update entry date
router.put('/entry-dates/:id', protectRoute, EntryDateController.updateEntryDateController);

// Delete entry date
router.delete('/entry-dates/:id', protectRoute, EntryDateController.deleteEntryDateController);

// =====================================================
// ENTRY DATE UTILITY ROUTES
// =====================================================

// Get available entry dates
router.get('/entry-dates/available/list', protectRoute, EntryDateController.getAvailableEntryDatesController);

// Check entry date capacity
router.get('/entry-dates/:id/capacity', protectRoute, EntryDateController.checkEntryDateCapacityController);

// Get entry date statistics
router.get('/entry-dates/stats/overview', protectRoute, EntryDateController.getEntryDateStatsController);

// Get upcoming exams
router.get('/entry-dates/upcoming/list', protectRoute, EntryDateController.getUpcomingExamsController);
router.get('/entry-dates/calendar/availability', protectRoute, requirePermissions('exam_calendar.read'), EntryDateController.getExamCalendarAvailabilityController);

// Search entry dates
router.get('/entry-dates/search/query', protectRoute, EntryDateController.searchEntryDatesController);

// Get exam dashboard data
router.get('/entry-dates/dashboard/overview', protectRoute, EntryDateController.getExamDashboardController);

// Toggle entry date status (activate/deactivate)
router.put('/entry-dates/:id/toggle-status', protectRoute, EntryDateController.toggleEntryDateStatusController);

// Get exam venues
router.get('/entry-dates/venues/list', protectRoute, EntryDateController.getExamVenuesController);

// Get exam schedule by date range
router.get('/entry-dates/schedule/range', protectRoute, EntryDateController.getExamScheduleController);

// =====================================================
// EXAM CARD ROUTES
// =====================================================

// Generate exam card number
router.get('/cards/generate-number', protectRoute, ExamCardController.generateExamCardNumberController);

// Create new exam card
router.post('/cards', protectRoute, ExamCardController.createExamCardController);

// Get all exam cards with pagination and filters
router.get('/cards', protectRoute, ExamCardController.getAllExamCardsController);

// Get exam card by ID
router.get('/cards/:id', protectRoute, ExamCardController.getExamCardByIdController);

// Get exam card by card number
router.get('/cards/card-number/:cardNumber', protectRoute, ExamCardController.getExamCardByCardNumberController);

// Get exam card by applicant
router.get('/cards/applicant/:applicantId', protectRoute, ExamCardController.getExamCardByApplicantController);

// Update exam card files
router.put('/cards/:id/files', protectRoute, ExamCardController.updateExamCardFilesController);

// Update exam card exam date
router.put('/cards/:id', protectRoute, ExamCardController.updateExamCardController);

// =====================================================
// EXAM CARD UTILITY ROUTES
// =====================================================

// Mark exam card as printed
router.put('/cards/:id/mark-printed', protectRoute, ExamCardController.markExamCardAsPrintedController);

// Get exam card statistics
router.get('/cards/stats/overview', protectRoute, ExamCardController.getExamCardStatsController);

// Get exam cards by entry date
router.get('/cards/entry-date/:entryDateId', protectRoute, ExamCardController.getExamCardsByEntryDateController);

// Search exam cards
router.get('/cards/search/query', protectRoute, ExamCardController.searchExamCardsController);

// Get exam card dashboard data
router.get('/cards/dashboard/overview', protectRoute, ExamCardController.getExamCardDashboardController);

// Get printable exam cards
router.get('/cards/printable/list', protectRoute, ExamCardController.getPrintableExamCardsController);

// Bulk print exam cards
router.post('/cards/bulk-print', protectRoute, ExamCardController.bulkPrintExamCardsController);

// =====================================================
// EXAM CARD FILE UPLOAD ROUTES
// =====================================================

// Upload exam card files (QR code, card image, PDF)
// Note: Using uploadMultipleDocuments for multiple file upload
router.post('/cards/:id/upload-files', 
  protectRoute, 
  uploadMultipleDocuments,
  handleMulterError,
  ExamCardController.uploadExamCardFilesController
);

// =====================================================
// EXAM CARD GENERATION ROUTES
// =====================================================

// Generate exam card for applicant
router.get('/cards/generate/:applicantId', protectRoute, ExamCardGenerationController.generateExamCardController);

// Generate exam card preview
router.get('/cards/preview/:applicantId', protectRoute, ExamCardGenerationController.generateExamCardPreviewController);

// Bulk generate exam cards
router.post('/cards/bulk-generate', protectRoute, ExamCardGenerationController.bulkGenerateExamCardsController);

module.exports = router;
