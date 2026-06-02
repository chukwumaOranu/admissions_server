const { 
  createEmployeeSchema,
  findEmployeeSchemaById,
  getAllEmployeeSchemasSimple,
  updateEmployeeSchema,
  deleteEmployeeSchema,
  addEmployeeSchemaField,
  findEmployeeSchemaFields,
  updateEmployeeSchemaField,
  deleteEmployeeSchemaField
} = require('../models/employee.model');

// =====================================================
// EMPLOYEE SCHEMA CONTROLLER
// =====================================================

class EmployeeSchemaController {
  // Create new employee schema
  static async createSchema(req, res) {
    try {
      const { schema_name, display_name, description } = req.body;
      const created_by = req.user.id; // From authentication middleware

      // Validate required fields
      if (!schema_name || !display_name) {
        return res.status(400).json({
          success: false,
          message: 'Schema name and display name are required'
        });
      }

      // Check if schema name already exists
      const existingSchemas = await getAllEmployeeSchemasSimple();
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
      const schemaData = {
        schema_name,
        display_name,
        description,
        created_by
      };

      const newSchema = await createEmployeeSchema(schemaData);

      res.status(201).json({
        success: true,
        message: 'Employee schema created successfully',
        data: { schema_id: newSchema.id }
      });

    } catch (error) {
      console.error('Error creating employee schema:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all employee schemas
  static async getAllSchemas(req, res) {
    try {
      const schemas = await getAllEmployeeSchemasSimple();

      res.status(200).json({
        success: true,
        message: 'Employee schemas retrieved successfully',
        data: {
          schemas: schemas,
          count: schemas.length
        }
      });

    } catch (error) {
      console.error('Error fetching employee schemas:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get schema by ID with fields
  static async getSchemaById(req, res) {
    try {
      const { schemaId } = req.params;

      const schema = await findEmployeeSchemaById(schemaId);
      if (!schema) {
        return res.status(404).json({
          success: false,
          message: 'Employee schema not found'
        });
      }

      // Get schema fields
      const fields = await findEmployeeSchemaFields(schemaId);

      res.status(200).json({
        success: true,
        message: 'Employee schema retrieved successfully',
        data: {
          schema,
          fields
        }
      });

    } catch (error) {
      console.error('Error fetching employee schema:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Add field to schema
  static async addField(req, res) {
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
      const schema = await findEmployeeSchemaById(schemaId);
      if (!schema) {
        return res.status(404).json({
          success: false,
          message: 'Employee schema not found'
        });
      }

      // Add field
      const fieldId = await addEmployeeSchemaField({
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
        data: { field_id: fieldId }
      });

    } catch (error) {
      console.error('Error adding field:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update field
  static async updateField(req, res) {
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
      const updated = await updateEmployeeSchemaField(fieldId, {
        field_name,
        field_label,
        field_type,
        field_options,
        is_required,
        validation_rules,
        display_order
      });

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
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete field
  static async deleteField(req, res) {
    try {
      const { fieldId } = req.params;

      const deleted = await deleteEmployeeSchemaField(fieldId);

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
  }

  // Update schema
  static async updateSchema(req, res) {
    try {
      const { schemaId } = req.params;
      const { schema_name, display_name, description } = req.body;

      // Check if schema exists
      const schema = await findEmployeeSchemaById(schemaId);
      if (!schema) {
        return res.status(404).json({
          success: false,
          message: 'Employee schema not found'
        });
      }

      // Update schema
      const updated = await updateEmployeeSchema(schemaId, {
        schema_name,
        display_name,
        description
      });

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update schema'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Schema updated successfully'
      });

    } catch (error) {
      console.error('Error updating schema:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete schema
  static async deleteSchema(req, res) {
    try {
      const { schemaId } = req.params;

      // Check if schema exists
      const schema = await findEmployeeSchemaById(schemaId);
      if (!schema) {
        return res.status(404).json({
          success: false,
          message: 'Employee schema not found'
        });
      }

      // Delete schema
      const deleted = await deleteEmployeeSchema(schemaId);

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
  }

  // Get schema fields only
  static async getSchemaFields(req, res) {
    try {
      const { schemaId } = req.params;

      // Check if schema exists
      const schema = await findEmployeeSchemaById(schemaId);
      if (!schema) {
        return res.status(404).json({
          success: false,
          message: 'Employee schema not found'
        });
      }

      // Get fields
      const fields = await findEmployeeSchemaFields(schemaId);

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
  }

  // Duplicate schema
  static async duplicateSchema(req, res) {
    try {
      const { schemaId } = req.params;
      const { schema_name, display_name, description } = req.body;
      const created_by = req.user.id;

      // Get original schema
      const originalSchema = await findEmployeeSchemaById(schemaId);
      if (!originalSchema) {
        return res.status(404).json({
          success: false,
          message: 'Employee schema not found'
        });
      }

      // Get original fields
      const originalFields = await findEmployeeSchemaFields(schemaId);

      // Create new schema
      const newSchemaId = await createEmployeeSchema({
        schema_name: schema_name || `${originalSchema.schema_name}_copy`,
        display_name: display_name || `${originalSchema.display_name} (Copy)`,
        description: description || originalSchema.description,
        created_by
      });

      // Copy fields
      for (const field of originalFields) {
        await addEmployeeSchemaField({
          schema_id: newSchemaId,
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
        data: { schema_id: newSchemaId }
      });

    } catch (error) {
      console.error('Error duplicating schema:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = EmployeeSchemaController;
