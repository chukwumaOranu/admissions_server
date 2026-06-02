const {
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
} = require('../models/employee.model');

const { createUserFromEmployee } = require('../utils/userCredentials.utils');
const { processProfilePhoto, deletePhotoFile } = require('../utils/imageProcessor.utils');
const emailService = require('../utils/emailService');

// =====================================================
// EMPLOYEE CONTROLLER FUNCTIONS
// =====================================================

// Create new employee
const createEmployeeController = async (req, res) => {
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
      // NEW: User account creation options
      create_user_account = false,
      send_welcome_email = false
    } = req.body;

    const created_by = req.user.id; // From authentication middleware

    // Validate required fields
    if (!employee_id || !schema_id || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, schema ID, first name, and last name are required'
      });
    }

    // If creating user account, email is required
    if (create_user_account && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to create user account'
      });
    }

    // Check if employee ID already exists
    const employeeIdExists = await checkEmployeeIdExists(employee_id);
    if (employeeIdExists) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    // Check if email already exists in employees table
    if (email) {
      const emailExists = await checkEmployeeEmailExists(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in employees'
        });
      }
    }

    // Check if email already exists in users table (if creating user account)
    if (create_user_account && email) {
      const { executeQuery } = require('../configs/db.config');
      const { rows } = await executeQuery('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
      if (rows[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in users table'
        });
      }
    }

    let userCredentials = null;
    let userId = null;

    // Create user account if requested
    if (create_user_account) {
      try {
        userCredentials = await createUserFromEmployee(
          { first_name, last_name, email },
          { useDefaultPassword: false }
        );
        userId = userCredentials.userId;
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account',
          error: error.message
        });
      }
    }

    // Create employee with user_id link
    const employeeData = {
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
      status: status || 'active',
      profile_image,
      custom_data,
      created_by,
      user_id: userId,
      welcome_email_sent: send_welcome_email && create_user_account,
      welcome_email_sent_at: send_welcome_email && create_user_account ? new Date() : null
    };

    const employee = await createEmployee(employeeData);

    // Send welcome email if requested and user account was created
    let emailResult = null;
    if (send_welcome_email && create_user_account && email) {
      try {
        await emailService.initialize();
        emailResult = await emailService.sendWelcomeEmailToEmployee(
          { email, first_name, last_name, employee_id },
          { username: userCredentials.username, password: userCredentials.password }
        );
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to employee:', email);
        } else {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        emailResult = { success: false, error: error.message };
      }
    }

    // Prepare response
    const responseData = {
      employee,
      userAccount: create_user_account ? {
        created: true,
        username: userCredentials.username,
        password: userCredentials.password, // ONLY SHOWN ONCE!
        email: userCredentials.email,
        passwordMustChange: true
      } : {
        created: false
      },
      emailSent: emailResult ? {
        success: emailResult.success,
        message: emailResult.success ? 'Welcome email sent successfully' : emailResult.error
      } : null
    };

    res.status(201).json({
      success: true,
      message: create_user_account 
        ? 'Employee and user account created successfully' 
        : 'Employee created successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all employees (simple version)
const getAllEmployeesController = async (req, res) => {
  try {
    const employees = await getAllEmployeesSimple();

    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: {
        employees: employees,
        count: employees.length
      }
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get employee by ID
const getEmployeeByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await findEmployeeById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get employee by employee ID
const getEmployeeByEmployeeIdController = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await findEmployeeByEmployeeId(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update employee
const updateEmployeeController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if employee exists
    const existingEmployee = await findEmployeeById(id);
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if employee ID already exists (if being updated)
    if (updateData.employee_id && updateData.employee_id !== existingEmployee.employee_id) {
      const employeeIdExists = await checkEmployeeIdExists(updateData.employee_id, id);
      if (employeeIdExists) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }
    }

    // Check if email already exists (if being updated)
    if (updateData.email && updateData.email !== existingEmployee.email) {
      const emailExists = await checkEmployeeEmailExists(updateData.email, id);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update employee
    const updatedEmployee = await updateEmployee(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete employee
const deleteEmployeeController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const existingEmployee = await findEmployeeById(id);
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete employee
    await deleteEmployee(id);

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get employees by department
const getEmployeesByDepartmentController = async (req, res) => {
  try {
    const { department } = req.params;

    const employees = await findEmployeesByDepartment(department);

    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: employees
    });

  } catch (error) {
    console.error('Error fetching employees by department:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get employee statistics
const getEmployeeStatsController = async (req, res) => {
  try {
    const stats = await getEmployeeStats();

    res.status(200).json({
      success: true,
      message: 'Employee statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get employee departments
const getEmployeeDepartmentsController = async (req, res) => {
  try {
    const departments = await getEmployeeDepartments();

    res.status(200).json({
      success: true,
      message: 'Employee departments retrieved successfully',
      data: departments
    });

  } catch (error) {
    console.error('Error fetching employee departments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if employee ID exists
const checkEmployeeIdExistsController = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { excludeId } = req.query;

    const exists = await checkEmployeeIdExists(employeeId, excludeId);

    res.status(200).json({
      success: true,
      message: 'Employee ID check completed',
      data: { exists }
    });

  } catch (error) {
    console.error('Error checking employee ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if email exists
const checkEmployeeEmailExistsController = async (req, res) => {
  try {
    const { email } = req.params;
    const { excludeId } = req.query;

    const exists = await checkEmployeeEmailExists(email, excludeId);

    res.status(200).json({
      success: true,
      message: 'Email check completed',
      data: { exists }
    });

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload employee profile image
const uploadProfileImageController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }
    
    // Find employee
    const employee = await findEmployeeById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check authorization (admin or the employee themselves)
    if (req.user.id !== employee.user_id && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this photo'
      });
    }
    
    // Process image with Sharp
    const photoUrl = await processProfilePhoto(req.file.path, id);
    
    // Delete old photo if exists
    if (employee.profile_image) {
      deletePhotoFile(employee.profile_image);
    }
    
    // Update database
    await updateEmployee(id, { profile_image: photoUrl });
    
    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profile_image: photoUrl
      }
    });
    
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
};

/**
 * Delete employee profile photo
 */
const deleteProfilePhotoController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find employee
    const employee = await findEmployeeById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check authorization
    if (req.user.id !== employee.user_id && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this photo'
      });
    }
    
    // Delete photo file
    if (employee.profile_image) {
      deletePhotoFile(employee.profile_image);
    }
    
    // Update database
    await updateEmployee(id, { profile_image: null });
    
    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: error.message
    });
  }
};

// Search employees
const searchEmployeesController = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const options = {
      page: 1,
      limit: parseInt(limit),
      search: q.trim()
    };

    const result = await findAllEmployees(options);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: result.employees,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error searching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get employee dashboard data
const getEmployeeDashboardController = async (req, res) => {
  try {
    const [stats, departments, recentEmployees] = await Promise.all([
      getEmployeeStats(),
      getEmployeeDepartments(),
      findAllEmployees({ page: 1, limit: 5 })
    ]);

    res.status(200).json({
      success: true,
      message: 'Employee dashboard data retrieved successfully',
      data: {
        stats,
        departments,
        recentEmployees: recentEmployees.employees
      }
    });

  } catch (error) {
    console.error('Error fetching employee dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create user login for existing employee
const createEmployeeLoginController = async (req, res) => {
  try {
    const { id } = req.params;
    const { send_welcome_email = false } = req.body;

    // Get employee details
    const employee = await findEmployeeById(id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if employee already has a user account
    if (employee.user_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee already has a user account'
      });
    }

    // Check if email exists
    if (!employee.email) {
      return res.status(400).json({
        success: false,
        message: 'Employee must have an email address to create user account'
      });
    }

    // Check if email already exists in users table
    const { executeQuery } = require('../configs/db.config');
    const { rows } = await executeQuery('SELECT COUNT(*) as count FROM users WHERE email = ?', [employee.email]);
    if (rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists in users table'
      });
    }

    // Create user account
    const userCredentials = await createUserFromEmployee(
      { 
        first_name: employee.first_name, 
        last_name: employee.last_name, 
        email: employee.email 
      },
      { useDefaultPassword: false }
    );

    // Update employee with user_id
    const updateQuery = `
      UPDATE employees 
      SET user_id = ?, 
          welcome_email_sent = ?, 
          welcome_email_sent_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      userCredentials.userId,
      send_welcome_email,
      send_welcome_email ? new Date() : null,
      id
    ]);

    // Get updated employee
    const updatedEmployee = await findEmployeeById(id);

    // Send welcome email if requested
    let emailResult = null;
    if (send_welcome_email && employee.email) {
      try {
        await emailService.initialize();
        emailResult = await emailService.sendWelcomeEmailToEmployee(
          { 
            email: employee.email, 
            first_name: employee.first_name, 
            last_name: employee.last_name, 
            employee_id: employee.employee_id 
          },
          { username: userCredentials.username, password: userCredentials.password }
        );
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to employee:', employee.email);
        } else {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        emailResult = { success: false, error: error.message };
      }
    }

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        employee: updatedEmployee,
        userAccount: {
          created: true,
          username: userCredentials.username,
          password: userCredentials.password, // ONLY SHOWN ONCE!
          email: userCredentials.email,
          passwordMustChange: true
        },
        emailSent: emailResult ? {
          success: emailResult.success,
          message: emailResult.success ? 'Welcome email sent successfully' : emailResult.error
        } : null
      }
    });

  } catch (error) {
    console.error('Error creating employee login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user account',
      error: error.message
    });
  }
};

module.exports = {
  createEmployeeController,
  getAllEmployeesController,
  getEmployeeByIdController,
  getEmployeeByEmployeeIdController,
  updateEmployeeController,
  deleteEmployeeController,
  getEmployeesByDepartmentController,
  getEmployeeStatsController,
  getEmployeeDepartmentsController,
  checkEmployeeIdExistsController,
  checkEmployeeEmailExistsController,
  uploadProfileImageController,
  deleteProfilePhotoController,
  searchEmployeesController,
  getEmployeeDashboardController,
  createEmployeeLoginController
};