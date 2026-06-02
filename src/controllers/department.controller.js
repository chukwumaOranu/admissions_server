const {
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
} = require('../models/department.model');

// Create department
const createDepartmentController = async (req, res) => {
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
      is_active = true
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Check if department name already exists
    const nameExists = await checkDepartmentNameExists(name);
    if (nameExists) {
      return res.status(400).json({
        success: false,
        message: 'Department name already exists'
      });
    }

    // Auto-generate code from name if not provided
    let departmentCode = code;
    if (!departmentCode) {
      // Generate code from first letters of words in name, max 6 chars
      departmentCode = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 6);
      
      // If code exists, append a number
      let counter = 1;
      let originalCode = departmentCode;
      while (await checkDepartmentCodeExists(departmentCode)) {
        departmentCode = `${originalCode}${counter}`;
        counter++;
      }
    } else {
      // Check if provided code already exists
      const codeExists = await checkDepartmentCodeExists(code);
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Department code already exists'
        });
      }
    }

    const departmentData = {
      name,
      code: departmentCode,
      description,
      manager_id,
      budget: budget || 0,
      location,
      phone,
      email,
      is_active,
      created_by: req.user.id
    };

    const departmentId = await createDepartment(departmentData);
    const department = await findDepartmentById(departmentId);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
};

// Get all departments
const getAllDepartmentsController = async (req, res) => {
  try {
    // Use simple function to avoid pagination issues
    const departments = await getAllDepartmentsSimple();

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: {
        departments,
        count: departments.length
      }
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};

// Get department by ID
const getDepartmentByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await findDepartmentById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
};

// Update department
const updateDepartmentController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if department exists
    const existingDepartment = await findDepartmentById(id);
    if (!existingDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if new name already exists (if name is being updated)
    if (updateData.name && updateData.name !== existingDepartment.name) {
      const nameExists = await checkDepartmentNameExists(updateData.name, id);
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Department name already exists'
        });
      }
    }

    // Check if new code already exists (if code is being updated)
    if (updateData.code && updateData.code !== existingDepartment.code) {
      const codeExists = await checkDepartmentCodeExists(updateData.code, id);
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Department code already exists'
        });
      }
    }

    const updated = await updateDepartment(id, updateData);
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update department'
      });
    }

    const department = await findDepartmentById(id);

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
};

// Delete department
const deleteDepartmentController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const department = await findDepartmentById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const deleted = await deleteDepartment(id);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete department'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

// Get department statistics
const getDepartmentStatsController = async (req, res) => {
  try {
    const stats = await getDepartmentStats();

    res.status(200).json({
      success: true,
      message: 'Department statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department statistics',
      error: error.message
    });
  }
};

// Get employees by department
const getEmployeesByDepartmentController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const department = await findDepartmentById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const employees = await getEmployeesByDepartment(id);

    res.status(200).json({
      success: true,
      message: 'Department employees retrieved successfully',
      data: {
        department: department,
        employees: employees
      }
    });
  } catch (error) {
    console.error('Error fetching department employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department employees',
      error: error.message
    });
  }
};

module.exports = {
  createDepartmentController,
  getAllDepartmentsController,
  getDepartmentByIdController,
  updateDepartmentController,
  deleteDepartmentController,
  getDepartmentStatsController,
  getEmployeesByDepartmentController
};
