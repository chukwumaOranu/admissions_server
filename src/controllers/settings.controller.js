const {
  upsertSchoolSettings,
  findSchoolSettings,
  getSchoolSetting,
  updateSchoolSetting,
  resetSchoolSettings,
  findSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  findEmailSettings,
  updateEmailSettings,
  testEmailSettings,
  findSecuritySettings,
  updateSecuritySettings,
  resetSecuritySettings,
  createFileUpload,
  findFileUploadById,
  findFileUploadByFileName,
  findAllFileUploads,
  updateFileUpload,
  deleteFileUpload,
  findFileUploadsByCategory,
  findFileUploadsByUser,
  getFileUploadStats,
  getRecentFileUploads,
  getFileCategories,
  getFileTypes,
  checkFileExists,
  getStorageUsageByCategory
} = require('../models/settings-upload.model');

const emailService = require('../utils/emailService');

// =====================================================
// SCHOOL SETTINGS CONTROLLER FUNCTIONS
// =====================================================

// Create or update school settings
const upsertSchoolSettingsController = async (req, res) => {
  try {
    const {
      school_name,
      school_logo,
      school_address,
      school_phone,
      school_email,
      school_website,
      school_motto,
      school_mission,
      school_vision,
      academic_year,
      application_fee,
      currency,
      timezone,
      date_format,
      time_format,
      language,
      theme_color,
      custom_settings
    } = req.body;

    const updated_by = req.user.id;

    // Validate required fields
    if (!school_name) {
      return res.status(400).json({
        success: false,
        message: 'School name is required'
      });
    }

    // Upsert settings
    const settings = await upsertSchoolSettings({
      school_name,
      school_logo,
      school_address,
      school_phone,
      school_email,
      school_website,
      school_motto,
      school_mission,
      school_vision,
      academic_year,
      application_fee,
      currency,
      timezone,
      date_format,
      time_format,
      language,
      theme_color,
      custom_settings,
      updated_by
    });

    res.status(200).json({
      success: true,
      message: 'School settings saved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error upserting school settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get school settings
const getSchoolSettingsController = async (req, res) => {
  try {
    const settings = await findSchoolSettings();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'School settings not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'School settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error fetching school settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get specific school setting
const getSchoolSettingController = async (req, res) => {
  try {
    const { settingKey } = req.params;

    const settingValue = await getSchoolSetting(settingKey);

    res.status(200).json({
      success: true,
      message: 'School setting retrieved successfully',
      data: {
        key: settingKey,
        value: settingValue
      }
    });

  } catch (error) {
    console.error('Error fetching school setting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update specific school setting
const updateSchoolSettingController = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { value } = req.body;
    const updated_by = req.user.id;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }

    // Update setting
    const settings = await updateSchoolSetting(settingKey, value, updated_by);

    res.status(200).json({
      success: true,
      message: 'School setting updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error updating school setting:', error);
    res.status(500).json({
      success: false,
        message: 'Internal server error',
        error: error.message
    });
  }
};

// Reset school settings
const resetSchoolSettingsController = async (req, res) => {
  try {
    const reset_by = req.user.id;

    const defaultSettings = await resetSchoolSettings(reset_by);

    res.status(200).json({
      success: true,
      message: 'School settings reset to defaults successfully',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Error resetting school settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// =====================================================
// SYSTEM SETTINGS CONTROLLER FUNCTIONS
// =====================================================

// Get system settings
const getSystemSettingsController = async (req, res) => {
  try {
    let settings = await findSystemSettings();

    // If no settings exist, return default empty settings instead of 404
    if (!settings) {
      settings = {
        max_login_attempts: 5,
        lockout_duration: 15,
        password_min_length: 8,
        password_require_uppercase: false,
        password_require_lowercase: true,
        password_require_numbers: true,
        password_require_symbols: false,
        session_timeout: 60,
        enable_2fa: false,
        require_strong_password: false,
        auto_logout_enabled: false,
        maintenance_mode: false,
        maintenance_message: '',
        max_upload_size: 5242880,
        allowed_file_types: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
        enable_notifications: true,
        custom_settings: {}
      };
    }

    res.status(200).json({
      success: true,
      message: 'System settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update system settings
const updateSystemSettingsController = async (req, res) => {
  try {
    const settingsData = req.body;
    const updated_by = req.user.id;

    const settings = await updateSystemSettings({
      ...settingsData,
      updated_by
    });

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Reset system settings to defaults
const resetSystemSettingsController = async (req, res) => {
  try {
    const reset_by = req.user.id;

    const defaultSettings = await resetSystemSettings(reset_by);

    res.status(200).json({
      success: true,
      message: 'System settings reset to defaults successfully',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Error resetting system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// =====================================================
// EMAIL SETTINGS CONTROLLER FUNCTIONS
// =====================================================

// Get email settings
const getEmailSettingsController = async (req, res) => {
  try {
    let settings = await findEmailSettings();

    // If no settings exist, return default empty settings instead of 404
    if (!settings) {
      settings = {
        smtp_host: '',
        smtp_port: 465,
        smtp_secure: false,
        smtp_username: '',
        smtp_password: '',
        from_name: '',
        from_email: '',
        reply_to_email: '',
        test_email: '',
        email_verification_enabled: false,
        welcome_email_enabled: false,
        notification_email_enabled: false,
        email_templates: {},
        custom_settings: {}
      };
    }

    res.status(200).json({
      success: true,
      message: 'Email settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update email settings
const updateEmailSettingsController = async (req, res) => {
  try {
    const settingsData = req.body;
    const updated_by = req.user.id;

    const settings = await updateEmailSettings({
      ...settingsData,
      updated_by
    });

    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Test email settings
const testEmailSettingsController = async (req, res) => {
  try {
    const { test_email, test_message } = req.body;

    if (!test_email) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    // Initialize email service and send test email
    await emailService.initialize();
    const emailResult = await emailService.sendTestEmail(test_email, test_message);

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          test_email,
          message_id: emailResult.messageId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error testing email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// =====================================================
// SECURITY SETTINGS CONTROLLER FUNCTIONS
// =====================================================

// Get security settings
const getSecuritySettingsController = async (req, res) => {
  try {
    let settings = await findSecuritySettings();

    // If no settings exist yet, return defaults instead of 404
    if (!settings) {
      settings = {
        password_policy_enabled: true,
        password_min_length: 8,
        password_require_uppercase: true,
        password_require_lowercase: true,
        password_require_numbers: true,
        password_require_symbols: false,
        password_expiry_days: 90,
        max_login_attempts: 5,
        lockout_duration_minutes: 30,
        session_timeout_minutes: 60,
        two_factor_enabled: false,
        two_factor_method: 'email',
        ip_whitelist_enabled: false,
        ip_whitelist: [],
        ip_blacklist_enabled: false,
        ip_blacklist: [],
        audit_log_enabled: true,
        audit_log_retention_days: 365,
        ssl_enforced: true,
        csrf_protection_enabled: true,
        xss_protection_enabled: true,
        custom_settings: {}
      };
    }

    res.status(200).json({
      success: true,
      message: 'Security settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update security settings
const updateSecuritySettingsController = async (req, res) => {
  try {
    const settingsData = req.body;
    const updated_by = req.user.id;

    const settings = await updateSecuritySettings({
      ...settingsData,
      updated_by
    });

    res.status(200).json({
      success: true,
      message: 'Security settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Reset security settings to defaults
const resetSecuritySettingsController = async (req, res) => {
  try {
    const reset_by = req.user.id;

    const defaultSettings = await resetSecuritySettings(reset_by);

    res.status(200).json({
      success: true,
      message: 'Security settings reset to defaults successfully',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Error resetting security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create new file upload record
const createFileUploadController = async (req, res) => {
  try {
    const {
      original_name,
      file_name,
      file_path,
      file_size,
      file_type,
      mime_type,
      file_category,
      description,
      metadata
    } = req.body;

    const uploaded_by = req.user.id;

    // Validate required fields
    if (!original_name || !file_name || !file_path || !file_size || !file_type || !mime_type || !file_category) {
      return res.status(400).json({
        success: false,
        message: 'Original name, file name, file path, file size, file type, mime type, and file category are required'
      });
    }

    // Create file upload record
    const fileUpload = await createFileUpload({
      original_name,
      file_name,
      file_path,
      file_size,
      file_type,
      mime_type,
      file_category,
      uploaded_by,
      description,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'File upload record created successfully',
      data: fileUpload
    });

  } catch (error) {
    console.error('Error creating file upload record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all file uploads with pagination and filters
const getAllFileUploadsController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      file_category = null,
      file_type = null,
      uploaded_by = null
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      file_category,
      file_type,
      uploaded_by
    };

    const result = await findAllFileUploads(options);

    res.status(200).json({
      success: true,
      message: 'File uploads retrieved successfully',
      data: result.fileUploads,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching file uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file upload by ID
const getFileUploadByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const fileUpload = await findFileUploadById(id);
    if (!fileUpload) {
      return res.status(404).json({
        success: false,
        message: 'File upload not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'File upload retrieved successfully',
      data: fileUpload
    });

  } catch (error) {
    console.error('Error fetching file upload:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file upload by file name
const getFileUploadByFileNameController = async (req, res) => {
  try {
    const { fileName } = req.params;

    const fileUpload = await findFileUploadByFileName(fileName);
    if (!fileUpload) {
      return res.status(404).json({
        success: false,
        message: 'File upload not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'File upload retrieved successfully',
      data: fileUpload
    });

  } catch (error) {
    console.error('Error fetching file upload:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update file upload
const updateFileUploadController = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, metadata } = req.body;

    // Check if file upload exists
    const existingFileUpload = await findFileUploadById(id);
    if (!existingFileUpload) {
      return res.status(404).json({
        success: false,
        message: 'File upload not found'
      });
    }

    // Update file upload
    const updatedFileUpload = await updateFileUpload(id, {
      description,
      metadata
    });

    res.status(200).json({
      success: true,
      message: 'File upload updated successfully',
      data: updatedFileUpload
    });

  } catch (error) {
    console.error('Error updating file upload:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete file upload
const deleteFileUploadController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if file upload exists
    const existingFileUpload = await findFileUploadById(id);
    if (!existingFileUpload) {
      return res.status(404).json({
        success: false,
        message: 'File upload not found'
      });
    }

    // Delete file upload
    await deleteFileUpload(id);

    res.status(200).json({
      success: true,
      message: 'File upload deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file upload:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file uploads by category
const getFileUploadsByCategoryController = async (req, res) => {
  try {
    const { category } = req.params;

    const fileUploads = await findFileUploadsByCategory(category);

    res.status(200).json({
      success: true,
      message: 'File uploads retrieved successfully',
      data: fileUploads
    });

  } catch (error) {
    console.error('Error fetching file uploads by category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file uploads by user
const getFileUploadsByUserController = async (req, res) => {
  try {
    const { userId } = req.params;

    const fileUploads = await findFileUploadsByUser(userId);

    res.status(200).json({
      success: true,
      message: 'File uploads retrieved successfully',
      data: fileUploads
    });

  } catch (error) {
    console.error('Error fetching file uploads by user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file upload statistics
const getFileUploadStatsController = async (req, res) => {
  try {
    const stats = await getFileUploadStats();

    res.status(200).json({
      success: true,
      message: 'File upload statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching file upload statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get recent file uploads
const getRecentFileUploadsController = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const fileUploads = await getRecentFileUploads(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Recent file uploads retrieved successfully',
      data: fileUploads
    });

  } catch (error) {
    console.error('Error fetching recent file uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file categories
const getFileCategoriesController = async (req, res) => {
  try {
    const categories = await getFileCategories();

    res.status(200).json({
      success: true,
      message: 'File categories retrieved successfully',
      data: categories
    });

  } catch (error) {
    console.error('Error fetching file categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file types
const getFileTypesController = async (req, res) => {
  try {
    const fileTypes = await getFileTypes();

    res.status(200).json({
      success: true,
      message: 'File types retrieved successfully',
      data: fileTypes
    });

  } catch (error) {
    console.error('Error fetching file types:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if file exists
const checkFileExistsController = async (req, res) => {
  try {
    const { fileName } = req.params;

    const exists = await checkFileExists(fileName);

    res.status(200).json({
      success: true,
      message: 'File existence check completed',
      data: { exists }
    });

  } catch (error) {
    console.error('Error checking file existence:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get storage usage by category
const getStorageUsageByCategoryController = async (req, res) => {
  try {
    const usage = await getStorageUsageByCategory();

    res.status(200).json({
      success: true,
      message: 'Storage usage by category retrieved successfully',
      data: usage
    });

  } catch (error) {
    console.error('Error fetching storage usage by category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload favicon
const uploadFaviconController = async (req, res) => {
  try {
    console.log('📤 Favicon upload request received');
    console.log('📤 Request file:', req.file);
    console.log('📤 Request body:', req.body);
    console.log('📤 Request user:', req.user);
    
    if (!req.file) {
      console.log('❌ No favicon file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No favicon file uploaded'
      });
    }

    const uploaded_by = req.user.id;

    // Create file upload record for favicon
    const fileUpload = await createFileUpload({
      original_name: req.file.originalname,
      file_name: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type: req.file.mimetype.split('/')[0],
      mime_type: req.file.mimetype,
      file_category: 'favicon',
      uploaded_by,
      description: 'School favicon'
    });

    // Update school settings with favicon path
    const faviconPath = req.file.path.replace('./uploads/', '');
    await upsertSchoolSettings({
      school_favicon: faviconPath,
      updated_by: uploaded_by
    });

    res.status(201).json({
      success: true,
      message: 'Favicon uploaded and updated successfully',
      data: {
        fileUpload,
        favicon: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          url: `/uploads/school/${req.file.filename}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Favicon upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload favicon',
      error: error.message
    });
  }
};

// Upload file
const uploadFileController = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('📤 Request file:', req.file);
    console.log('📤 Request body:', req.body);
    console.log('📤 Request user:', req.user);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { file_category, description } = req.body;
    const uploaded_by = req.user.id;

    // Create file upload record
    const fileUpload = await createFileUpload({
      original_name: req.file.originalname,
      file_name: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type: req.file.mimetype.split('/')[0],
      mime_type: req.file.mimetype,
      file_category: file_category || 'general',
      uploaded_by,
      description
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUpload,
        file: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        }
      }
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Download file
const downloadFileController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file upload record
    const fileUpload = await findFileUploadById(id);
    if (!fileUpload) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file exists on disk
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(fileUpload.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileUpload.original_name}"`);
    res.setHeader('Content-Type', fileUpload.mime_type);
    
    // Stream the file
    const fileStream = fs.createReadStream(fileUpload.file_path);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get settings dashboard data
const getSettingsDashboardController = async (req, res) => {
  try {
    const [schoolSettings, fileStats, recentUploads, categories] = await Promise.all([
      findSchoolSettings(),
      getFileUploadStats(),
      getRecentFileUploads(5),
      getFileCategories()
    ]);

    res.status(200).json({
      success: true,
      message: 'Settings dashboard data retrieved successfully',
      data: {
        schoolSettings,
        fileStats,
        recentUploads,
        categories
      }
    });

  } catch (error) {
    console.error('Error fetching settings dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  // School Settings functions
  upsertSchoolSettingsController,
  getSchoolSettingsController,
  getSchoolSettingController,
  updateSchoolSettingController,
  resetSchoolSettingsController,
  
  // System Settings functions
  getSystemSettingsController,
  updateSystemSettingsController,
  resetSystemSettingsController,
  
  // Email Settings functions
  getEmailSettingsController,
  updateEmailSettingsController,
  testEmailSettingsController,
  
  // Security Settings functions
  getSecuritySettingsController,
  updateSecuritySettingsController,
  resetSecuritySettingsController,
  
  // File Upload functions
  createFileUploadController,
  getAllFileUploadsController,
  getFileUploadByIdController,
  getFileUploadByFileNameController,
  updateFileUploadController,
  deleteFileUploadController,
  getFileUploadsByCategoryController,
  getFileUploadsByUserController,
  getFileUploadStatsController,
  getRecentFileUploadsController,
  getFileCategoriesController,
  getFileTypesController,
  checkFileExistsController,
  getStorageUsageByCategoryController,
  uploadFileController,
  uploadFaviconController,
  downloadFileController,
  getSettingsDashboardController
};
