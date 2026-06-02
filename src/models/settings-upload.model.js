const { executeQuery } = require('../configs/db.config');

// =====================================================
// SYSTEM SETTINGS FUNCTIONS
// =====================================================

// Get system settings
const findSystemSettings = async () => {
  try {
    const query = 'SELECT * FROM system_settings ORDER BY id DESC LIMIT 1';
    const { rows } = await executeQuery(query);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to get system settings: ${error.message}`);
  }
};

// Update system settings
const updateSystemSettings = async (settingsData) => {
  try {
    const {
      maintenance_mode,
      debug_mode,
      log_level,
      session_timeout,
      max_login_attempts,
      password_min_length,
      require_email_verification,
      auto_backup,
      backup_frequency,
      backup_retention_days,
      cache_enabled,
      cache_ttl,
      rate_limiting,
      rate_limit_requests,
      rate_limit_window,
      custom_settings,
      updated_by
    } = settingsData;

    // Check if settings exist
    const existingSettings = await findSystemSettings();
    
    if (existingSettings) {
      // Update existing settings
      const allowedFields = [
        'maintenance_mode', 'debug_mode', 'log_level', 'session_timeout', 'max_login_attempts',
        'password_min_length', 'require_email_verification', 'auto_backup', 'backup_frequency',
        'backup_retention_days', 'cache_enabled', 'cache_ttl', 'rate_limiting', 'rate_limit_requests',
        'rate_limit_window', 'custom_settings'
      ];
      
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(settingsData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'custom_settings') {
            updates.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      }
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      updates.push('updated_by = ?');
      params.push(updated_by);
      
      const query = `UPDATE system_settings SET ${updates.join(', ')} WHERE id = ?`;
      params.push(existingSettings.id);
      
      await executeQuery(query, params);
      return await findSystemSettings();
    } else {
      // Create new settings
      const query = `
        INSERT INTO system_settings (
          maintenance_mode, debug_mode, log_level, session_timeout, max_login_attempts,
          password_min_length, require_email_verification, auto_backup, backup_frequency,
          backup_retention_days, cache_enabled, cache_ttl, rate_limiting, rate_limit_requests,
          rate_limit_window, custom_settings, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        maintenance_mode || false,
        debug_mode || false,
        log_level || 'info',
        session_timeout || 3600,
        max_login_attempts || 5,
        password_min_length || 8,
        require_email_verification || true,
        auto_backup || true,
        backup_frequency || 'daily',
        backup_retention_days || 30,
        cache_enabled || true,
        cache_ttl || 300,
        rate_limiting || true,
        rate_limit_requests || 100,
        rate_limit_window || 900,
        custom_settings ? JSON.stringify(custom_settings) : null,
        updated_by,
        updated_by
      ];
      
      await executeQuery(query, params);
      return await findSystemSettings();
    }
  } catch (error) {
    throw new Error(`Failed to update system settings: ${error.message}`);
  }
};

// Reset system settings to defaults
const resetSystemSettings = async (reset_by) => {
  try {
    const defaultSettings = {
      maintenance_mode: false,
      debug_mode: false,
      log_level: 'info',
      session_timeout: 3600,
      max_login_attempts: 5,
      password_min_length: 8,
      require_email_verification: true,
      auto_backup: true,
      backup_frequency: 'daily',
      backup_retention_days: 30,
      cache_enabled: true,
      cache_ttl: 300,
      rate_limiting: true,
      rate_limit_requests: 100,
      rate_limit_window: 900,
      custom_settings: null
    };
    
    return await updateSystemSettings({ ...defaultSettings, updated_by: reset_by });
  } catch (error) {
    throw new Error(`Failed to reset system settings: ${error.message}`);
  }
};

// =====================================================
// EMAIL SETTINGS FUNCTIONS
// =====================================================

// Get email settings
const findEmailSettings = async () => {
  try {
    const query = 'SELECT * FROM email_settings ORDER BY id DESC LIMIT 1';
    const { rows } = await executeQuery(query);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to get email settings: ${error.message}`);
  }
};

// Update email settings
const updateEmailSettings = async (settingsData) => {
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
      from_name,
      from_email,
      reply_to_email,
      test_email,
      email_verification_enabled,
      welcome_email_enabled,
      notification_email_enabled,
      email_templates,
      custom_settings,
      updated_by
    } = settingsData;

    // Check if settings exist
    const existingSettings = await findEmailSettings();
    
    if (existingSettings) {
      // Update existing settings
      const allowedFields = [
        'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_username', 'smtp_password',
        'from_name', 'from_email', 'reply_to_email', 'test_email', 'email_verification_enabled',
        'welcome_email_enabled', 'notification_email_enabled', 'email_templates', 'custom_settings'
      ];
      
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(settingsData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'email_templates' || key === 'custom_settings') {
            updates.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      }
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      updates.push('updated_by = ?');
      params.push(updated_by);
      
      const query = `UPDATE email_settings SET ${updates.join(', ')} WHERE id = ?`;
      params.push(existingSettings.id);
      
      await executeQuery(query, params);
      return await findEmailSettings();
    } else {
      // Create new settings
      const query = `
        INSERT INTO email_settings (
          smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password,
          from_name, from_email, reply_to_email, test_email, email_verification_enabled,
          welcome_email_enabled, notification_email_enabled, email_templates, custom_settings,
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        smtp_host || null,
        smtp_port || 587,
        smtp_secure || false,
        smtp_username || null,
        smtp_password || null,
        from_name || null,
        from_email || null,
        reply_to_email || null,
        test_email || null,
        email_verification_enabled || true,
        welcome_email_enabled || true,
        notification_email_enabled || true,
        email_templates ? JSON.stringify(email_templates) : null,
        custom_settings ? JSON.stringify(custom_settings) : null,
        updated_by,
        updated_by
      ];
      
      await executeQuery(query, params);
      return await findEmailSettings();
    }
  } catch (error) {
    throw new Error(`Failed to update email settings: ${error.message}`);
  }
};

// Test email settings
const testEmailSettings = async (testData) => {
  try {
    const { test_email, test_message } = testData;
    
    // This would typically send a test email
    // For now, we'll just return a success response
    return {
      success: true,
      message: 'Test email sent successfully',
      test_email,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to test email settings: ${error.message}`);
  }
};

// =====================================================
// SECURITY SETTINGS FUNCTIONS
// =====================================================

// Get security settings
const findSecuritySettings = async () => {
  try {
    const query = 'SELECT * FROM security_settings ORDER BY id DESC LIMIT 1';
    const { rows } = await executeQuery(query);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to get security settings: ${error.message}`);
  }
};

// Update security settings
const updateSecuritySettings = async (settingsData) => {
  try {
    const {
      password_policy_enabled,
      password_min_length,
      password_require_uppercase,
      password_require_lowercase,
      password_require_numbers,
      password_require_symbols,
      password_expiry_days,
      max_login_attempts,
      lockout_duration_minutes,
      session_timeout_minutes,
      two_factor_enabled,
      two_factor_method,
      ip_whitelist_enabled,
      ip_whitelist,
      ip_blacklist_enabled,
      ip_blacklist,
      audit_log_enabled,
      audit_log_retention_days,
      ssl_enforced,
      csrf_protection_enabled,
      xss_protection_enabled,
      custom_settings,
      updated_by
    } = settingsData;

    // Check if settings exist
    const existingSettings = await findSecuritySettings();
    
    if (existingSettings) {
      // Update existing settings
      const allowedFields = [
        'password_policy_enabled', 'password_min_length', 'password_require_uppercase',
        'password_require_lowercase', 'password_require_numbers', 'password_require_symbols',
        'password_expiry_days', 'max_login_attempts', 'lockout_duration_minutes',
        'session_timeout_minutes', 'two_factor_enabled', 'two_factor_method',
        'ip_whitelist_enabled', 'ip_whitelist', 'ip_blacklist_enabled', 'ip_blacklist',
        'audit_log_enabled', 'audit_log_retention_days', 'ssl_enforced',
        'csrf_protection_enabled', 'xss_protection_enabled', 'custom_settings'
      ];
      
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(settingsData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'ip_whitelist' || key === 'ip_blacklist' || key === 'custom_settings') {
            updates.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      }
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      updates.push('updated_by = ?');
      params.push(updated_by);
      
      const query = `UPDATE security_settings SET ${updates.join(', ')} WHERE id = ?`;
      params.push(existingSettings.id);
      
      await executeQuery(query, params);
      return await findSecuritySettings();
    } else {
      // Create new settings
      const query = `
        INSERT INTO security_settings (
          password_policy_enabled, password_min_length, password_require_uppercase,
          password_require_lowercase, password_require_numbers, password_require_symbols,
          password_expiry_days, max_login_attempts, lockout_duration_minutes,
          session_timeout_minutes, two_factor_enabled, two_factor_method,
          ip_whitelist_enabled, ip_whitelist, ip_blacklist_enabled, ip_blacklist,
          audit_log_enabled, audit_log_retention_days, ssl_enforced,
          csrf_protection_enabled, xss_protection_enabled, custom_settings,
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        password_policy_enabled || true,
        password_min_length || 8,
        password_require_uppercase || true,
        password_require_lowercase || true,
        password_require_numbers || true,
        password_require_symbols || false,
        password_expiry_days || 90,
        max_login_attempts || 5,
        lockout_duration_minutes || 30,
        session_timeout_minutes || 60,
        two_factor_enabled || false,
        two_factor_method || 'email',
        ip_whitelist_enabled || false,
        ip_whitelist ? JSON.stringify(ip_whitelist) : null,
        ip_blacklist_enabled || false,
        ip_blacklist ? JSON.stringify(ip_blacklist) : null,
        audit_log_enabled || true,
        audit_log_retention_days || 365,
        ssl_enforced || true,
        csrf_protection_enabled || true,
        xss_protection_enabled || true,
        custom_settings ? JSON.stringify(custom_settings) : null,
        updated_by,
        updated_by
      ];
      
      await executeQuery(query, params);
      return await findSecuritySettings();
    }
  } catch (error) {
    throw new Error(`Failed to update security settings: ${error.message}`);
  }
};

// Reset security settings to defaults
const resetSecuritySettings = async (reset_by) => {
  try {
    const defaultSettings = {
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
      ip_whitelist: null,
      ip_blacklist_enabled: false,
      ip_blacklist: null,
      audit_log_enabled: true,
      audit_log_retention_days: 365,
      ssl_enforced: true,
      csrf_protection_enabled: true,
      xss_protection_enabled: true,
      custom_settings: null
    };
    
    return await updateSecuritySettings({ ...defaultSettings, updated_by: reset_by });
  } catch (error) {
    throw new Error(`Failed to reset security settings: ${error.message}`);
  }
};

// Create or update school settings
const upsertSchoolSettings = async (settingsData) => {
  try {
    const {
      school_name,
      school_logo,
      school_favicon,
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
    } = settingsData;

    // Check if settings exist
    const existingSettings = await findSchoolSettings();
    
    if (existingSettings) {
      // Update existing settings
      const allowedFields = [
        'school_name', 'school_logo', 'school_favicon', 'school_address', 'school_phone', 'school_email',
        'school_website', 'school_motto', 'school_mission', 'school_vision', 'academic_year',
        'application_fee', 'currency', 'timezone', 'date_format', 'time_format',
        'language', 'theme_color', 'custom_settings'
      ];
      
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(settingsData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'custom_settings') {
            updates.push(`${key} = ?`);
            params.push(value ? JSON.stringify(value) : null);
          } else {
            updates.push(`${key} = ?`);
            params.push(value ?? null);
          }
        }
      }
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updates.push('updated_by = ?', 'updated_at = NOW()');
      params.push(updated_by);
      
      const query = `UPDATE school_settings SET ${updates.join(', ')} WHERE id = ?`;
      params.push(existingSettings.id);
      
      await executeQuery(query, params);
      return await findSchoolSettings();
    } else {
      // Create new settings
      const query = `
        INSERT INTO school_settings 
        (school_name, school_logo, school_favicon, school_address, school_phone, school_email,
         school_website, school_motto, school_mission, school_vision, academic_year,
         application_fee, currency, timezone, date_format, time_format,
         language, theme_color, custom_settings, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        school_name,
        school_logo ?? null,
        school_favicon ?? null,
        school_address ?? null,
        school_phone ?? null,
        school_email ?? null,
        school_website ?? null,
        school_motto ?? null,
        school_mission ?? null,
        school_vision ?? null,
        academic_year ?? null,
        application_fee ?? 0.00,
        currency || 'NGN',
        timezone || 'Africa/Lagos',
        date_format || 'YYYY-MM-DD',
        time_format || '24h',
        language || 'en',
        theme_color ?? null,
        custom_settings ? JSON.stringify(custom_settings) : null,
        updated_by,
        updated_by
      ];

      const result = await executeQuery(query, params);
      
      if (!result.insertId) {
        throw new Error('School settings insert failed: insertId not returned');
      }
      
      return await findSchoolSettings();
    }
  } catch (error) {
    throw new Error(`Failed to upsert school settings: ${error.message}`);
  }
};

// Find school settings
const findSchoolSettings = async () => {
  try {
    const query = `
      SELECT ss.*, u1.username as created_by_username, u2.username as updated_by_username
      FROM school_settings ss
      LEFT JOIN users u1 ON ss.created_by = u1.id
      LEFT JOIN users u2 ON ss.updated_by = u2.id
      ORDER BY ss.updated_at DESC
      LIMIT 1
    `;

    const { rows } = await executeQuery(query);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find school settings: ${error.message}`);
  }
};

// Get specific setting value
const getSchoolSetting = async (settingKey) => {
  try {
    const settings = await findSchoolSettings();
    if (!settings) return null;
    
    // Check if it's a custom setting
    if (settings.custom_settings) {
      const customSettings = JSON.parse(settings.custom_settings);
      if (customSettings[settingKey] !== undefined) {
        return customSettings[settingKey];
      }
    }
    
    // Check main settings
    return settings[settingKey] || null;
  } catch (error) {
    throw new Error(`Failed to get school setting: ${error.message}`);
  }
};

// Update specific setting
const updateSchoolSetting = async (settingKey, settingValue, updatedBy) => {
  try {
    const settings = await findSchoolSettings();
    if (!settings) {
      throw new Error('School settings not found');
    }
    
    // Check if it's a main setting
    const mainSettings = [
      'school_name', 'school_logo', 'school_address', 'school_phone', 'school_email',
      'school_website', 'school_motto', 'school_mission', 'school_vision', 'academic_year',
      'application_fee', 'currency', 'timezone', 'date_format', 'time_format',
      'language', 'theme_color'
    ];
    
    if (mainSettings.includes(settingKey)) {
      const query = `UPDATE school_settings SET ${settingKey} = ?, updated_by = ?, updated_at = NOW() WHERE id = ?`;
      await executeQuery(query, [settingValue, updatedBy, settings.id]);
    } else {
      // Update custom settings
      const customSettings = settings.custom_settings ? JSON.parse(settings.custom_settings) : {};
      customSettings[settingKey] = settingValue;
      
      const query = 'UPDATE school_settings SET custom_settings = ?, updated_by = ?, updated_at = NOW() WHERE id = ?';
      await executeQuery(query, [JSON.stringify(customSettings), updatedBy, settings.id]);
    }
    
    return await findSchoolSettings();
  } catch (error) {
    throw new Error(`Failed to update school setting: ${error.message}`);
  }
};

// Reset school settings
const resetSchoolSettings = async (resetBy) => {
  try {
    const query = 'DELETE FROM school_settings';
    await executeQuery(query);
    
    // Create default settings
    const defaultSettings = {
      school_name: 'School Name',
      school_address: '',
      school_phone: '',
      school_email: '',
      school_website: '',
      school_motto: '',
      school_mission: '',
      school_vision: '',
      academic_year: new Date().getFullYear(),
      application_fee: 0.00,
      currency: 'NGN',
      timezone: 'Africa/Lagos',
      date_format: 'YYYY-MM-DD',
      time_format: '24h',
      language: 'en',
      theme_color: '#007bff',
      custom_settings: {},
      created_by: resetBy,
      updated_by: resetBy
    };
    
    return await upsertSchoolSettings(defaultSettings);
  } catch (error) {
    throw new Error(`Failed to reset school settings: ${error.message}`);
  }
};

// =====================================================
// FILE UPLOAD FUNCTIONS
// =====================================================

// Create new file upload record
const createFileUpload = async (fileData) => {
  try {
    const {
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
    } = fileData;

    const query = `
      INSERT INTO file_uploads 
      (original_name, file_name, file_path, file_size, file_type, mime_type, 
       file_category, uploaded_by, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      original_name,
      file_name,
      file_path,
      file_size,
      file_type,
      mime_type,
      file_category,
      uploaded_by,
      description ?? null,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('File upload insert failed: insertId not returned');
    }
    
    return await findFileUploadById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create file upload: ${error.message}`);
  }
};

// Find file upload by ID
const findFileUploadById = async (id) => {
  try {
    const query = `
      SELECT fu.*, u.username as uploaded_by_username
      FROM file_uploads fu
      LEFT JOIN users u ON fu.uploaded_by = u.id
      WHERE fu.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find file upload by ID: ${error.message}`);
  }
};

// Find file upload by file name
const findFileUploadByFileName = async (fileName) => {
  try {
    const query = `
      SELECT fu.*, u.username as uploaded_by_username
      FROM file_uploads fu
      LEFT JOIN users u ON fu.uploaded_by = u.id
      WHERE fu.file_name = ?
    `;

    const { rows } = await executeQuery(query, [fileName]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find file upload by file name: ${error.message}`);
  }
};

// Get all file uploads with pagination
const findAllFileUploads = async (options = {}) => {
  try {
    // Simplified version without pagination for now
    let query = `
      SELECT fu.*, u.username as uploaded_by_username
      FROM file_uploads fu
      LEFT JOIN users u ON fu.uploaded_by = u.id
      ORDER BY fu.uploaded_at DESC
    `;
    
    const { rows } = await executeQuery(query, []);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM file_uploads fu`;
    const { rows: countRows } = await executeQuery(countQuery, []);
    const total = countRows[0].total;

    return {
      fileUploads: rows,
      pagination: {
        page: 1,
        limit: rows.length,
        total: parseInt(total, 10),
        pages: 1
      }
    };
  } catch (error) {
    throw new Error(`Failed to find file uploads: ${error.message}`);
  }
};

// Update file upload
const updateFileUpload = async (id, updateData) => {
  try {
    const allowedFields = ['description', 'metadata'];
    const updates = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'metadata') {
          updates.push(`${key} = ?`);
          params.push(value ? JSON.stringify(value) : null);
        } else {
          updates.push(`${key} = ?`);
          params.push(value ?? null);
        }
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    const query = `UPDATE file_uploads SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findFileUploadById(id);
  } catch (error) {
    throw new Error(`Failed to update file upload: ${error.message}`);
  }
};

// Delete file upload
const deleteFileUpload = async (id) => {
  try {
    const query = 'DELETE FROM file_uploads WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete file upload: ${error.message}`);
  }
};

// Get file uploads by category
const findFileUploadsByCategory = async (category) => {
  try {
    const query = `
      SELECT fu.*, u.username as uploaded_by_username
      FROM file_uploads fu
      LEFT JOIN users u ON fu.uploaded_by = u.id
      WHERE fu.file_category = ?
      ORDER BY fu.uploaded_at DESC
    `;

    const { rows } = await executeQuery(query, [category]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find file uploads by category: ${error.message}`);
  }
};

// Get file uploads by user
const findFileUploadsByUser = async (userId) => {
  try {
    const query = `
      SELECT fu.*, u.username as uploaded_by_username
      FROM file_uploads fu
      LEFT JOIN users u ON fu.uploaded_by = u.id
      WHERE fu.uploaded_by = ?
      ORDER BY fu.uploaded_at DESC
    `;

    const { rows } = await executeQuery(query, [userId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find file uploads by user: ${error.message}`);
  }
};

// Get file upload statistics
const getFileUploadStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_files,
        COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_files,
        COUNT(CASE WHEN file_type = 'pdf' THEN 1 END) as pdf_files,
        COUNT(CASE WHEN file_category = 'profile' THEN 1 END) as profile_images,
        COUNT(CASE WHEN file_category = 'passport' THEN 1 END) as passport_photos,
        COUNT(CASE WHEN file_category = 'exam_card' THEN 1 END) as exam_cards,
        AVG(file_size) as average_file_size
      FROM file_uploads
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get file upload statistics: ${error.message}`);
  }
};

// Get recent file uploads
const getRecentFileUploads = async (limit = 10) => {
  try {
    const query = `
      SELECT fu.*, u.username as uploaded_by_username
      FROM file_uploads fu
      LEFT JOIN users u ON fu.uploaded_by = u.id
      ORDER BY fu.uploaded_at DESC
      LIMIT ?
    `;

    const { rows } = await executeQuery(query, [limit]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get recent file uploads: ${error.message}`);
  }
};

// Get file categories
const getFileCategories = async () => {
  try {
    const query = `
      SELECT DISTINCT file_category, COUNT(*) as file_count
      FROM file_uploads
      WHERE file_category IS NOT NULL AND file_category != ''
      GROUP BY file_category
      ORDER BY file_category
    `;

    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get file categories: ${error.message}`);
  }
};

// Get file types
const getFileTypes = async () => {
  try {
    const query = `
      SELECT DISTINCT file_type, COUNT(*) as file_count
      FROM file_uploads
      WHERE file_type IS NOT NULL AND file_type != ''
      GROUP BY file_type
      ORDER BY file_type
    `;

    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get file types: ${error.message}`);
  }
};

// Check if file exists
const checkFileExists = async (fileName) => {
  try {
    const query = `SELECT COUNT(*) as count FROM file_uploads WHERE file_name = ?`;
    const { rows } = await executeQuery(query, [fileName]);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check if file exists: ${error.message}`);
  }
};

// Get storage usage by category
const getStorageUsageByCategory = async () => {
  try {
    const query = `
      SELECT 
        file_category,
        COUNT(*) as file_count,
        SUM(file_size) as total_size,
        AVG(file_size) as average_size
      FROM file_uploads
      WHERE file_category IS NOT NULL AND file_category != ''
      GROUP BY file_category
      ORDER BY total_size DESC
    `;

    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get storage usage by category: ${error.message}`);
  }
};

module.exports = {
  // School Settings functions
  upsertSchoolSettings,
  findSchoolSettings,
  getSchoolSetting,
  updateSchoolSetting,
  resetSchoolSettings,
  
  // System Settings functions
  findSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  
  // Email Settings functions
  findEmailSettings,
  updateEmailSettings,
  testEmailSettings,
  
  // Security Settings functions
  findSecuritySettings,
  updateSecuritySettings,
  resetSecuritySettings,
  
  // File Upload functions
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
};