const { executeQuery } = require('../configs/db.config');

// =====================================================
// EMPLOYEE SCHEMA FUNCTIONS
// =====================================================

// Create a new employee schema
const createEmployeeSchema = async (schemaData) => {
  try {
    const { schema_name, display_name, description, created_by } = schemaData;
    
    const query = `
      INSERT INTO employee_schemas (schema_name, display_name, description, created_by)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [schema_name, display_name, description ?? null, created_by];
    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Employee schema insert failed: insertId not returned');
    }
    
    return await findEmployeeSchemaById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create employee schema: ${error.message}`);
  }
};

// Find employee schema by ID
const findEmployeeSchemaById = async (id) => {
  try {
    const query = `
      SELECT es.*, u.username as created_by_username
      FROM employee_schemas es
      LEFT JOIN users u ON es.created_by = u.id
      WHERE es.id = ? AND es.is_active = TRUE
    `;
    
    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find employee schema by ID: ${error.message}`);
  }
};

// Get all employee schemas (simple version without pagination)
const getAllEmployeeSchemasSimple = async () => {
  try {
    const query = `
      SELECT es.*, u.username as created_by_username
      FROM employee_schemas es
      LEFT JOIN users u ON es.created_by = u.id
      WHERE es.is_active = TRUE
      ORDER BY es.created_at DESC
    `;
    
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find employee schemas: ${error.message}`);
  }
};

// Get all employee schemas
const findAllEmployeeSchemas = async (options = {}) => {
  try {
    const query = `
      SELECT es.*, u.username as created_by_username
      FROM employee_schemas es
      LEFT JOIN users u ON es.created_by = u.id
      WHERE es.is_active = TRUE
      ORDER BY es.created_at DESC
    `;
    
    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find employee schemas: ${error.message}`);
  }
};

// Update employee schema
const updateEmployeeSchema = async (id, updateData) => {
  try {
    const allowedFields = ['schema_name', 'display_name', 'description'];
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
    
    const query = `UPDATE employee_schemas SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findEmployeeSchemaById(id);
  } catch (error) {
    throw new Error(`Failed to update employee schema: ${error.message}`);
  }
};

// Delete employee schema (soft delete)
const deleteEmployeeSchema = async (id) => {
  try {
    const query = 'UPDATE employee_schemas SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete employee schema: ${error.message}`);
  }
};

// =====================================================
// EMPLOYEE SCHEMA FIELD FUNCTIONS
// =====================================================

// Add field to employee schema
const addEmployeeSchemaField = async (fieldData) => {
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
      INSERT INTO employee_schema_fields 
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
      throw new Error('Employee schema field insert failed: insertId not returned');
    }
    
    return await findEmployeeSchemaFieldById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to add employee schema field: ${error.message}`);
  }
};

// Find employee schema field by ID
const findEmployeeSchemaFieldById = async (id) => {
  try {
    const query = 'SELECT * FROM employee_schema_fields WHERE id = ? AND is_active = TRUE';
    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find employee schema field by ID: ${error.message}`);
  }
};

// Get employee schema fields
const findEmployeeSchemaFields = async (schemaId) => {
  try {
    const query = `
      SELECT *
      FROM employee_schema_fields
      WHERE schema_id = ? AND is_active = TRUE
      ORDER BY display_order ASC
    `;
    
    const { rows } = await executeQuery(query, [schemaId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find employee schema fields: ${error.message}`);
  }
};

// Update employee schema field
const updateEmployeeSchemaField = async (id, updateData) => {
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
    
    const query = `UPDATE employee_schema_fields SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findEmployeeSchemaFieldById(id);
  } catch (error) {
    throw new Error(`Failed to update employee schema field: ${error.message}`);
  }
};

// Delete employee schema field (soft delete)
const deleteEmployeeSchemaField = async (id) => {
  try {
    const query = 'UPDATE employee_schema_fields SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete employee schema field: ${error.message}`);
  }
};

// =====================================================
// EMPLOYEE FUNCTIONS
// =====================================================

// Create new employee
const createEmployee = async (employeeData) => {
  try {
    const {
      employee_id,
      schema_id,
      first_name,
      last_name,
      email,
      phone,
      department_id,
      position,
      employment_date,
      salary,
      status,
      profile_image,
      custom_data,
      created_by,
      user_id,
      welcome_email_sent,
      welcome_email_sent_at
    } = employeeData;

    const query = `
      INSERT INTO employees 
      (employee_id, schema_id, first_name, last_name, email, phone, department_id, 
       position, employment_date, salary, status, profile_image, custom_data, created_by,
       user_id, welcome_email_sent, welcome_email_sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      employee_id,
      schema_id,
      first_name,
      last_name,
      email ?? null,
      phone ?? null,
      department_id ?? null,
      position ?? null,
      employment_date ?? null,
      salary ?? null,
      status || 'active',
      profile_image ?? null,
      custom_data ? JSON.stringify(custom_data) : null,
      created_by,
      user_id ?? null,
      welcome_email_sent ?? false,
      welcome_email_sent_at ?? null
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Employee insert failed: insertId not returned');
    }
    
    return await findEmployeeById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create employee: ${error.message}`);
  }
};

// Find employee by ID
const findEmployeeById = async (id) => {
  try {
    const query = `
      SELECT e.*, es.schema_name, es.display_name as schema_display_name, u.username as created_by_username,
             d.name as department_name, d.code as department_code
      FROM employees e
      JOIN employee_schemas es ON e.schema_id = es.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find employee by ID: ${error.message}`);
  }
};

// Find employee by employee_id
const findEmployeeByEmployeeId = async (employeeId) => {
  try {
    const query = `
      SELECT e.*, es.schema_name, es.display_name as schema_display_name, u.username as created_by_username,
             d.name as department_name, d.code as department_code
      FROM employees e
      JOIN employee_schemas es ON e.schema_id = es.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.employee_id = ?
    `;

    const { rows } = await executeQuery(query, [employeeId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find employee by employee ID: ${error.message}`);
  }
};

// Get all employees (simple version without pagination)
const getAllEmployeesSimple = async () => {
  try {
    const query = `
      SELECT e.*, es.schema_name, es.display_name as schema_display_name, u.username as created_by_username,
             d.name as department_name, d.code as department_code
      FROM employees e
      LEFT JOIN employee_schemas es ON e.schema_id = es.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status != 'terminated'
      ORDER BY e.created_at DESC
    `;
    
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find employees: ${error.message}`);
  }
};

// Get all employees with pagination
const findAllEmployees = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '', schema_id = null, department = null, status = null } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.*, es.schema_name, es.display_name as schema_display_name, u.username as created_by_username,
             d.name as department_name, d.code as department_code
      FROM employees e
      JOIN employee_schemas es ON e.schema_id = es.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (schema_id) {
      query += ` AND e.schema_id = ?`;
      params.push(schema_id);
    }

    if (department) {
      query += ` AND e.department = ?`;
      params.push(department);
    }

    if (status) {
      query += ` AND e.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { rows } = await executeQuery(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM employees e
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (schema_id) {
      countQuery += ` AND e.schema_id = ?`;
      countParams.push(schema_id);
    }

    if (department) {
      countQuery += ` AND e.department = ?`;
      countParams.push(department);
    }

    if (status) {
      countQuery += ` AND e.status = ?`;
      countParams.push(status);
    }

    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;

    return {
      employees: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find employees: ${error.message}`);
  }
};

// Update employee
const updateEmployee = async (id, updateData) => {
  try {
    const allowedFields = [
      'employee_id', 'first_name', 'last_name', 'email', 'phone', 'department',
      'position', 'employment_date', 'salary', 'status', 'profile_image', 'custom_data'
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
    
    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findEmployeeById(id);
  } catch (error) {
    throw new Error(`Failed to update employee: ${error.message}`);
  }
};

// Delete employee
const deleteEmployee = async (id) => {
  try {
    const query = 'DELETE FROM employees WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete employee: ${error.message}`);
  }
};

// Get employees by department
const findEmployeesByDepartment = async (department) => {
  try {
    const query = `
      SELECT e.*, es.schema_name, es.display_name as schema_display_name
      FROM employees e
      JOIN employee_schemas es ON e.schema_id = es.id
      WHERE e.department = ? AND e.status = 'active'
      ORDER BY e.first_name, e.last_name
    `;

    const { rows } = await executeQuery(query, [department]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find employees by department: ${error.message}`);
  }
};

// Get employee statistics
const getEmployeeStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_employees,
        COUNT(CASE WHEN status = 'terminated' THEN 1 END) as terminated_employees,
        COUNT(CASE WHEN status = 'on_leave' THEN 1 END) as on_leave_employees,
        COUNT(DISTINCT department) as total_departments
      FROM employees
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get employee statistics: ${error.message}`);
  }
};

// Get departments
const getEmployeeDepartments = async () => {
  try {
    const query = `
      SELECT DISTINCT department, COUNT(*) as employee_count
      FROM employees
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY department
    `;

    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get employee departments: ${error.message}`);
  }
};

// Check if employee_id exists
const checkEmployeeIdExists = async (employeeId, excludeId = null) => {
  try {
    let query = `SELECT COUNT(*) as count FROM employees WHERE employee_id = ?`;
    const params = [employeeId];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const { rows } = await executeQuery(query, params);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check employee ID exists: ${error.message}`);
  }
};

// Check if email exists
const checkEmployeeEmailExists = async (email, excludeId = null) => {
  try {
    let query = `SELECT COUNT(*) as count FROM employees WHERE email = ?`;
    const params = [email];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const { rows } = await executeQuery(query, params);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check employee email exists: ${error.message}`);
  }
};

module.exports = {
  // Employee Schema functions
  createEmployeeSchema,
  findEmployeeSchemaById,
  getAllEmployeeSchemasSimple,
  findAllEmployeeSchemas,
  updateEmployeeSchema,
  deleteEmployeeSchema,
  
  // Employee Schema Field functions
  addEmployeeSchemaField,
  findEmployeeSchemaFieldById,
  findEmployeeSchemaFields,
  updateEmployeeSchemaField,
  deleteEmployeeSchemaField,
  
  // Employee functions
  createEmployee,
  findEmployeeById,
  findEmployeeByEmployeeId,
  getAllEmployeesSimple,
  findAllEmployees,
  updateEmployee,
  deleteEmployee,
  findEmployeesByDepartment,
  getEmployeeStats,
  getEmployeeDepartments,
  checkEmployeeIdExists,
  checkEmployeeEmailExists
};