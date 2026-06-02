-- =====================================================
-- MIGRATION: Add user_id to employees table
-- Purpose: Link employees to user accounts for system access
-- Date: 2025-01-07
-- =====================================================

USE deepflux_admissions;

-- Add user_id column to employees table
ALTER TABLE employees 
ADD COLUMN user_id INT NULL UNIQUE AFTER created_by;

-- Add foreign key constraint
ALTER TABLE employees
ADD CONSTRAINT fk_employees_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE SET NULL;

-- Add index for performance
ALTER TABLE employees
ADD INDEX idx_employees_user_id (user_id);

-- Add columns to track welcome email
ALTER TABLE employees 
ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE AFTER user_id,
ADD COLUMN welcome_email_sent_at TIMESTAMP NULL AFTER welcome_email_sent;

SELECT 'Migration completed successfully!' as status;

