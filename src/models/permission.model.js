const { executeQuery, executeTransaction } = require('../configs/db.config');

// Get all permissions without pagination (for Super Admin)
const getAllPermissionsSimple = async () => {
  try {
    const query = 'SELECT * FROM permissions WHERE is_active = 1 ORDER BY name';
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all permissions: ${error.message}`);
  }
};

// Create a new permission
const createPermission = async (permissionData) => {
  try {
    const { name, description, is_active = true } = permissionData;
    
    const query = `
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    
    const params = [name, description ?? null, is_active];
    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Permission insert failed: insertId not returned');
    }

    return await findPermissionById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create permission: ${error.message}`);
  }
};

// Find permission by ID
const findPermissionById = async (id) => {
  try {
    const query = 'SELECT * FROM permissions WHERE id = ?';
    const { rows } = await executeQuery(query, [id]);
    if (rows.length === 0) return null;
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to find permission by ID: ${error.message}`);
  }
};

// Find permission by name
const findPermissionByName = async (name) => {
  try {
    const query = 'SELECT * FROM permissions WHERE name = ?';
    const { rows } = await executeQuery(query, [name]);
    if (rows.length === 0) return null;
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to find permission by name: ${error.message}`);
  }
};

// Get all permissions with pagination
const findAllPermissions = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '', is_active = null } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM permissions WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (is_active !== null) {
      query += ` AND is_active = ?`;
      params.push(is_active);
    }
    
    query += ` ORDER BY name LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const { rows } = await executeQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM permissions WHERE 1=1';
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
      permissions: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find permissions: ${error.message}`);
  }
};

// Update permission
const updatePermission = async (id, updateData) => {
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
    
    const query = `UPDATE permissions SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findPermissionById(id);
  } catch (error) {
    throw new Error(`Failed to update permission: ${error.message}`);
  }
};

// Delete permission
const deletePermission = async (id) => {
  try {
    const roleQuery = 'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?';
    const { rows: roleRows } = await executeQuery(roleQuery, [id]);
    
    if (roleRows[0].count > 0) {
      throw new Error('Cannot delete permission that is assigned to roles');
    }
    
    const deleteQuery = 'DELETE FROM permissions WHERE id = ?';
    await executeQuery(deleteQuery, [id]);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to delete permission: ${error.message}`);
  }
};

// Soft delete permission (deactivate)
const softDeletePermission = async (id) => {
  try {
    const query = 'UPDATE permissions SET is_active = false, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to soft delete permission: ${error.message}`);
  }
};

// Get roles that have this permission
const getPermissionRoles = async (permission_id) => {
  try {
    const query = `
      SELECT r.*
      FROM roles r
      INNER JOIN role_permissions rp ON r.id = rp.role_id
      WHERE rp.permission_id = ?
      ORDER BY r.name
    `;
    
    const { rows } = await executeQuery(query, [permission_id]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get permission roles: ${error.message}`);
  }
};

// Check if permission is assigned to role
const permissionIsAssignedToRole = async (permission_id, role_id) => {
  try {
    const query = 'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ? AND role_id = ?';
    const { rows } = await executeQuery(query, [permission_id, role_id]);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check permission assignment: ${error.message}`);
  }
};

// Bulk create permissions (transaction + skip duplicates by name)
const bulkCreatePermissions = async (permissions) => {
  try {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error('Permissions array is required and must not be empty');
    }

    const createdPermissions = [];
    const errors_list = [];
    const queries = [];

    for (let i = 0; i < permissions.length; i++) {
      const { name, description, is_active = true } = permissions[i];

      // Skip duplicates by name
      const existingPermission = await findPermissionByName(name);
      if (existingPermission) {
        errors_list.push(`Permission ${name} already exists`);
        continue;
      }

      const query = `
        INSERT INTO permissions (name, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      const params = [name, description ?? null, is_active];

      queries.push({ query, params });
    }

    if (queries.length > 0) {
      const results = await executeTransaction(queries);
      const createdIds = results.map(r => r.insertId).filter(Boolean);

      for (const id of createdIds) {
        const perm = await findPermissionById(id);
        if (perm) createdPermissions.push(perm);
      }
    }

    return {
      createdPermissions,
      errors: errors_list,
      summary: {
        total: permissions.length,
        created: createdPermissions.length,
        skipped: errors_list.length
      }
    };
  } catch (error) {
    throw new Error(`Failed to bulk create permissions: ${error.message}`);
  }
};

module.exports = {
  getAllPermissionsSimple,
  createPermission,
  findPermissionById,
  findPermissionByName,
  findAllPermissions,
  updatePermission,
  deletePermission,
  softDeletePermission,
  getPermissionRoles,
  permissionIsAssignedToRole,
  bulkCreatePermissions
};
