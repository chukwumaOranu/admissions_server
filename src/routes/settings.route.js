const express = require('express');
const router = express.Router();

// Import controllers
const SettingsController = require('../controllers/settings.controller');
const DocumentTemplateController = require('../controllers/documentTemplate.controller');

// Import middleware
const { protectRoute, requireRoles, requirePermissions } = require('../middlewares/auth.middleware');
const { uploadDocument, uploadSchoolLogo, uploadFavicon, handleMulterError } = require('../middlewares/upload.middleware');

// =====================================================
// SCHOOL SETTINGS ROUTES
// =====================================================

// Get school settings (public - needed for login page logo display)
router.get('/school', SettingsController.getSchoolSettingsController);

// All remaining settings routes require admin privileges
router.use(protectRoute, requireRoles('Super Admin', 'Admin'));

// =====================================================
// DOCUMENT TEMPLATE ROUTES (ADMIN ONLY)
// =====================================================
router.get('/templates', requirePermissions('settings.template.read'), DocumentTemplateController.listDocumentTemplatesController);
router.get('/templates/active/:templateKey', requirePermissions('settings.template.read'), DocumentTemplateController.getActiveDocumentTemplateController);
router.post('/templates', requirePermissions('settings.template.create'), DocumentTemplateController.createDocumentTemplateController);
router.put('/templates/:id', requirePermissions('settings.template.update'), DocumentTemplateController.updateDocumentTemplateController);
router.post('/templates/:id/activate', requirePermissions('settings.template.activate'), DocumentTemplateController.activateDocumentTemplateController);
router.post('/templates/:id/preview', requirePermissions('settings.template.preview'), DocumentTemplateController.previewDocumentTemplateController);

// Create or update school settings
router.post('/school', protectRoute, SettingsController.upsertSchoolSettingsController);

// Get specific school setting
router.get('/school/:settingKey', protectRoute, SettingsController.getSchoolSettingController);

// Update all school settings
router.put('/school', protectRoute, SettingsController.upsertSchoolSettingsController);

// Update specific school setting
router.put('/school/:settingKey', protectRoute, SettingsController.updateSchoolSettingController);

// Reset school settings to defaults
router.post('/school/reset', protectRoute, SettingsController.resetSchoolSettingsController);

// =====================================================
// SYSTEM SETTINGS ROUTES
// =====================================================

// Get system settings
router.get('/system', protectRoute, SettingsController.getSystemSettingsController);

// Update system settings
router.put('/system', protectRoute, SettingsController.updateSystemSettingsController);

// Reset system settings to defaults
router.post('/system/reset', protectRoute, SettingsController.resetSystemSettingsController);

// =====================================================
// EMAIL SETTINGS ROUTES
// =====================================================

// Get email settings
router.get('/email', protectRoute, SettingsController.getEmailSettingsController);

// Update email settings
router.put('/email', protectRoute, SettingsController.updateEmailSettingsController);

// Test email settings
router.post('/email/test', protectRoute, SettingsController.testEmailSettingsController);

// =====================================================
// SECURITY SETTINGS ROUTES
// =====================================================

// Get security settings
router.get('/security', protectRoute, SettingsController.getSecuritySettingsController);

// Update security settings
router.put('/security', protectRoute, SettingsController.updateSecuritySettingsController);

// Reset security settings to defaults
router.post('/security/reset', protectRoute, SettingsController.resetSecuritySettingsController);

// Upload file (documents, images, etc.)
// Upload school logo
router.post('/upload/logo', 
  protectRoute, 
  uploadSchoolLogo,
  handleMulterError,
  SettingsController.uploadFileController
);

// Upload favicon
router.post('/upload/favicon', 
  protectRoute, 
  uploadFavicon,
  handleMulterError,
  SettingsController.uploadFaviconController
);

// Upload general files
router.post('/upload', 
  protectRoute, 
  uploadDocument,
  handleMulterError,
  SettingsController.uploadFileController
);

// Create file upload record
router.post('/files', protectRoute, SettingsController.createFileUploadController);

// Get all file uploads with pagination and filters
router.get('/files', protectRoute, SettingsController.getAllFileUploadsController);

// Get file upload by ID
router.get('/files/:id', protectRoute, SettingsController.getFileUploadByIdController);

// Get file upload by file name
router.get('/files/filename/:fileName', protectRoute, SettingsController.getFileUploadByFileNameController);

// Update file upload
router.put('/files/:id', protectRoute, SettingsController.updateFileUploadController);

// Delete file upload
router.delete('/files/:id', protectRoute, SettingsController.deleteFileUploadController);

// Download file
router.get('/files/:id/download', protectRoute, SettingsController.downloadFileController);

// =====================================================
// FILE UPLOAD UTILITY ROUTES
// =====================================================

// Get file uploads by category
router.get('/files/category/:category', protectRoute, SettingsController.getFileUploadsByCategoryController);

// Get file uploads by user
router.get('/files/user/:userId', protectRoute, SettingsController.getFileUploadsByUserController);

// Get file upload statistics
router.get('/files/stats/overview', protectRoute, SettingsController.getFileUploadStatsController);

// Get recent file uploads
router.get('/files/recent/list', protectRoute, SettingsController.getRecentFileUploadsController);

// Get file categories
router.get('/files/categories/list', protectRoute, SettingsController.getFileCategoriesController);

// Get file types
router.get('/files/types/list', protectRoute, SettingsController.getFileTypesController);

// Check if file exists
router.get('/files/check/:fileName', protectRoute, SettingsController.checkFileExistsController);

// Get storage usage by category
router.get('/files/storage/usage', protectRoute, SettingsController.getStorageUsageByCategoryController);

// =====================================================
// SETTINGS DASHBOARD ROUTES
// =====================================================

// Get settings dashboard data
router.get('/dashboard/overview', protectRoute, SettingsController.getSettingsDashboardController);

module.exports = router;
