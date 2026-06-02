const { executeQuery } = require('../configs/db.config');

// =====================================================
// APPLICATION SCHEMA FUNCTIONS
// =====================================================

// Create a new application schema
const createApplicationSchema = async (schemaData) => {
  try {
    const { schema_name, display_name, description, application_fee, created_by } = schemaData;
    
    const query = `
      INSERT INTO application_schemas (schema_name, display_name, description, application_fee, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [schema_name, display_name, description ?? null, application_fee || 0.00, created_by];
    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Application schema insert failed: insertId not returned');
    }
    
    return await findApplicationSchemaById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create application schema: ${error.message}`);
  }
};

// Find application schema by ID
const findApplicationSchemaById = async (id) => {
  try {
    const query = `
      SELECT as_schema.*, u.username as created_by_username
      FROM application_schemas as_schema
      LEFT JOIN users u ON as_schema.created_by = u.id
      WHERE as_schema.id = ? AND as_schema.is_active = TRUE
    `;
    
    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find application schema by ID: ${error.message}`);
  }
};

// Get all application schemas
const findAllApplicationSchemas = async (options = {}) => {
  try {
    const query = `
      SELECT as_schema.*, u.username as created_by_username
      FROM application_schemas as_schema
      LEFT JOIN users u ON as_schema.created_by = u.id
      WHERE as_schema.is_active = TRUE
      ORDER BY as_schema.created_at DESC
    `;
    
    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find application schemas: ${error.message}`);
  }
};

// Update application schema
const updateApplicationSchema = async (id, updateData) => {
  try {
    const allowedFields = ['schema_name', 'display_name', 'description', 'application_fee'];
    const updates = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value ?? null);
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    const query = `UPDATE application_schemas SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findApplicationSchemaById(id);
  } catch (error) {
    throw new Error(`Failed to update application schema: ${error.message}`);
  }
};

// Delete application schema (soft delete)
const deleteApplicationSchema = async (id) => {
  try {
    const query = 'UPDATE application_schemas SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete application schema: ${error.message}`);
  }
};

// =====================================================
// APPLICATION SCHEMA FIELD FUNCTIONS
// =====================================================

// Add field to application schema
const addApplicationSchemaField = async (fieldData) => {
  try {
    const {
      schema_id,
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      validation_rules,
      display_order
    } = fieldData;

    const query = `
      INSERT INTO application_schema_fields 
      (schema_id, field_name, field_label, field_type, field_options, is_required, validation_rules, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      schema_id,
      field_name,
      field_label,
      field_type,
      field_options ? JSON.stringify(field_options) : null,
      is_required || false,
      validation_rules ? JSON.stringify(validation_rules) : null,
      display_order || 0
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Application schema field insert failed: insertId not returned');
    }
    
    return await findApplicationSchemaFieldById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to add application schema field: ${error.message}`);
  }
};

// Find application schema field by ID
const findApplicationSchemaFieldById = async (id) => {
  try {
    const query = 'SELECT * FROM application_schema_fields WHERE id = ? AND is_active = TRUE';
    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find application schema field by ID: ${error.message}`);
  }
};

// Get application schema fields
const findApplicationSchemaFields = async (schemaId) => {
  try {
    const query = `
      SELECT *
      FROM application_schema_fields
      WHERE schema_id = ? AND is_active = TRUE
      ORDER BY display_order ASC
    `;
    
    const { rows } = await executeQuery(query, [schemaId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find application schema fields: ${error.message}`);
  }
};

// Update application schema field
const updateApplicationSchemaField = async (id, updateData) => {
  try {
    const allowedFields = ['field_name', 'field_label', 'field_type', 'field_options', 'is_required', 'validation_rules', 'display_order'];
    const updates = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'field_options' || key === 'validation_rules') {
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
    
    const query = `UPDATE application_schema_fields SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findApplicationSchemaFieldById(id);
  } catch (error) {
    throw new Error(`Failed to update application schema field: ${error.message}`);
  }
};

// Delete application schema field (soft delete)
const deleteApplicationSchemaField = async (id) => {
  try {
    const query = 'UPDATE application_schema_fields SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete application schema field: ${error.message}`);
  }
};

// =====================================================
// APPLICANT FUNCTIONS
// =====================================================

// Generate application number
const generateApplicationNumber = async () => {
  try {
    const year = new Date().getFullYear();
    const query = `
      SELECT COALESCE(MAX(CAST(SUBSTRING(application_number, 6) AS UNSIGNED)), 0) + 1 as next_number
      FROM applicants 
      WHERE application_number LIKE ?
    `;
    
    const { rows } = await executeQuery(query, [`APP${year}%`]);
    const nextNumber = rows[0].next_number;
    
    return `APP${year}${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    throw new Error(`Failed to generate application number: ${error.message}`);
  }
};

// Create new applicant
const createApplicant = async (applicantData) => {
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
      nationality,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      passport_photo,
      custom_data,
      user_id
    } = applicantData;

    // Generate application number
    const application_number = await generateApplicationNumber();

    const query = `
      INSERT INTO applicants 
      (application_number, schema_id, first_name, last_name, middle_name, email, phone, 
       date_of_birth, gender, nationality, address, emergency_contact_name, 
       emergency_contact_phone, passport_photo, user_id, custom_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      application_number,
      schema_id,
      first_name,
      last_name,
      middle_name ?? null,
      email,
      phone,
      date_of_birth ?? null,
      gender ?? null,
      nationality ?? null,
      address ?? null,
      emergency_contact_name ?? null,
      emergency_contact_phone ?? null,
      passport_photo ?? null,
      user_id ?? null,
      custom_data ? JSON.stringify(custom_data) : null
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Applicant insert failed: insertId not returned');
    }
    
    return { id: result.insertId, application_number };
  } catch (error) {
    throw new Error(`Failed to create applicant: ${error.message}`);
  }
};

// Find applicant by ID
const findApplicantById = async (id) => {
  try {
    const query = `
      SELECT a.*, 
             CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
             a.email as applicant_email,
             s.profile_photo as student_profile_photo,
             as_schema.schema_name, as_schema.display_name as schema_display_name, 
             as_schema.application_fee, ed.exam_title, ed.exam_date, ed.exam_time, 
             ed.exam_venue, u.username as reviewed_by_username
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      LEFT JOIN entry_dates ed ON a.exam_date_id = ed.id
      LEFT JOIN students s ON a.user_id = s.user_id
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find applicant by ID: ${error.message}`);
  }
};

// Find applicant by application number
const findApplicantByApplicationNumber = async (applicationNumber) => {
  try {
    const query = `
      SELECT a.*, 
             CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
             a.email as applicant_email,
             as_schema.schema_name, as_schema.display_name as schema_display_name, 
             as_schema.application_fee, ed.exam_title, ed.exam_date, ed.exam_time, 
             ed.exam_venue, u.username as reviewed_by_username
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      LEFT JOIN entry_dates ed ON a.exam_date_id = ed.id
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.application_number = ?
    `;

    const { rows } = await executeQuery(query, [applicationNumber]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find applicant by application number: ${error.message}`);
  }
};

// Get all applicants (simple version without pagination)
const getAllApplicantsSimple = async () => {
  try {
    const query = `
      SELECT a.*, 
             CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
             a.email as applicant_email,
             as_schema.schema_name, as_schema.display_name as schema_display_name, 
             as_schema.application_fee, ed.exam_title, ed.exam_date, ed.exam_time, 
             ed.exam_venue, u.username as reviewed_by_username
      FROM applicants a
      LEFT JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      LEFT JOIN entry_dates ed ON a.exam_date_id = ed.id
      LEFT JOIN users u ON a.reviewed_by = u.id
      ORDER BY a.created_at DESC
    `;
    
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find applicants: ${error.message}`);
  }
};

// Get all applicants with pagination
const findAllApplicants = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '', schema_id = null, status = null, payment_status = null, exam_date_id = null } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT a.*, 
             CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
             a.email as applicant_email,
             as_schema.schema_name, as_schema.display_name as schema_display_name, 
             as_schema.application_fee, ed.exam_title, ed.exam_date, ed.exam_time, 
             ed.exam_venue, u.username as reviewed_by_username
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      LEFT JOIN entry_dates ed ON a.exam_date_id = ed.id
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (search) {
      query += ` AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ? OR a.application_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (schema_id) {
      query += ` AND a.schema_id = ?`;
      params.push(schema_id);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (payment_status) {
      query += ` AND a.payment_status = ?`;
      params.push(payment_status);
    }

    if (exam_date_id) {
      query += ` AND a.exam_date_id = ?`;
      params.push(exam_date_id);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { rows } = await executeQuery(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM applicants a
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ? OR a.application_number LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (schema_id) {
      countQuery += ` AND a.schema_id = ?`;
      countParams.push(schema_id);
    }

    if (status) {
      countQuery += ` AND a.status = ?`;
      countParams.push(status);
    }

    if (payment_status) {
      countQuery += ` AND a.payment_status = ?`;
      countParams.push(payment_status);
    }

    if (exam_date_id) {
      countQuery += ` AND a.exam_date_id = ?`;
      countParams.push(exam_date_id);
    }

    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;

    return {
      applicants: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find applicants: ${error.message}`);
  }
};

// Update applicant
const updateApplicant = async (id, updateData) => {
  try {
    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'email', 'phone', 'date_of_birth',
      'gender', 'nationality', 'address', 'emergency_contact_name', 'emergency_contact_phone',
      'passport_photo', 'exam_date_id', 'custom_data'
    ];
    const updates = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'custom_data') {
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
    
    const query = `UPDATE applicants SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findApplicantById(id);
  } catch (error) {
    throw new Error(`Failed to update applicant: ${error.message}`);
  }
};

// Submit application
const submitApplication = async (id) => {
  try {
    const query = `
      UPDATE applicants 
      SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(query, [id]);
    return await findApplicantById(id);
  } catch (error) {
    throw new Error(`Failed to submit application: ${error.message}`);
  }
};

// Update application status
const updateApplicationStatus = async (id, status, reviewedBy, reviewNotes = null) => {
  try {
    const query = `
      UPDATE applicants 
      SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_notes = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(query, [status, reviewedBy, reviewNotes, id]);
    return await findApplicantById(id);
  } catch (error) {
    throw new Error(`Failed to update application status: ${error.message}`);
  }
};

// Update payment status
const updatePaymentStatus = async (id, paymentStatus, paymentReference = null) => {
  try {
    const isPaid = paymentStatus === 'paid';
    const query = isPaid
      ? `
        UPDATE applicants 
        SET payment_status = ?,
            payment_reference = ?,
            status = CASE WHEN status = 'draft' THEN 'submitted' ELSE status END,
            submitted_at = CASE WHEN status = 'draft' AND submitted_at IS NULL THEN NOW() ELSE submitted_at END,
            updated_at = NOW()
        WHERE id = ?
      `
      : `
        UPDATE applicants 
        SET payment_status = ?, payment_reference = ?, updated_at = NOW()
        WHERE id = ?
      `;

    await executeQuery(query, [paymentStatus, paymentReference, id]);
    return await findApplicantById(id);
  } catch (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
};

// Delete applicant
const deleteApplicant = async (id) => {
  try {
    const query = 'DELETE FROM applicants WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete applicant: ${error.message}`);
  }
};

// Get applicants by status
const findApplicantsByStatus = async (status) => {
  try {
    const query = `
      SELECT a.*, as_schema.schema_name, as_schema.display_name as schema_display_name
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      WHERE a.status = ?
      ORDER BY a.created_at DESC
    `;

    const { rows } = await executeQuery(query, [status]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find applicants by status: ${error.message}`);
  }
};

// Get applicants by exam date
const findApplicantsByExamDate = async (examDateId) => {
  try {
    const query = `
      SELECT a.*, as_schema.schema_name, as_schema.display_name as schema_display_name
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      WHERE a.exam_date_id = ?
      ORDER BY a.first_name, a.last_name
    `;

    const { rows } = await executeQuery(query, [examDateId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find applicants by exam date: ${error.message}`);
  }
};

// Get applicant statistics
const getApplicantStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_applicants,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_applications,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_applications,
        0 as under_review_applications,
        0 as rejected_applications,
        0 as admitted_applications,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_applications,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments
      FROM applicants
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get applicant statistics: ${error.message}`);
  }
};

// Check if email exists
const checkApplicantEmailExists = async (email, excludeId = null) => {
  try {
    let query = `SELECT COUNT(*) as count FROM applicants WHERE email = ?`;
    const params = [email];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const { rows } = await executeQuery(query, params);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check applicant email exists: ${error.message}`);
  }
};

// Check if application number exists
const checkApplicationNumberExists = async (applicationNumber, excludeId = null) => {
  try {
    let query = `SELECT COUNT(*) as count FROM applicants WHERE application_number = ?`;
    const params = [applicationNumber];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const { rows } = await executeQuery(query, params);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check application number exists: ${error.message}`);
  }
};

// Get recent applications
const getRecentApplications = async (limit = 10) => {
  try {
    const query = `
      SELECT a.*, as_schema.schema_name, as_schema.display_name as schema_display_name
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `;

    const { rows } = await executeQuery(query, [limit]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get recent applications: ${error.message}`);
  }
};

// Get applicants by user_id
const findApplicantsByUserId = async (userId) => {
  try {
    const query = `
      SELECT a.*, 
             CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
             a.email as applicant_email,
             as_schema.schema_name, as_schema.display_name as schema_display_name, 
             as_schema.application_fee, ed.exam_title, ed.exam_date, ed.exam_time, 
             ed.exam_venue, u.username as reviewed_by_username
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      LEFT JOIN entry_dates ed ON a.exam_date_id = ed.id
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `;

    const { rows } = await executeQuery(query, [userId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find applicants by user_id: ${error.message}`);
  }
};

// Find application by user_id (returns single most recent application)
const findApplicationByUserId = async (userId) => {
  try {
    const query = `
      SELECT a.*, 
             CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
             a.email as applicant_email,
             as_schema.schema_name, as_schema.display_name as schema_display_name, 
             as_schema.application_fee, ed.exam_title, ed.exam_date, ed.exam_time, 
             ed.exam_venue, u.username as reviewed_by_username
      FROM applicants a
      JOIN application_schemas as_schema ON a.schema_id = as_schema.id
      LEFT JOIN entry_dates ed ON a.exam_date_id = ed.id
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 1
    `;

    const { rows } = await executeQuery(query, [userId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find application by user_id: ${error.message}`);
  }
};

module.exports = {
  // Application Schema functions
  createApplicationSchema,
  findApplicationSchemaById,
  findAllApplicationSchemas,
  updateApplicationSchema,
  deleteApplicationSchema,
  
  // Application Schema Field functions
  addApplicationSchemaField,
  findApplicationSchemaFieldById,
  findApplicationSchemaFields,
  updateApplicationSchemaField,
  deleteApplicationSchemaField,
  
  // Applicant functions
  generateApplicationNumber,
  createApplicant,
  findApplicantById,
  findApplicantByApplicationNumber,
  getAllApplicantsSimple,
  findAllApplicants,
  findApplicantsByUserId,
  findApplicationByUserId,
  updateApplicant,
  submitApplication,
  updateApplicationStatus,
  updatePaymentStatus,
  deleteApplicant,
  findApplicantsByStatus,
  findApplicantsByExamDate,
  getApplicantStats,
  checkApplicantEmailExists,
  checkApplicationNumberExists,
  getRecentApplications
};
