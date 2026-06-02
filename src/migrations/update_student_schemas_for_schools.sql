-- =====================================================
-- UPDATE STUDENT SCHEMAS FOR PRIMARY/SECONDARY SCHOOLS
-- =====================================================
-- This migration updates the default student schemas 
-- from university types to Primary/Secondary school types
-- =====================================================

-- Delete existing university-based schemas
DELETE FROM student_schemas WHERE schema_name IN ('undergraduate', 'postgraduate', 'certificate');

-- Insert new Primary/Secondary school schemas
INSERT INTO student_schemas (schema_name, display_name, description, is_active, created_at, updated_at, created_by) VALUES
('primary', 'Primary School Student', 'Schema for primary school students (Classes 1-6)', 1, NOW(), NOW(), 14),
('jss', 'Junior Secondary Student (JSS)', 'Schema for junior secondary students (JSS 1-3)', 1, NOW(), NOW(), 14),
('sss', 'Senior Secondary Student (SSS)', 'Schema for senior secondary students (SSS 1-3)', 1, NOW(), NOW(), 14),
('nursery', 'Nursery/Pre-School', 'Schema for nursery and pre-school children', 1, NOW(), NOW(), 14);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify:
-- SELECT * FROM student_schemas ORDER BY id;

