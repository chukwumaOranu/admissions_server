const { executeQuery } = require('../configs/db.config');
const bcrypt = require('bcryptjs');

// Get all users without pagination (for testing)
const getAllUsersSimple = async () => {
  try {
    const query = `
      SELECT u.*, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = 1 
      ORDER BY u.username
    `;
    const { rows } = await executeQuery(query, []);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get all users: ${error.message}`);
  }
};

// Create a new user
const createUser = async (userData) => {
  try {
    const { username, email, password } = userData;
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (username, email, password, is_active, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [username, email, hashedPassword, true, false];
    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('User insert failed: insertId not returned');
    }

    return await findUserById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

// Find user by ID
const findUserById = async (id) => {
  try {
    const query = `SELECT u.* FROM users u WHERE u.id = ?`;
    const { rows } = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    return userToSafeObject(rows[0]);
  } catch (error) {
    throw new Error(`Failed to find user by ID: ${error.message}`);
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  try {
    const query = `SELECT u.* FROM users u WHERE u.email = ?`;
    const { rows } = await executeQuery(query, [email]);
    
    if (rows.length === 0) return null;
    return userToSafeObject(rows[0]);
  } catch (error) {
    throw new Error(`Failed to find user by email: ${error.message}`);
  }
};

// Find user by username
const findUserByUsername = async (username) => {
  try {
    const query = `SELECT u.* FROM users u WHERE u.username = ?`;
    const result = await executeQuery(query, [username]);
    
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to find user by username: ${error.message}`);
  }
};

// Find user by application ID
const findUserByApplicationId = async (applicationId) => {
  try {
    const query = `
      SELECT u.*
      FROM users u
      JOIN applicants a ON u.id = a.user_id
      WHERE a.id = ?
    `;
    const { rows } = await executeQuery(query, [applicationId]);
    
    if (rows.length === 0) return null;
    return userToSafeObject(rows[0]);
  } catch (error) {
    throw new Error(`Failed to find user by application ID: ${error.message}`);
  }
};

// Get all users with pagination
const findAllUsers = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.*
      FROM users u
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const { rows } = await executeQuery(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
    `;
    
    const countParams = [];
    if (search) {
      countQuery += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;
    
    return {
      users: rows.map(userToSafeObject),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    throw new Error(`Failed to find users: ${error.message}`);
  }
};

// Update user
const updateUser = async (id, updateData) => {
  try {
    const allowedFields = ['username', 'email', 'is_active', 'email_verified'];
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
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findUserById(id);
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};

// Change password
const changeUserPassword = async (id, newPassword) => {
  try {
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const updateQuery = 'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?';
    await executeQuery(updateQuery, [hashedNewPassword, id]);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to change password: ${error.message}`);
  }
};

// Verify password
const verifyUserPassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error(`Failed to verify password: ${error.message}`);
  }
};

// Delete user
const deleteUser = async (id) => {
  try {
    const query = 'DELETE FROM users WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

// Soft delete user (deactivate)
const softDeleteUser = async (id) => {
  try {
    const query = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to soft delete user: ${error.message}`);
  }
};

// Convert user to safe object for API responses
const userToSafeObject = (user) => {
  if (!user) return null;
  // Remove hashed password but keep temp_password for student accounts
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

module.exports = {
  createUser,
  getAllUsersSimple,
  findUserById,
  findUserByEmail,
  findUserByUsername,
  findUserByApplicationId,
  findAllUsers,
  updateUser,
  changeUserPassword,
  verifyUserPassword,
  deleteUser,
  softDeleteUser,
  userToSafeObject
};
