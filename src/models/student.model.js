const { executeQuery } = require('../configs/db.config');

// =====================================================
// STUDENT ID GENERATION
// =====================================================

/**
 * Generate unique student ID with format: STUD{YEAR}{SEQUENCE}
 * Example: STUD20250001, STUD20250002, etc.
 */
const generateStudentId = async () => {
  try {
    const year = new Date().getFullYear();
    const prefix = `STUD${year}`;
    
    // Get last student ID for this year
    const query = `
      SELECT student_id 
      FROM students 
      WHERE student_id LIKE ? 
      ORDER BY student_id DESC 
      LIMIT 1
    `;
    
    const { rows } = await executeQuery(query, [`${prefix}%`]);
    
    if (rows.length === 0) {
      // First student of the year
      return `${prefix}0001`;
    }
    
    // Extract sequence and increment
    const lastId = rows[0].student_id;
    const lastSequence = parseInt(lastId.slice(-4));
    const newSequence = (lastSequence + 1).toString().padStart(4, '0');
    
    return `${prefix}${newSequence}`;
  } catch (error) {
    throw new Error(`Failed to generate student ID: ${error.message}`);
  }
};

// =====================================================
// STUDENT CRUD FUNCTIONS
// =====================================================

/**
 * Create new student
 */
const createStudent = async (studentData) => {
  try {
    const {
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
      user_id,
      profile_photo,
      status,
      custom_data,
      welcome_email_sent,
      welcome_email_sent_at,
      created_by
    } = studentData;

    const query = `
      INSERT INTO students 
      (student_id, schema_id, first_name, last_name, middle_name, email, phone, 
       date_of_birth, gender, address, city, state, country, postal_code,
       guardian_name, guardian_phone, guardian_email, guardian_relationship,
       previous_school, graduation_year, user_id, profile_photo, status, custom_data,
       welcome_email_sent, welcome_email_sent_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      student_id,
      schema_id,
      first_name,
      last_name,
      middle_name ?? null,
      email,
      phone ?? null,
      date_of_birth ?? null,
      gender ?? null,
      address ?? null,
      city ?? null,
      state ?? null,
      country ?? 'Nigeria',
      postal_code ?? null,
      guardian_name ?? null,
      guardian_phone ?? null,
      guardian_email ?? null,
      guardian_relationship ?? null,
      previous_school ?? null,
      graduation_year ?? null,
      user_id ?? null,
      profile_photo ?? null,
      status || 'active',
      custom_data ? JSON.stringify(custom_data) : null,
      welcome_email_sent ?? false,
      welcome_email_sent_at ?? null,
      created_by
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Student insert failed: insertId not returned');
    }
    
    return await findStudentById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create student: ${error.message}`);
  }
};

/**
 * Find student by ID
 */
const findStudentById = async (id) => {
  try {
    const query = `
      SELECT s.*, 
             ss.schema_name, 
             ss.display_name as schema_display_name,
             u.username as created_by_username
      FROM students s
      LEFT JOIN student_schemas ss ON s.schema_id = ss.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find student by ID: ${error.message}`);
  }
};

/**
 * Find student by student_id
 */
const findStudentByStudentId = async (studentId) => {
  try {
    const query = `
      SELECT s.*, 
             ss.schema_name, 
             ss.display_name as schema_display_name,
             u.username as created_by_username
      FROM students s
      LEFT JOIN student_schemas ss ON s.schema_id = ss.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.student_id = ?
    `;

    const { rows } = await executeQuery(query, [studentId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find student by student ID: ${error.message}`);
  }
};

/**
 * Find student by email
 */
const findStudentByEmail = async (email) => {
  try {
    const query = `
      SELECT s.*, 
             ss.schema_name, 
             ss.display_name as schema_display_name
      FROM students s
      LEFT JOIN student_schemas ss ON s.schema_id = ss.id
      WHERE s.email = ?
    `;

    const { rows } = await executeQuery(query, [email]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find student by email: ${error.message}`);
  }
};

/**
 * Find student by user_id
 */
const findStudentByUserId = async (userId) => {
  try {
    const query = `
      SELECT s.*, 
             ss.schema_name, 
             ss.display_name as schema_display_name
      FROM students s
      LEFT JOIN student_schemas ss ON s.schema_id = ss.id
      WHERE s.user_id = ?
    `;

    const { rows } = await executeQuery(query, [userId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find student by user ID: ${error.message}`);
  }
};

/**
 * Get all students (simple version without pagination)
 */
const getAllStudentsSimple = async () => {
  try {
    const query = `
      SELECT s.*, 
             ss.schema_name, 
             ss.display_name as schema_display_name,
             u.username as created_by_username
      FROM students s
      LEFT JOIN student_schemas ss ON s.schema_id = ss.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.status != 'withdrawn'
      ORDER BY s.created_at DESC
    `;

    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all students: ${error.message}`);
  }
};

/**
 * Update student
 */
const updateStudent = async (id, updateData) => {
  try {
    const updates = [];
    const params = [];
    
    // Build dynamic update query based on provided fields
    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'email', 'phone',
      'date_of_birth', 'gender', 'address', 'city', 'state', 'country', 'postal_code',
      'guardian_name', 'guardian_phone', 'guardian_email', 'guardian_relationship',
      'previous_school', 'graduation_year', 'profile_photo', 'status', 'custom_data'
    ];
    
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        updates.push(`${field} = ?`);
        if (field === 'custom_data' && updateData[field]) {
          params.push(JSON.stringify(updateData[field]));
        } else {
          params.push(updateData[field] ?? null);
        }
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `UPDATE students SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await executeQuery(query, params);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to update student: ${error.message}`);
  }
};

/**
 * Delete student
 */
const deleteStudent = async (id) => {
  try {
    // Set user_id to NULL before deleting student
    await executeQuery('UPDATE students SET user_id = NULL WHERE id = ?', [id]);
    
    const query = 'DELETE FROM students WHERE id = ?';
    const result = await executeQuery(query, [id]);
    
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to delete student: ${error.message}`);
  }
};

/**
 * Check if student ID exists
 */
const checkStudentIdExists = async (studentId) => {
  try {
    const query = 'SELECT COUNT(*) as count FROM students WHERE student_id = ?';
    const { rows } = await executeQuery(query, [studentId]);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check student ID exists: ${error.message}`);
  }
};

/**
 * Check if email exists
 */
const checkStudentEmailExists = async (email) => {
  try {
    const query = 'SELECT COUNT(*) as count FROM students WHERE email = ?';
    const { rows } = await executeQuery(query, [email]);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check student email exists: ${error.message}`);
  }
};

/**
 * Get student statistics
 */
const getStudentStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'graduated' THEN 1 ELSE 0 END) as graduated_students,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_students,
        SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as students_with_login,
        SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as students_without_login
      FROM students
    `;

    const { rows } = await executeQuery(query, []);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get student stats: ${error.message}`);
  }
};

// =====================================================
// ADDITIONAL HELPER FUNCTIONS
// =====================================================

/**
 * Check if email exists in users table
 */
const checkEmailExistsInUsers = async (email) => {
  try {
    const query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    const { rows } = await executeQuery(query, [email]);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check email in users: ${error.message}`);
  }
};

/**
 * Get role ID by role name
 */
const getRoleIdByName = async (roleName) => {
  try {
    const query = 'SELECT id FROM roles WHERE name = ?';
    const { rows } = await executeQuery(query, [roleName]);
    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    throw new Error(`Failed to get role ID: ${error.message}`);
  }
};

/**
 * Update student's user_id and welcome email status
 */
const updateStudentUserId = async (studentId, userId, sendWelcomeEmail = false) => {
  try {
    const query = `
      UPDATE students 
      SET user_id = ?, 
          welcome_email_sent = ?, 
          welcome_email_sent_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await executeQuery(query, [
      userId,
      sendWelcomeEmail,
      sendWelcomeEmail ? new Date() : null,
      studentId
    ]);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to update student user_id: ${error.message}`);
  }
};

const findStudentsWithLoginCredentials = async (studentIds = []) => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return [];

  const placeholders = studentIds.map(() => '?').join(',');
  const query = `
    SELECT 
      s.id,
      s.student_id,
      s.first_name,
      s.last_name,
      s.email,
      s.user_id,
      u.username,
      u.temp_password
    FROM students s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id IN (${placeholders})
  `;

  const { rows } = await executeQuery(query, studentIds);
  return rows;
};

module.exports = {
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
  // Helper functions
  checkEmailExistsInUsers,
  getRoleIdByName,
  updateStudentUserId,
  findStudentsWithLoginCredentials
};
