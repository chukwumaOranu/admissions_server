const { executeQuery } = require('../configs/db.config');

/**
 * Generate a unique username from employee name
 * @param {string} firstName - Employee's first name
 * @param {string} lastName - Employee's last name
 * @returns {Promise<string>} - Unique username
 */
const generateUsername = async (firstName, lastName) => {
  try {
    // Clean and normalize names
    const cleanFirst = firstName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const cleanLast = lastName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    
    // Strategy 1: firstname.lastname
    let username = `${cleanFirst}.${cleanLast}`;
    if (await isUsernameAvailable(username)) {
      return username;
    }
    
    // Strategy 2: firstInitial + lastname
    username = `${cleanFirst.charAt(0)}${cleanLast}`;
    if (await isUsernameAvailable(username)) {
      return username;
    }
    
    // Strategy 3: firstname + lastInitial
    username = `${cleanFirst}${cleanLast.charAt(0)}`;
    if (await isUsernameAvailable(username)) {
      return username;
    }
    
    // Strategy 4: firstname.lastname + year
    const year = new Date().getFullYear();
    username = `${cleanFirst}.${cleanLast}${year}`;
    if (await isUsernameAvailable(username)) {
      return username;
    }
    
    // Strategy 5: firstname.lastname + random 4 digits
    let counter = 1;
    const baseUsername = `${cleanFirst}.${cleanLast}`;
    while (counter < 10000) {
      username = `${baseUsername}${counter}`;
      if (await isUsernameAvailable(username)) {
        return username;
      }
      counter++;
    }
    
    // Strategy 6: If all else fails, use random string
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    username = `${cleanFirst}.${randomSuffix}`;
    
    return username;
  } catch (error) {
    throw new Error(`Failed to generate username: ${error.message}`);
  }
};

/**
 * Check if username is available
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} - True if available, false otherwise
 */
const isUsernameAvailable = async (username) => {
  try {
    const query = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
    const { rows } = await executeQuery(query, [username]);
    return rows[0].count === 0;
  } catch (error) {
    throw new Error(`Failed to check username availability: ${error.message}`);
  }
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Generated password
 */
const generatePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '@#$!%*?&';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to randomize character positions
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  return password;
};

/**
 * Generate a default password pattern
 * @param {string} type - Pattern type: 'welcome', 'employee', 'year'
 * @returns {string} - Generated password
 */
const generateDefaultPassword = (type = 'welcome') => {
  const year = new Date().getFullYear();
  
  switch (type) {
    case 'welcome':
      return `Welcome@${year}`;
    case 'employee':
      return `Employee@${year}`;
    case 'year':
      return `Pass@${year}`;
    default:
      return `Welcome@${year}`;
  }
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with score and feedback
 */
const validatePasswordStrength = (password) => {
  const result = {
    isValid: false,
    score: 0,
    feedback: []
  };
  
  // Check length
  if (password.length < 8) {
    result.feedback.push('Password must be at least 8 characters long');
  } else {
    result.score += 25;
  }
  
  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    result.feedback.push('Password must contain at least one uppercase letter');
  } else {
    result.score += 25;
  }
  
  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    result.feedback.push('Password must contain at least one lowercase letter');
  } else {
    result.score += 25;
  }
  
  // Check for numbers
  if (!/[0-9]/.test(password)) {
    result.feedback.push('Password must contain at least one number');
  } else {
    result.score += 15;
  }
  
  // Check for symbols
  if (!/[@#$!%*?&]/.test(password)) {
    result.feedback.push('Password must contain at least one symbol (@#$!%*?&)');
  } else {
    result.score += 10;
  }
  
  result.isValid = result.score >= 75;
  
  return result;
};

/**
 * Create user account from employee/student data
 * @param {object} userData - User information (first_name, last_name, email)
 * @param {object} options - Creation options (useDefaultPassword, role_id)
 * @returns {Promise<object>} - Created user with credentials
 */
const createUserFromEmployee = async (userData, options = {}) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Generate username
    const username = await generateUsername(userData.first_name, userData.last_name);
    
    // Generate password
    const plainPassword = options.useDefaultPassword 
      ? generateDefaultPassword('welcome')
      : generatePassword(12);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Create user record with optional role_id and temp_password
    const query = `
      INSERT INTO users (username, email, password, temp_password, role_id, is_active, email_verified, created_at)
      VALUES (?, ?, ?, ?, ?, true, false, CURRENT_TIMESTAMP)
    `;
    
    const { insertId } = await executeQuery(query, [
      username,
      userData.email,
      hashedPassword,
      plainPassword,  // Store plain password temporarily for student accounts
      options.role_id ?? null  // Auto-assign role if provided
    ]);
    
    // Return user data with plain password (only time it's available)
    return {
      userId: insertId,
      username,
      email: userData.email,
      password: plainPassword, // Plain text - only returned once!
      passwordMustChange: true,
      role_id: options.role_id ?? null
    };
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

module.exports = {
  generateUsername,
  isUsernameAvailable,
  generatePassword,
  generateDefaultPassword,
  validatePasswordStrength,
  createUserFromEmployee
};

