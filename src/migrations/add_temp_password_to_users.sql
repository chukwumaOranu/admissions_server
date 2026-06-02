-- =====================================================
-- ADD TEMPORARY PASSWORD STORAGE TO USERS TABLE
-- =====================================================
-- This migration adds a temp_password field to store
-- passwords temporarily for viewing by authorized staff
-- (Especially important for student/parent accounts)
-- =====================================================

ALTER TABLE users 
ADD COLUMN temp_password VARCHAR(255) NULL AFTER password,
ADD COLUMN password_viewed_at TIMESTAMP NULL AFTER temp_password,
ADD COLUMN password_viewed_by INT NULL AFTER password_viewed_at;

-- Add index for faster lookups
ALTER TABLE users
ADD INDEX idx_temp_password (temp_password);

-- Add foreign key for password_viewed_by
ALTER TABLE users
ADD CONSTRAINT fk_users_password_viewed_by 
  FOREIGN KEY (password_viewed_by) REFERENCES users(id) 
  ON DELETE SET NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify:
-- DESCRIBE users;

