const { executeQuery } = require('../configs/db.config');

// =====================================================
// STUDENT SCHEMA FUNCTIONS
// =====================================================

/**
 * Create student schema
 */
const createStudentSchema = async (schemaData) => {
  try {
    const { schema_name, display_name, description, created_by } = schemaData;
    
    const query = `
      INSERT INTO student_schemas (schema_name, display_name, description, created_by)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [schema_name, display_name, description ?? null, created_by];
    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Student schema insert failed: insertId not returned');
    }
    
    return await findStudentSchemaById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create student schema: ${error.message}`);
  }
};

/**
 * Find student schema by ID
 */
const findStudentSchemaById = async (id) => {
  try {
    const query = `
      SELECT ss.*, u.username as created_by_username
      FROM student_schemas ss
      LEFT JOIN users u ON ss.created_by = u.id
      WHERE ss.id = ? AND ss.is_active = TRUE
    `;
    
    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find student schema by ID: ${error.message}`);
  }
};

/**
 * Get all student schemas
 */
const getAllStudentSchemasSimple = async () => {
  try {
    const query = `
      SELECT ss.*, u.username as created_by_username
      FROM student_schemas ss
      LEFT JOIN users u ON ss.created_by = u.id
      WHERE ss.is_active = TRUE
      ORDER BY ss.created_at DESC
    `;
    
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all student schemas: ${error.message}`);
  }
};

/**
 * Update student schema
 */
const updateStudentSchema = async (id, updateData) => {
  try {
    const { display_name, description, is_active } = updateData;
    
    const query = `
      UPDATE student_schemas 
      SET display_name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      display_name,
      description ?? null,
      is_active ?? true,
      id
    ];

    const result = await executeQuery(query, params);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to update student schema: ${error.message}`);
  }
};

/**
 * Delete student schema
 */
const deleteStudentSchema = async (id) => {
  try {
    // Soft delete - set is_active to false
    const query = 'UPDATE student_schemas SET is_active = FALSE WHERE id = ?';
    const result = await executeQuery(query, [id]);
    
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to delete student schema: ${error.message}`);
  }
};

// =====================================================
// STUDENT SCHEMA FIELD FUNCTIONS
// =====================================================

/**
 * Add field to schema
 */
const addFieldToSchema = async (fieldData) => {
  try {
    const {
      schema_id,
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      field_order,
      display_order,
      validation_rules,
      help_text
    } = fieldData;

    const query = `
      INSERT INTO student_schema_fields 
      (schema_id, field_name, field_label, field_type, field_options, is_required, field_order, validation_rules, help_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      schema_id,
      field_name,
      field_label,
      field_type,
      field_options ? JSON.stringify(field_options) : null,
      is_required ?? false,
      field_order ?? display_order ?? 0,
      validation_rules ? JSON.stringify(validation_rules) : null,
      help_text ?? null
    ];

    const result = await executeQuery(query, params);
    return result.insertId;
  } catch (error) {
    throw new Error(`Failed to add field to schema: ${error.message}`);
  }
};

/**
 * Get schema fields
 */
const getSchemaFields = async (schemaId) => {
  try {
    const query = `
      SELECT
        id,
        schema_id,
        field_name,
        field_label,
        field_type,
        field_options,
        is_required,
        field_order,
        field_order as display_order,
        validation_rules,
        help_text,
        created_at
      FROM student_schema_fields
      WHERE schema_id = ?
      ORDER BY field_order ASC, id ASC
    `;

    const { rows } = await executeQuery(query, [schemaId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get schema fields: ${error.message}`);
  }
};

/**
 * Update schema field
 */
const updateSchemaField = async (fieldId, fieldData) => {
  try {
    const {
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      field_order,
      display_order,
      validation_rules,
      help_text
    } = fieldData;

    const query = `
      UPDATE student_schema_fields
      SET field_name = ?,
          field_label = ?,
          field_type = ?,
          field_options = ?,
          is_required = ?,
          field_order = ?,
          validation_rules = ?,
          help_text = ?
      WHERE id = ?
    `;

    const params = [
      field_name,
      field_label,
      field_type,
      field_options ? JSON.stringify(field_options) : null,
      is_required ?? false,
      field_order ?? display_order ?? 0,
      validation_rules ? JSON.stringify(validation_rules) : null,
      help_text ?? null,
      fieldId
    ];

    const result = await executeQuery(query, params);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to update schema field: ${error.message}`);
  }
};

/**
 * Delete schema field
 */
const deleteSchemaField = async (fieldId) => {
  try {
    const query = 'DELETE FROM student_schema_fields WHERE id = ?';
    const result = await executeQuery(query, [fieldId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to delete schema field: ${error.message}`);
  }
};

module.exports = {
  createStudentSchema,
  findStudentSchemaById,
  getAllStudentSchemasSimple,
  updateStudentSchema,
  deleteStudentSchema,
  addFieldToSchema,
  getSchemaFields,
  updateSchemaField,
  deleteSchemaField
};
