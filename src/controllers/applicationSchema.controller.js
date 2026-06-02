const {
  createApplicationSchema,
  findApplicationSchemaById,
  findAllApplicationSchemas,
  updateApplicationSchema,
  deleteApplicationSchema,
  addApplicationSchemaField,
  findApplicationSchemaFieldById,
  findApplicationSchemaFields,
  updateApplicationSchemaField,
  deleteApplicationSchemaField
} = require('../models/applicant.model');

// =====================================================
// APPLICATION SCHEMA CONTROLLER FUNCTIONS
// =====================================================

// Create new application schema
const createApplicationSchemaController = async (req, res) => {
  try {
    const { schema_name, display_name, description, application_fee } = req.body;
    const created_by = req.user.id; // From authentication middleware

    // Validate required fields
    if (!schema_name || !display_name) {
      return res.status(400).json({
        success: false,
        message: 'Schema name and display name are required'
      });
    }

    // Check if schema name already exists
    const existingSchemas = await findAllApplicationSchemas();
    const schemaExists = existingSchemas.some(schema => 
      schema.schema_name.toLowerCase() === schema_name.toLowerCase()
    );

    if (schemaExists) {
      return res.status(400).json({
        success: false,
        message: 'Schema name already exists'
      });
    }

    // Create schema
    const schema = await createApplicationSchema({
      schema_name,
      display_name,
      description,
      application_fee: application_fee || 0.00,
      created_by
    });

    res.status(201).json({
      success: true,
      message: 'Application schema created successfully',
      data: schema
    });

  } catch (error) {
    console.error('Error creating application schema:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all application schemas
const getAllApplicationSchemasController = async (req, res) => {
  try {
    const schemas = await findAllApplicationSchemas();

    res.status(200).json({
      success: true,
      message: 'Application schemas retrieved successfully',
      data: schemas
    });

  } catch (error) {
    console.error('Error fetching application schemas:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get schema by ID with fields
const getApplicationSchemaByIdController = async (req, res) => {
  try {
    const { schemaId } = req.params;

    const schema = await findApplicationSchemaById(schemaId);
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Application schema not found'
      });
    }

    // Get schema fields
    const fields = await findApplicationSchemaFields(schemaId);

    res.status(200).json({
      success: true,
      message: 'Application schema retrieved successfully',
      data: {
        schema,
        fields
      }
    });

  } catch (error) {
    console.error('Error fetching application schema:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Add field to schema
const addApplicationSchemaFieldController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const {
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      validation_rules,
      display_order
    } = req.body;

    // Validate required fields
    if (!field_name || !field_label || !field_type) {
      return res.status(400).json({
        success: false,
        message: 'Field name, label, and type are required'
      });
    }

    // Validate field type
    const validFieldTypes = [
      'text', 'email', 'number', 'date', 'datetime', 'time', 'textarea',
      'select', 'checkbox', 'radio', 'file', 'url', 'phone'
    ];

    if (!validFieldTypes.includes(field_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field type'
      });
    }

    // Check if schema exists
    const schema = await findApplicationSchemaById(schemaId);
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Application schema not found'
      });
    }

    // Add field
    const field = await addApplicationSchemaField({
      schema_id: schemaId,
      field_name,
      field_label,
      field_type,
      field_options,
      is_required: is_required || false,
      validation_rules,
      display_order: display_order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Field added successfully',
      data: field
    });

  } catch (error) {
    console.error('Error adding field:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update field
const updateApplicationSchemaFieldController = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const {
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      validation_rules,
      display_order
    } = req.body;

    // Validate field type if provided
    if (field_type) {
      const validFieldTypes = [
        'text', 'email', 'number', 'date', 'datetime', 'time', 'textarea',
        'select', 'checkbox', 'radio', 'file', 'url', 'phone'
      ];

      if (!validFieldTypes.includes(field_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid field type'
        });
      }
    }

    // Update field
    const updatedField = await updateApplicationSchemaField(fieldId, {
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      validation_rules,
      display_order
    });

    if (!updatedField) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Field updated successfully',
      data: updatedField
    });

  } catch (error) {
    console.error('Error updating field:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete field
const deleteApplicationSchemaFieldController = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const deleted = await deleteApplicationSchemaField(fieldId);

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
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update schema
const updateApplicationSchemaController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const { schema_name, display_name, description, application_fee } = req.body;

    // Check if schema exists
    const schema = await findApplicationSchemaById(schemaId);
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Application schema not found'
      });
    }

    // Update schema
    const updatedSchema = await updateApplicationSchema(schemaId, {
      schema_name,
      display_name,
      description,
      application_fee
    });

    if (!updatedSchema) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update schema'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Schema updated successfully',
      data: updatedSchema
    });

  } catch (error) {
    console.error('Error updating schema:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete schema
const deleteApplicationSchemaController = async (req, res) => {
  try {
    const { schemaId } = req.params;

    // Check if schema exists
    const schema = await findApplicationSchemaById(schemaId);
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Application schema not found'
      });
    }

    // Delete schema
    const deleted = await deleteApplicationSchema(schemaId);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete schema'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Schema deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get schema fields only
const getApplicationSchemaFieldsController = async (req, res) => {
  try {
    const { schemaId } = req.params;

    // Check if schema exists
    const schema = await findApplicationSchemaById(schemaId);
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Application schema not found'
      });
    }

    // Get fields
    const fields = await findApplicationSchemaFields(schemaId);

    res.status(200).json({
      success: true,
      message: 'Schema fields retrieved successfully',
      data: fields
    });

  } catch (error) {
    console.error('Error fetching schema fields:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Duplicate schema
const duplicateApplicationSchemaController = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const { schema_name, display_name, description } = req.body;
    const created_by = req.user.id;

    // Get original schema
    const originalSchema = await findApplicationSchemaById(schemaId);
    if (!originalSchema) {
      return res.status(404).json({
        success: false,
        message: 'Application schema not found'
      });
    }

    // Get original fields
    const originalFields = await findApplicationSchemaFields(schemaId);

    // Create new schema
    const newSchema = await createApplicationSchema({
      schema_name: schema_name || `${originalSchema.schema_name}_copy`,
      display_name: display_name || `${originalSchema.display_name} (Copy)`,
      description: description || originalSchema.description,
      application_fee: originalSchema.application_fee,
      created_by
    });

    // Copy fields
    for (const field of originalFields) {
      await addApplicationSchemaField({
        schema_id: newSchema.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        is_required: field.is_required,
        validation_rules: field.validation_rules,
        display_order: field.display_order
      });
    }

    res.status(201).json({
      success: true,
      message: 'Schema duplicated successfully',
      data: newSchema
    });

  } catch (error) {
    console.error('Error duplicating schema:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get field by ID
const getApplicationSchemaFieldByIdController = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const field = await findApplicationSchemaFieldById(fieldId);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Field retrieved successfully',
      data: field
    });

  } catch (error) {
    console.error('Error fetching field:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get schema statistics
const getApplicationSchemaStatsController = async (req, res) => {
  try {
    const schemas = await findAllApplicationSchemas();
    
    const stats = {
      total_schemas: schemas.length,
      active_schemas: schemas.filter(s => s.is_active).length,
      total_fields: 0,
      average_fields_per_schema: 0
    };

    // Calculate field statistics
    for (const schema of schemas) {
      const fields = await findApplicationSchemaFields(schema.id);
      stats.total_fields += fields.length;
    }

    stats.average_fields_per_schema = schemas.length > 0 ? 
      Math.round(stats.total_fields / schemas.length * 100) / 100 : 0;

    res.status(200).json({
      success: true,
      message: 'Schema statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching schema statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createApplicationSchemaController,
  getAllApplicationSchemasController,
  getApplicationSchemaByIdController,
  addApplicationSchemaFieldController,
  updateApplicationSchemaFieldController,
  deleteApplicationSchemaFieldController,
  updateApplicationSchemaController,
  deleteApplicationSchemaController,
  getApplicationSchemaFieldsController,
  duplicateApplicationSchemaController,
  getApplicationSchemaFieldByIdController,
  getApplicationSchemaStatsController
};
