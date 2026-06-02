const { executeQuery } = require('../configs/db.config');

// Get all departments without pagination (for testing)
const getAllDepartmentsSimple = async () => {
  try {
    const query = 'SELECT * FROM departments WHERE is_active = 1 ORDER BY name';
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all departments: ${error.message}`);
  }
};

// =====================================================
// DEPARTMENT FUNCTIONS
// =====================================================

// Create a new department
const createDepartment = async (departmentData) => {
  try {
    const {
      name,
      code,
      description,
      manager_id,
      budget,
      location,
      phone,
      email,
      is_active = true,
      created_by
    } = departmentData;

    const query = `
      INSERT INTO departments (
        name, code, description, manager_id, budget, location, phone, email, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      name,
      code,
      description || null,
      manager_id || null,
      budget || 0,
      location || null,
      phone || null,
      email || null,
      is_active,
      created_by || null
    ];

    const result = await executeQuery(query, params);
    return result.insertId;
  } catch (error) {
    throw new Error(`Failed to create department: ${error.message}`);
  }
};

// Find department by ID
const findDepartmentById = async (id) => {
  try {
    const query = `
      SELECT d.*, 
             CONCAT(e.first_name, ' ', e.last_name) as manager_name,
             e.email as manager_email,
             COUNT(emp.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN employees emp ON emp.department_id = d.id
      WHERE d.id = ?
      GROUP BY d.id
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to find department by ID: ${error.message}`);
  }
};

// Find department by name
const findDepartmentByName = async (name) => {
  try {
    const query = `
      SELECT d.*, 
             CONCAT(e.first_name, ' ', e.last_name) as manager_name,
             COUNT(emp.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN employees emp ON emp.department_id = d.id
      WHERE d.name = ?
      GROUP BY d.id
    `;

    const { rows } = await executeQuery(query, [name]);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to find department by name: ${error.message}`);
  }
};

// Find all departments
const findAllDepartments = async (options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      is_active = null,
      sort_by = 'name',
      sort_order = 'ASC'
    } = options;

    let query = `
      SELECT d.*, 
             CONCAT(e.first_name, ' ', e.last_name) as manager_name,
             e.email as manager_email,
             COUNT(emp.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN employees emp ON emp.department_id = d.id
      WHERE 1=1
    `;

    const params = [];

    // Search filter
    if (search) {
      query += ` AND (d.name LIKE ? OR d.description LIKE ? OR d.code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Active filter
    if (is_active !== null) {
      query += ` AND d.is_active = ?`;
      params.push(is_active);
    }

    query += ` GROUP BY d.id`;

    // Sorting
    const allowedSortFields = ['name', 'code', 'budget', 'employee_count', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'name';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { rows } = await executeQuery(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM departments d
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (d.name LIKE ? OR d.description LIKE ? OR d.code LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (is_active !== null) {
      countQuery += ` AND d.is_active = ?`;
      countParams.push(is_active);
    }

    const { rows: countResult } = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    return {
      departments: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find all departments: ${error.message}`);
  }
};

// Update department
const updateDepartment = async (id, updateData) => {
  try {
    const updates = [];
    const params = [];
    
    // Build dynamic update query based on provided fields
    const allowedFields = ['name', 'code', 'description', 'manager_id', 'budget', 'location', 'phone', 'email', 'is_active'];
    
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        updates.push(`${field} = ?`);
        params.push(updateData[field] ?? null);
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // Always update the timestamp
    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await executeQuery(query, params);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to update department: ${error.message}`);
  }
};

// Delete department
const deleteDepartment = async (id) => {
  try {
    // First, set all employees' department_id to NULL
    await executeQuery('UPDATE employees SET department_id = NULL WHERE department_id = ?', [id]);
    
    // Then delete the department
    const result = await executeQuery('DELETE FROM departments WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to delete department: ${error.message}`);
  }
};

// Get department statistics
const getDepartmentStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_departments,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_departments,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_departments,
        SUM(budget) as total_budget,
        AVG(budget) as average_budget,
        COUNT(CASE WHEN manager_id IS NOT NULL THEN 1 END) as departments_with_managers
      FROM departments
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get department stats: ${error.message}`);
  }
};

// Get employees by department
const getEmployeesByDepartment = async (departmentId) => {
  try {
    const query = `
      SELECT e.*, es.schema_name
      FROM employees e
      LEFT JOIN employee_schemas es ON e.schema_id = es.id
      WHERE e.department_id = ? AND e.status = 'active'
      ORDER BY e.first_name, e.last_name
    `;

    const { rows } = await executeQuery(query, [departmentId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get employees by department: ${error.message}`);
  }
};

// Check if department name exists
const checkDepartmentNameExists = async (name, excludeId = null) => {
  try {
    let query = 'SELECT id FROM departments WHERE name = ?';
    const params = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const { rows } = await executeQuery(query, params);
    return rows.length > 0;
  } catch (error) {
    throw new Error(`Failed to check department name exists: ${error.message}`);
  }
};

// Check if department code exists
const checkDepartmentCodeExists = async (code, excludeId = null) => {
  try {
    let query = 'SELECT id FROM departments WHERE code = ?';
    const params = [code];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const { rows } = await executeQuery(query, params);
    return rows.length > 0;
  } catch (error) {
    throw new Error(`Failed to check department code exists: ${error.message}`);
  }
};

module.exports = {
  createDepartment,
  getAllDepartmentsSimple,
  findDepartmentById,
  findDepartmentByName,
  findAllDepartments,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
  getEmployeesByDepartment,
  checkDepartmentNameExists,
  checkDepartmentCodeExists
};
