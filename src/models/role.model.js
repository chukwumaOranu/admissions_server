const { executeQuery } = require('../configs/db.config');

// Get all roles without pagination (for testing)
const getAllRolesSimple = async () => {
  try {
    const query = 'SELECT * FROM roles ORDER BY name';
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all roles: ${error.message}`);
  }
};

// Create a new role
const createRole = async (roleData) => {
  try {
    const { name, description, is_active = true } = roleData;
    
    const query = `
      INSERT INTO roles (name, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    
    const params = [name, description ?? null, is_active];
    const result = await executeQuery(query, params);

    if (!result.insertId) {
      throw new Error('Role insert failed: insertId not returned');
    }

    return await findRoleById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create role: ${error.message}`);
  }
};

// Find role by ID
const findRoleById = async (id) => {
  try {
    const query = 'SELECT * FROM roles WHERE id = ?';
    const { rows } = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to find role by ID: ${error.message}`);
  }
};

// Find role by name
const findRoleByName = async (name) => {
  try {
    const query = 'SELECT * FROM roles WHERE name = ?';
    const { rows } = await executeQuery(query, [name]);
    
    if (rows.length === 0) return null;
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to find role by name: ${error.message}`);
  }
};

// Get all roles with pagination
const findAllRoles = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '', is_active = null } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM roles WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (is_active !== null) {
      query += ` AND is_active = ?`;
      params.push(is_active);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const { rows } = await executeQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM roles WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (name LIKE ? OR description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (is_active !== null) {
      countQuery += ` AND is_active = ?`;
      countParams.push(is_active);
    }
    
    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;
    
    return {
      roles: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find roles: ${error.message}`);
  }
};

// Update role
const updateRole = async (id, updateData) => {
  try {
    const allowedFields = ['name', 'description', 'is_active'];
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
    
    const query = `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findRoleById(id);
  } catch (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }
};

// Delete role
const deleteRole = async (id) => {
  try {
    const userQuery = 'SELECT COUNT(*) as count FROM users WHERE role_id = ?';
    const { rows: userRows } = await executeQuery(userQuery, [id]);
    
    if (userRows[0].count > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }
    
    const deletePermissionsQuery = 'DELETE FROM role_permissions WHERE role_id = ?';
    await executeQuery(deletePermissionsQuery, [id]);
    
    const deleteRoleQuery = 'DELETE FROM roles WHERE id = ?';
    await executeQuery(deleteRoleQuery, [id]);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to delete role: ${error.message}`);
  }
};

// Soft delete role (deactivate)
const softDeleteRole = async (id) => {
  try {
    const query = 'UPDATE roles SET is_active = false, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to soft delete role: ${error.message}`);
  }
};

module.exports = {
  getAllRolesSimple,
  createRole,
  findRoleById,
  findRoleByName,
  findAllRoles,
  updateRole,
  deleteRole,
  softDeleteRole
};
