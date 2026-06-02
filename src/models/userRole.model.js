const { executeQuery } = require('../configs/db.config');

// Assign user to role
const assignUserToRole = async (user_id, role_id) => {
  try {
    // Get user
    const { rows } = await executeQuery('SELECT role_id FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    
    // Only check if user is already assigned to this role if the current role exists
    if (rows[0].role_id === role_id) {
      throw new Error('User is already assigned to this role');
    }

    // Update user's role
    const updateQuery = 'UPDATE users SET role_id = ?, updated_at = NOW() WHERE id = ?';
    await executeQuery(updateQuery, [role_id, user_id]);

    return true;
  } catch (error) {
    throw new Error(`Failed to assign user to role: ${error.message}`);
  }
};

// Remove user from role (set to default role_id = 2)
const removeUserFromRole = async (user_id, role_id) => {
  try {
    const { rows } = await executeQuery('SELECT role_id FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    if (rows[0].role_id !== role_id) {
      throw new Error('User is not assigned to this role');
    }

    const updateQuery = 'UPDATE users SET role_id = NULL, updated_at = NOW() WHERE id = ?';
    await executeQuery(updateQuery, [user_id]);

    return true;
  } catch (error) {
    throw new Error(`Failed to remove user from role: ${error.message}`);
  }
};

// Get user roles (really just the one role)
const getUserRoles = async (user_id) => {
  try {
    const query = `
      SELECT r.*
      FROM roles r
      INNER JOIN users u ON r.id = u.role_id
      WHERE u.id = ?
    `;
    const { rows } = await executeQuery(query, [user_id]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get user roles: ${error.message}`);
  }
};

// Get all users for a given role
const getRoleUsers = async (role_id) => {
  try {
    const query = `
      SELECT u.id, u.username, u.email, u.is_active, u.created_at, u.updated_at
      FROM users u
      WHERE u.role_id = ?
      ORDER BY u.created_at DESC
    `;
    const { rows } = await executeQuery(query, [role_id]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get role users: ${error.message}`);
  }
};

// Get permissions for a role
const getRolePermissions = async (role_id) => {
  try {
    const query = `
      SELECT DISTINCT p.*
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `;
    const { rows } = await executeQuery(query, [role_id]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get role permissions: ${error.message}`);
  }
};

// Check if role has permission
const roleHasPermission = async (role_id, permissionName) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.name = ?
    `;
    const { rows } = await executeQuery(query, [role_id, permissionName]);
    return rows[0].count > 0;
  } catch (error) {
    throw new Error(`Failed to check permission: ${error.message}`);
  }
};

// Get user permissions (get role first, then permissions for that role)
const getUserPermissions = async (user_id) => {
  try {
    // First get user's role
    const userQuery = 'SELECT role_id FROM users WHERE id = ?';
    const { rows: userRows } = await executeQuery(userQuery, [user_id]);
    
    if (userRows.length === 0) {
      throw new Error('User not found');
    }
    
    const role_id = userRows[0].role_id;
    if (!role_id) {
      return []; // User has no role assigned
    }
    
    // Get permissions for the user's role
    return await getRolePermissions(role_id);
  } catch (error) {
    throw new Error(`Failed to get user permissions: ${error.message}`);
  }
};

// Check if user has a specific permission
const userHasPermission = async (user_id, permissionName) => {
  try {
    // First get user's role
    const userQuery = 'SELECT role_id FROM users WHERE id = ?';
    const { rows: userRows } = await executeQuery(userQuery, [user_id]);
    
    if (userRows.length === 0) {
      throw new Error('User not found');
    }
    
    const role_id = userRows[0].role_id;
    if (!role_id) {
      return false; // User has no role assigned
    }
    
    // Check if the role has the permission
    return await roleHasPermission(role_id, permissionName);
  } catch (error) {
    throw new Error(`Failed to check user permission: ${error.message}`);
  }
};

module.exports = {
  assignUserToRole,
  removeUserFromRole,
  getUserRoles,
  getRoleUsers,
  getRolePermissions,
  roleHasPermission,
  getUserPermissions,
  userHasPermission
};
