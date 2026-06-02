const {
  createStudentSchema,
  findStudentSchemaById,
  getAllStudentSchemasSimple,
  updateStudentSchema,
  deleteStudentSchema,
  addFieldToSchema,
  getSchemaFields,
  updateSchemaField,
  deleteSchemaField
} = require('../models/studentSchema.model');

// =====================================================
// STUDENT SCHEMA CONTROLLER FUNCTIONS
// =====================================================

/**
 * Create student schema
 */
const createSchemaController = async (req, res) => {
  try {
    const { schema_name, display_name, description } = req.body;
    const created_by = req.user.id;

    if (!schema_name || !display_name) {
      return res.status(400).json({
        success: false,
        message: 'Schema name and display name are required'
      });
    }

    const schema = await createStudentSchema({
      schema_name,
      display_name,
      description,
      created_by
    });

    res.status(201).json({
      success: true,
      message: 'Student schema created successfully',
      data: { schema_id: schema.id, schema }
    });
  } catch (error) {
    console.error('Error creating student schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create student schema',
      error: error.message
    });
  }
};

/**
 * Get all student schemas
 */
const getAllSchemasController = async (req, res) => {
  try {
    const schemas = await getAllStudentSchemasSimple();

    res.status(200).json({
      success: true,
      message: 'Student schemas retrieved successfully',
      data: {
        schemas,
        count: schemas.length
      }
    });
  } catch (error) {
    console.error('Error fetching student schemas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student schemas',
      error: error.message
    });
  }
};

/**
 * Get schema by ID with fields
 */
const getSchemaByIdController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    
    const schema = await findStudentSchemaById(schemaId);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Student schema not found'
      });
    }

    const fields = await getSchemaFields(schemaId);

    res.status(200).json({
      success: true,
      message: 'Student schema retrieved successfully',
      data: {
        ...schema,
        fields
      }
    });
  } catch (error) {
    console.error('Error fetching student schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student schema',
      error: error.message
    });
  }
};

/**
 * Update student schema
 */
const updateSchemaController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const updateData = req.body;

    const updated = await updateStudentSchema(schemaId, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Student schema not found'
      });
    }

    const schema = await findStudentSchemaById(schemaId);

    res.status(200).json({
      success: true,
      message: 'Student schema updated successfully',
      data: schema
    });
  } catch (error) {
    console.error('Error updating student schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student schema',
      error: error.message
    });
  }
};

/**
 * Delete student schema
 */
const deleteSchemaController = async (req, res) => {
  try {
    const { schemaId } = req.params;

    const deleted = await deleteStudentSchema(schemaId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Student schema not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student schema deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student schema',
      error: error.message
    });
  }
};

/**
 * Add field to schema
 */
const addFieldController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const fieldData = { ...req.body, schema_id: schemaId };

    if (!fieldData.field_name || !fieldData.field_label || !fieldData.field_type) {
      return res.status(400).json({
        success: false,
        message: 'Field name, label, and type are required'
      });
    }

    const fieldId = await addFieldToSchema(fieldData);

    res.status(201).json({
      success: true,
      message: 'Field added to schema successfully',
      data: { field_id: fieldId }
    });
  } catch (error) {
    console.error('Error adding field to schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add field to schema',
      error: error.message
    });
  }
};

/**
 * Get schema fields
 */
const getSchemaFieldsController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const fields = await getSchemaFields(schemaId);

    res.status(200).json({
      success: true,
      message: 'Schema fields retrieved successfully',
      data: { fields }
    });
  } catch (error) {
    console.error('Error fetching schema fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schema fields',
      error: error.message
    });
  }
};

/**
 * Update schema field
 */
const updateFieldController = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const fieldData = req.body;

    if (!fieldData.field_name || !fieldData.field_label || !fieldData.field_type) {
      return res.status(400).json({
        success: false,
        message: 'Field name, label, and type are required'
      });
    }

    const updated = await updateSchemaField(fieldId, fieldData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Field updated successfully'
    });
  } catch (error) {
    console.error('Error updating field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field',
      error: error.message
    });
  }
};

/**
 * Delete schema field
 */
const deleteFieldController = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const deleted = await deleteSchemaField(fieldId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Field deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete field',
      error: error.message
    });
  }
};

module.exports = {
  createSchemaController,
  getAllSchemasController,
  getSchemaByIdController,
  updateSchemaController,
  deleteSchemaController,
  addFieldController,
  getSchemaFieldsController,
  updateFieldController,
  deleteFieldController
};
