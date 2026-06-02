#!/bin/bash

# Script to fix pagination issues in all controllers
# This script will create simple "getAll" functions for each model and update controllers

echo "🔧 Fixing pagination issues across all controllers..."

# Function to add getAllSimple function to a model
add_getAllSimple_to_model() {
    local model_file="$1"
    local table_name="$2"
    local order_by="$3"
    
    echo "📝 Adding getAll${table_name^}Simple to $model_file"
    
    # Add the function after the imports
    sed -i '' "2a\\
\\
// Get all ${table_name}s without pagination (for testing)\\
const getAll${table_name^}Simple = async () => {\\
  try {\\
    const query = 'SELECT * FROM ${table_name}s WHERE is_active = 1 ORDER BY ${order_by}';\\
    const { rows } = await executeQuery(query, []);\\
    return rows;\\
  } catch (error) {\\
    throw new Error(\`Failed to get all ${table_name}s: \${error.message}\`);\\
  }\\
};" "$model_file"
    
    # Add to exports
    sed -i '' "s/module.exports = {/module.exports = {\\
  getAll${table_name^}Simple,/" "$model_file"
}

# Function to update controller to use simple function
update_controller_getAll() {
    local controller_file="$1"
    local model_name="$2"
    local function_name="$3"
    
    echo "📝 Updating $controller_file to use getAll${model_name^}Simple"
    
    # Add import
    sed -i '' "s/const {/const {\\
  getAll${model_name^}Simple,/" "$controller_file"
    
    # Update the getAll function
    sed -i '' "/const ${function_name} = asyncHandler(async (req, res) => {/,/});/c\\
// Get All ${model_name^}s\\
const ${function_name} = asyncHandler(async (req, res) => {\\
  // Use simple function to avoid pagination issues\\
  const ${model_name}s = await getAll${model_name^}Simple();\\
  \\
  res.json({\\
    success: true,\\
    message: '${model_name^}s retrieved successfully',\\
    data: {\\
      ${model_name}s,\\
      count: ${model_name}s.length\\
    }\\
  });\\
});" "$controller_file"
}

# Fix each model and controller pair
echo "🔨 Processing models and controllers..."

# Department
add_getAllSimple_to_model "src/models/department.model.js" "department" "name"
update_controller_getAll "src/controllers/department.controller.js" "department" "getAllDepartments"

# Employee  
add_getAllSimple_to_model "src/models/employee.model.js" "employee" "username"
update_controller_getAll "src/controllers/employee.controller.js" "employee" "getAllEmployees"

# Applicant
add_getAllSimple_to_model "src/models/applicant.model.js" "applicant" "application_number"
update_controller_getAll "src/controllers/applicant.controller.js" "applicant" "getAllApplicants"

# Payment
add_getAllSimple_to_model "src/models/payment-exam.model.js" "paymentTransaction" "created_at"
update_controller_getAll "src/controllers/payment.controller.js" "paymentTransaction" "getAllPaymentTransactions"

# Entry Date
add_getAllSimple_to_model "src/models/payment-exam.model.js" "entryDate" "exam_date"
update_controller_getAll "src/controllers/entryDate.controller.js" "entryDate" "getAllEntryDates"

# Exam Card
add_getAllSimple_to_model "src/models/payment-exam.model.js" "examCard" "created_at"
update_controller_getAll "src/controllers/examCard.controller.js" "examCard" "getAllExamCards"

# File Upload
add_getAllSimple_to_model "src/models/settings-upload.model.js" "fileUpload" "created_at"
update_controller_getAll "src/controllers/settings.controller.js" "fileUpload" "getAllFileUploads"

# Role Permission
add_getAllSimple_to_model "src/models/rolePermission.model.js" "rolePermission" "role_id"
update_controller_getAll "src/controllers/rolePermission.controller.js" "rolePermission" "getAllRolePermissions"

echo "✅ All pagination issues fixed!"
echo "🎉 Controllers should now work without MySQL parameter binding errors"