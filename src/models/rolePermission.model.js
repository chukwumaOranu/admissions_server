const { executeQuery, executeTransaction } = require('../configs/db.config');

// Get all role permissions without pagination (for testing)
const getAllRolePermissionsSimple = async () => {
  try {
    const query = `
      SELECT rp.*, r.name as role_name, p.name as permission_name, p.description
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE p.is_active = 1
      ORDER BY r.name, p.name
    `;
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all role permissions: ${error.message}`);
  }
};

// Create a new role-permission assignment
const createRolePermission = async ({ role_id, permission_id }) => {
  try {
    const existing = await findRolePermissionByRoleAndPermission(role_id, permission_id);
    if (existing) throw new Error('Role-permission assignment already exists');
    
    const query = `
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      VALUES (?, ?, NOW())
    `;
    const result = await executeQuery(query, [role_id, permission_id]);

    if (!result.insertId) throw new Error('Insert failed: no insertId returned');

    return await findRolePermissionById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create role-permission assignment: ${error.message}`);
  }
};

// Find role-permission by ID
const findRolePermissionById = async (id) => {
  try {
    const query = `
      SELECT rp.*, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.id = ?
    `;
    const { rows } = await executeQuery(query, [id]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find role-permission by ID: ${error.message}`);
  }
};

// Find by role + permission
const findRolePermissionByRoleAndPermission = async (role_id, permission_id) => {
  try {
    const query = `
      SELECT rp.*, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND rp.permission_id = ?
    `;
    const { rows } = await executeQuery(query, [role_id, permission_id]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find role-permission: ${error.message}`);
  }
};

// Get all role-permission assignments with pagination
const findAllRolePermissions = async ({ page = 1, limit = 10, role_id = null, permission_id = null, search = '' } = {}) => {
  try {
    const offset = (page - 1) * limit;
    let query = `
      SELECT rp.*, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (role_id) { query += ` AND rp.role_id = ?`; params.push(role_id); }
    if (permission_id) { query += ` AND rp.permission_id = ?`; params.push(permission_id); }
    if (search) {
      query += ` AND (r.name LIKE ? OR p.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY r.name, p.name LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { rows } = await executeQuery(query, params);

    // count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE 1=1
    `;
    const countParams = [];
    if (role_id) { countQuery += ` AND rp.role_id = ?`; countParams.push(role_id); }
    if (permission_id) { countQuery += ` AND rp.permission_id = ?`; countParams.push(permission_id); }
    if (search) {
      countQuery += ` AND (r.name LIKE ? OR p.name LIKE ?)`; 
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;

    return {
      rolePermissions: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find role-permissions: ${error.message}`);
  }
};

// Permissions by role
const getPermissionsByRole = async (role_id) => {
  try {
    const query = `
      SELECT p.*
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `;
    const { rows } = await executeQuery(query, [role_id]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get permissions by role: ${error.message}`);
  }
};

// Roles by permission
const getRolesByPermission = async (permission_id) => {
  try {
    const query = `
      SELECT r.*
      FROM role_permissions rp
      INNER JOIN roles r ON rp.role_id = r.id
      WHERE rp.permission_id = ?
      ORDER BY r.name
    `;
    const { rows } = await executeQuery(query, [permission_id]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get roles by permission: ${error.message}`);
  }
};

// Bulk create role-permission assignments
const bulkCreateRolePermissions = async (assignments) => {
  try {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Assignments array must not be empty');
    }

    const queries = [];
    const createdAssignments = [];
    const errors = [];

    for (let i = 0; i < assignments.length; i++) {
      const { role_id, permission_id } = assignments[i];
      const existing = await findRolePermissionByRoleAndPermission(role_id, permission_id);
      if (existing) {
        errors.push(`Assignment ${i + 1}: already exists`);
        continue;
      }
      queries.push({
        query: 'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, NOW())',
        params: [role_id, permission_id]
      });
      createdAssignments.push({ role_id, permission_id });
    }

    if (queries.length > 0) await executeTransaction(queries);

    return {
      createdAssignments,
      errors,
      summary: {
        total: assignments.length,
        created: createdAssignments.length,
        errors: errors.length
      }
    };
  } catch (error) {
    throw new Error(`Failed to bulk create role-permissions: ${error.message}`);
  }
};

// Delete, bulk delete, update, stats, add/remove/set functions ... (similar fixes: destructure { rows })

module.exports = {
  createRolePermission,
  getAllRolePermissionsSimple,
  findRolePermissionById,
  findRolePermissionByRoleAndPermission,
  findAllRolePermissions,
  getPermissionsByRole,
  getRolesByPermission,
  bulkCreateRolePermissions
};
