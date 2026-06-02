const {
  generateStudentId,
  createStudent,
  findStudentById,
  findStudentByStudentId,
  findStudentByEmail,
  findStudentByUserId,
  getAllStudentsSimple,
  updateStudent,
  deleteStudent,
  checkStudentIdExists,
  checkStudentEmailExists,
  getStudentStats,
  checkEmailExistsInUsers,
  getRoleIdByName,
  updateStudentUserId,
  findStudentsWithLoginCredentials
} = require('../models/student.model');

const { createUserFromEmployee } = require('../utils/userCredentials.utils');
const { processProfilePhoto, deletePhotoFile } = require('../utils/imageProcessor.utils');
const emailService = require('../utils/emailService');
const csv = require('csv-parser');
const fs = require('fs');
const {
  getSchemaFields,
  findStudentSchemaById,
  getAllStudentSchemasSimple
} = require('../models/studentSchema.model');

// =====================================================
// STUDENT CONTROLLER FUNCTIONS
// =====================================================

const parseFieldOptions = (fieldOptions) => {
  if (!fieldOptions) return [];

  if (Array.isArray(fieldOptions)) return fieldOptions.map(String);

  if (typeof fieldOptions === 'string') {
    const trimmed = fieldOptions.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (_) {
      // fall through to CSV-like parsing
    }

    return trimmed.split(',').map((option) => option.trim()).filter(Boolean);
  }

  return [];
};

const normalizeCustomData = (customData) => {
  if (!customData) return {};

  if (typeof customData === 'object' && !Array.isArray(customData)) {
    return customData;
  }

  if (typeof customData === 'string') {
    try {
      const parsed = JSON.parse(customData);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      return {};
    }
  }

  return {};
};

const validateSchemaFields = (schemaFields, customData) => {
  for (const field of schemaFields) {
    const value = customData[field.field_name];
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    const hasValue = !(normalizedValue === undefined || normalizedValue === null || normalizedValue === '');

    if (field.is_required && !hasValue) {
      return `${field.field_label || field.field_name} is required`;
    }

    if (!hasValue) {
      continue;
    }

    if (field.field_type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(normalizedValue))) {
        return `${field.field_label || field.field_name} must be a valid email`;
      }
    }

    if (field.field_type === 'number' && Number.isNaN(Number(normalizedValue))) {
      return `${field.field_label || field.field_name} must be a valid number`;
    }

    if (field.field_type === 'select' || field.field_type === 'radio') {
      const options = parseFieldOptions(field.field_options);
      if (options.length > 0 && !options.includes(String(normalizedValue))) {
        return `${field.field_label || field.field_name} must be one of: ${options.join(', ')}`;
      }
    }
  }

  return null;
};

/**
 * Generate next student ID
 */
const generateStudentIdController = async (req, res) => {
  try {
    const studentId = await generateStudentId();
    
    res.status(200).json({
      success: true,
      message: 'Student ID generated successfully',
      data: { student_id: studentId }
    });
  } catch (error) {
    console.error('Error generating student ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student ID',
      error: error.message
    });
  }
};

/**
 * Create new student
 */
const createStudentController = async (req, res) => {
  try {
    const {
      schema_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      country,
      postal_code,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_relationship,
      previous_school,
      graduation_year,
      profile_photo,
      status,
      custom_data,
      // User account creation options
      create_user_account = false,
      send_welcome_email = false
    } = req.body;

    const created_by = req.user.id;

    // Validate required fields
    if (!schema_id || !first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Schema ID, first name, last name, and email are required'
      });
    }

    // Check if email already exists in students table
    const emailExists = await checkStudentEmailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists in students table'
      });
    }

    // Check if email already exists in users table (if creating user account)
    if (create_user_account && email) {
      const emailExistsInUsers = await checkEmailExistsInUsers(email);
      if (emailExistsInUsers) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in users table'
        });
      }
    }

    // Auto-generate student ID
    const student_id = await generateStudentId();

    let userCredentials = null;
    let userId = null;

    // Create user account if requested
    if (create_user_account) {
      try {
        // Get "Student" role ID
        const studentRoleId = await getRoleIdByName('Student');
        
        userCredentials = await createUserFromEmployee(
          { first_name, last_name, email },
          { useDefaultPassword: false, role_id: studentRoleId }
        );
        userId = userCredentials.userId;
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account',
          error: error.message
        });
      }
    }

    // Create student with user_id link
    const studentData = {
      student_id,
      schema_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      country,
      postal_code,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_relationship,
      previous_school,
      graduation_year,
      user_id: userId,
      profile_photo,
      status: status || 'active',
      custom_data,
      welcome_email_sent: send_welcome_email && create_user_account,
      welcome_email_sent_at: send_welcome_email && create_user_account ? new Date() : null,
      created_by
    };

    const student = await createStudent(studentData);

    // Send welcome email if requested and user account was created
    let emailResult = null;
    if (send_welcome_email && create_user_account && email) {
      try {
        await emailService.initialize();
        emailResult = await emailService.sendWelcomeEmailToStudent(
          { email, first_name, last_name, student_id },
          { username: userCredentials.username, password: userCredentials.password }
        );
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to student:', email);
        } else {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        emailResult = { success: false, error: error.message };
      }
    }

    // Prepare response
    const responseData = {
      student,
      userAccount: create_user_account ? {
        created: true,
        username: userCredentials.username,
        password: userCredentials.password, // ONLY SHOWN ONCE!
        email: userCredentials.email,
        passwordMustChange: true
      } : {
        created: false
      },
      emailSent: emailResult ? {
        success: emailResult.success,
        message: emailResult.success ? 'Welcome email sent successfully' : emailResult.error
      } : null
    };

    res.status(201).json({
      success: true,
      message: create_user_account 
        ? 'Student and user account created successfully' 
        : 'Student created successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message
    });
  }
};

/**
 * Public endpoint: list active student schemas with fields
 */
const getPublicStudentSchemasController = async (req, res) => {
  try {
    const schemas = await getAllStudentSchemasSimple();
    const schemasWithFields = await Promise.all(
      schemas.map(async (schema) => {
        const fields = await getSchemaFields(schema.id);
        return {
          id: schema.id,
          schema_name: schema.schema_name,
          display_name: schema.display_name,
          description: schema.description,
          fields: fields.map((field) => ({
            id: field.id,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: parseFieldOptions(field.field_options),
            is_required: !!field.is_required,
            field_order: field.field_order,
            help_text: field.help_text
          }))
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Public student schemas retrieved successfully',
      data: {
        schemas: schemasWithFields
      }
    });
  } catch (error) {
    console.error('Error fetching public student schemas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student schemas',
      error: error.message
    });
  }
};

/**
 * Public endpoint: student self-registration (no login required)
 * Inserts directly into students table using existing student creation flow.
 */
const createPublicStudentRegistrationController = async (req, res) => {
  try {
    const {
      schema_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      country,
      postal_code,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_relationship,
      previous_school,
      graduation_year,
      custom_data
    } = req.body;

    if (!schema_id || !first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Schema ID, first name, last name, and email are required'
      });
    }

    const schema = await findStudentSchemaById(schema_id);
    if (!schema) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive student schema'
      });
    }

    const emailExists = await checkStudentEmailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'A student with this email already exists'
      });
    }

    const emailExistsInUsers = await checkEmailExistsInUsers(email);
    if (emailExistsInUsers) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this email already exists'
      });
    }

    const normalizedCustomData = normalizeCustomData(custom_data);
    const schemaFields = await getSchemaFields(schema_id);
    const customValidationError = validateSchemaFields(schemaFields, normalizedCustomData);

    if (customValidationError) {
      return res.status(400).json({
        success: false,
        message: customValidationError
      });
    }

    const student_id = await generateStudentId();
    const studentRoleId = await getRoleIdByName('Student');
    const userCredentials = await createUserFromEmployee(
      { first_name, last_name, email },
      { useDefaultPassword: false, role_id: studentRoleId }
    );

    const registrationMeta = {
      source: 'public_student_registration',
      submitted_at: new Date().toISOString(),
      submitted_ip: req.ip || null,
      user_agent: req.get('user-agent') || null
    };

    const student = await createStudent({
      student_id,
      schema_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      country,
      postal_code,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_relationship,
      previous_school,
      graduation_year,
      user_id: userCredentials.userId,
      profile_photo: null,
      status: 'inactive',
      custom_data: {
        ...normalizedCustomData,
        _public_registration: registrationMeta
      },
      welcome_email_sent: false,
      welcome_email_sent_at: null,
      created_by: null
    });

    if (email) {
      setImmediate(async () => {
        try {
          const initialized = await emailService.initialize();
          if (!initialized) {
            console.warn('⚠️ Registration received, but email service is not available.');
            return;
          }

          const emailResult = await emailService.sendPublicRegistrationReceivedEmail({
            email,
            first_name,
            last_name,
            student_id: student.student_id,
            schema_display_name: schema.display_name || schema.schema_name
          });

          if (!emailResult.success) {
            console.warn('⚠️ Failed to send registration acknowledgement email:', emailResult.error || emailResult.message);
          }
        } catch (emailError) {
          console.error('❌ Error sending registration acknowledgement email:', emailError.message);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Login account has been created and will be activated/communicated by the school admin.',
      data: {
        student_id: student.student_id,
        status: student.status,
        login_created: true,
        email_queued: !!email
      }
    });
  } catch (error) {
    console.error('Error creating public student registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit registration',
      error: error.message
    });
  }
};

/**
 * Get current student's own profile
 * For student portal - students can only view their own data
 */
const getMyProfileController = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    // Find student by user_id
    const student = await findStudentByUserId(userId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found. Please contact administrator.'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: student
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Get all students
 */
const getAllStudentsController = async (req, res) => {
  try {
    const students = await getAllStudentsSimple();

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: {
        students,
        count: students.length
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * Get student by ID
 */
const getStudentByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await findStudentById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student retrieved successfully',
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message
    });
  }
};

/**
 * Update student
 */
const updateStudentController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await updateStudent(id, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or no changes made'
      });
    }

    const student = await findStudentById(id);

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
};

/**
 * Delete student
 */
const deleteStudentController = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteStudent(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message
    });
  }
};

/**
 * Create user login for existing student
 */
const createStudentLoginController = async (req, res) => {
  try {
    const { id } = req.params;
    const { send_welcome_email = false } = req.body;

    // Get student details
    const student = await findStudentById(id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student already has a user account
    if (student.user_id) {
      return res.status(400).json({
        success: false,
        message: 'Student already has a user account'
      });
    }

    // Check if email exists in users table
    const emailExistsInUsers = await checkEmailExistsInUsers(student.email);
    if (emailExistsInUsers) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists in users table'
      });
    }

    // Get "Student" role ID
    const studentRoleId = await getRoleIdByName('Student');
    
    // Create user account with Student role
    const userCredentials = await createUserFromEmployee(
      { 
        first_name: student.first_name, 
        last_name: student.last_name, 
        email: student.email 
      },
      { useDefaultPassword: false, role_id: studentRoleId }
    );

    // Update student with user_id
    await updateStudentUserId(id, userCredentials.userId, send_welcome_email);

    // Get updated student
    const updatedStudent = await findStudentById(id);

    // Send welcome email if requested
    let emailResult = null;
    if (send_welcome_email && student.email) {
      try {
        await emailService.initialize();
        emailResult = await emailService.sendWelcomeEmailToStudent(
          { 
            email: student.email, 
            first_name: student.first_name, 
            last_name: student.last_name, 
            student_id: student.student_id 
          },
          { username: userCredentials.username, password: userCredentials.password }
        );
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to student:', student.email);
        } else {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        emailResult = { success: false, error: error.message };
      }
    }

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        student: updatedStudent,
        userAccount: {
          created: true,
          username: userCredentials.username,
          password: userCredentials.password, // ONLY SHOWN ONCE!
          email: userCredentials.email,
          passwordMustChange: true
        },
        emailSent: emailResult ? {
          success: emailResult.success,
          message: emailResult.success ? 'Welcome email sent successfully' : emailResult.error
        } : null
      }
    });

  } catch (error) {
    console.error('Error creating student login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user account',
      error: error.message
    });
  }
};

/**
 * Get student statistics
 */
const getStudentStatsController = async (req, res) => {
  try {
    const stats = await getStudentStats();

    res.status(200).json({
      success: true,
      message: 'Student statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student statistics',
      error: error.message
    });
  }
};

/**
 * Upload and update student profile photo
 */
const uploadProfilePhotoController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }
    
    // Find student
    const student = await findStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check authorization (student can only upload their own photo)
    if (req.user.id !== student.user_id && req.user.role !== 'Super Admin' && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this photo'
      });
    }
    
    // Process image with Sharp
    const photoUrl = await processProfilePhoto(req.file.path, id);
    
    // Delete old photo if exists
    if (student.profile_photo) {
      deletePhotoFile(student.profile_photo);
    }
    
    // Update database
    await updateStudent(id, { profile_photo: photoUrl });
    
    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profile_photo: photoUrl
      }
    });
    
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
};

/**
 * Delete student profile photo
 */
const deleteProfilePhotoController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find student
    const student = await findStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check authorization
    if (req.user.id !== student.user_id && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this photo'
      });
    }
    
    // Delete photo file
    if (student.profile_photo) {
      deletePhotoFile(student.profile_photo);
    }
    
    // Update database
    await updateStudent(id, { profile_photo: null });
    
    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: error.message
    });
  }
};

/**
 * Bulk create students from CSV with custom fields support
 */
const bulkCreateStudentsController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded'
      });
    }

    const schema_id = req.body.schema_id;
    if (!schema_id) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Schema ID is required'
      });
    }

    // Fetch schema fields for validation
    let schemaFields = [];
    try {
      schemaFields = await getSchemaFields(schema_id);
    } catch (err) {
      console.error('Error fetching schema fields:', err);
    }

    const results = [];
    const errors = [];
    const rows = [];

    // First, read all rows from CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // ✅ Extract default fields
        const defaultFields = {
          schema_id: schema_id,
          first_name: row.first_name,
          last_name: row.last_name,
          middle_name: row.middle_name || null,
          email: row.email,
          phone: row.phone || null,
          date_of_birth: row.date_of_birth || null,
          gender: row.gender || null,
          address: row.address || null,
          city: row.city || null,
          state: row.state || null,
          country: row.country || 'Nigeria',
          postal_code: row.postal_code || null,
          guardian_name: row.guardian_name || null,
          guardian_phone: row.guardian_phone || null,
          guardian_email: row.guardian_email || null,
          guardian_relationship: row.guardian_relationship || null,
          previous_school: row.previous_school || null,
          graduation_year: row.graduation_year || null,
          school_level: row.school_level || null,
          class_level: row.class_level || null
        };

        // Validate required default fields
        if (!defaultFields.first_name || !defaultFields.last_name || !defaultFields.email) {
          throw new Error('Missing required fields: first_name, last_name, or email');
        }

        // Check for duplicate email
        const emailExists = await checkStudentEmailExists(defaultFields.email);
        if (emailExists) {
          throw new Error(`Email already exists: ${defaultFields.email}`);
        }

        // ✅ Extract custom fields (prefixed with cf_)
        const customFields = {};
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('cf_')) {
            const fieldName = key.substring(3); // Remove 'cf_' prefix
            customFields[fieldName] = value || '';
          }
        }

        // ✅ Validate required custom fields
        for (const field of schemaFields) {
          if (field.is_required && !customFields[field.field_name]) {
            throw new Error(`Required custom field missing: ${field.field_label}`);
          }
        }

        // ✅ Store custom fields as JSON
        defaultFields.custom_fields = JSON.stringify(customFields);

        // Create student
        const student = await createStudent(defaultFields);

        // Create user account if requested
        if (row.create_user_account === 'true' || row.create_user_account === '1') {
          try {
            const userAccount = await createUserFromEmployee({
              id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              email: student.email
            }, 'Student', false);

            results.push({
              row: rowNumber,
              status: 'success',
              student_id: student.student_id,
              name: `${student.first_name} ${student.last_name}`,
              user_created: true,
              username: userAccount.username
            });
          } catch (userErr) {
            results.push({
              row: rowNumber,
              status: 'partial',
              student_id: student.student_id,
              name: `${student.first_name} ${student.last_name}`,
              user_created: false,
              warning: 'Student created but user account failed: ' + userErr.message
            });
          }
        } else {
          results.push({
            row: rowNumber,
            status: 'success',
            student_id: student.student_id,
            name: `${student.first_name} ${student.last_name}`,
            user_created: false
          });
        }

      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Import completed',
      data: {
        total: rows.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Error in bulk create students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const sendLoginDetailsToStudentsController = async (req, res) => {
  try {
    const { student_ids } = req.body;
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'student_ids array is required'
      });
    }

    const students = await findStudentsWithLoginCredentials(student_ids);
    await emailService.initialize();

    const results = [];

    for (const student of students) {
      if (!student.email) {
        results.push({ student_id: student.id, success: false, error: 'Missing email' });
        continue;
      }

      if (!student.user_id || !student.username || !student.temp_password) {
        results.push({
          student_id: student.id,
          success: false,
          error: 'Student has no login credentials to send'
        });
        continue;
      }

      const mail = await emailService.sendStudentLoginDetails(
        {
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          student_id: student.student_id
        },
        {
          username: student.username,
          password: student.temp_password
        }
      );

      if (!mail.success) {
        results.push({ student_id: student.id, success: false, error: mail.error || mail.message });
      } else {
        results.push({ student_id: student.id, success: true });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Login detail email operation completed',
      data: {
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results
      }
    });
  } catch (error) {
    console.error('Error sending student login details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send login details',
      error: error.message
    });
  }
};

module.exports = {
  generateStudentIdController,
  createStudentController,
  getPublicStudentSchemasController,
  createPublicStudentRegistrationController,
  getMyProfileController,
  getAllStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
  createStudentLoginController,
  getStudentStatsController,
  uploadProfilePhotoController,
  deleteProfilePhotoController,
  bulkCreateStudentsController,
  sendLoginDetailsToStudentsController
};
