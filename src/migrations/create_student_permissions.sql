-- =====================================================
-- CREATE STUDENT PERMISSIONS
-- =====================================================
-- This migration creates 27 permissions for the Student role
-- Role ID: 9 (Student)
-- Date: 2025-10-08
-- =====================================================

-- 1. STUDENT PROFILE PERMISSIONS (4)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_profile.read', 'View own student profile', 1, NOW(), NOW()),
('student_profile.update', 'Update own student profile', 1, NOW(), NOW()),
('student_profile.upload_photo', 'Upload passport photo', 1, NOW(), NOW()),
('student_profile.change_password', 'Change own password', 1, NOW(), NOW());

-- 2. STUDENT APPLICATION PERMISSIONS (7)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_application.create', 'Create new application', 1, NOW(), NOW()),
('student_application.read', 'View own applications', 1, NOW(), NOW()),
('student_application.update', 'Update draft applications', 1, NOW(), NOW()),
('student_application.delete', 'Delete draft applications', 1, NOW(), NOW()),
('student_application.submit', 'Submit applications', 1, NOW(), NOW()),
('student_application.upload_docs', 'Upload application documents', 1, NOW(), NOW()),
('student_application.browse', 'Browse available programs', 1, NOW(), NOW());

-- 3. STUDENT PAYMENT PERMISSIONS (4)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_payment.read', 'View own payment history', 1, NOW(), NOW()),
('student_payment.create', 'Initialize payments', 1, NOW(), NOW()),
('student_payment.verify', 'Verify payment status', 1, NOW(), NOW()),
('student_payment.receipt', 'Download payment receipts', 1, NOW(), NOW());

-- 4. STUDENT EXAM PERMISSIONS (3)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_exam.read', 'View own exams', 1, NOW(), NOW()),
('student_exam.download_card', 'Download exam cards', 1, NOW(), NOW()),
('student_exam.view_schedule', 'View exam schedule', 1, NOW(), NOW());

-- 5. STUDENT RESULT PERMISSIONS (5)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_result.read', 'View own results', 1, NOW(), NOW()),
('student_result.download', 'Download result certificates', 1, NOW(), NOW()),
('student_result.admission', 'Check admission status', 1, NOW(), NOW()),
('student_result.accept_offer', 'Accept admission offer', 1, NOW(), NOW()),
('student_result.decline_offer', 'Decline admission offer', 1, NOW(), NOW());

-- 6. STUDENT NOTIFICATION PERMISSIONS (3)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_notification.read', 'View notifications', 1, NOW(), NOW()),
('student_notification.mark_read', 'Mark notifications as read', 1, NOW(), NOW()),
('student_notification.settings', 'Manage notification preferences', 1, NOW(), NOW());

-- 7. STUDENT SUPPORT PERMISSIONS (2)
INSERT INTO permissions (name, description, is_active, created_at, updated_at) VALUES
('student_support.contact', 'Contact support', 1, NOW(), NOW()),
('student_support.faq', 'View FAQ', 1, NOW(), NOW());

-- =====================================================
-- ASSIGN PERMISSIONS TO STUDENT ROLE
-- =====================================================
-- Get the IDs of the permissions we just created and assign to Student role (ID: 9)

-- Profile Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_profile.read',
    'student_profile.update',
    'student_profile.upload_photo',
    'student_profile.change_password'
);

-- Application Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_application.create',
    'student_application.read',
    'student_application.update',
    'student_application.delete',
    'student_application.submit',
    'student_application.upload_docs',
    'student_application.browse'
);

-- Payment Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_payment.read',
    'student_payment.create',
    'student_payment.verify',
    'student_payment.receipt'
);

-- Exam Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_exam.read',
    'student_exam.download_card',
    'student_exam.view_schedule'
);

-- Result Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_result.read',
    'student_result.download',
    'student_result.admission',
    'student_result.accept_offer',
    'student_result.decline_offer'
);

-- Notification Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_notification.read',
    'student_notification.mark_read',
    'student_notification.settings'
);

-- Support Permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'student_support.contact',
    'student_support.faq'
);

-- =====================================================
-- ALSO ASSIGN SOME EXISTING PERMISSIONS
-- =====================================================
-- Assign existing file upload and notification permissions

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 9, id, NOW() FROM permissions WHERE name IN (
    'file_upload.create',      -- ID: 126
    'file_upload.read',         -- ID: 127
    'file_upload.download',     -- ID: 131
    'notification.read'         -- ID: 149
) AND id NOT IN (
    SELECT permission_id FROM role_permissions WHERE role_id = 9
);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify all permissions were assigned:
-- SELECT COUNT(*) as total_permissions FROM role_permissions WHERE role_id = 9;
-- Expected result: 31 permissions (27 new + 4 existing)

-- Run this to see all assigned permissions:
-- SELECT p.id, p.name, p.description 
-- FROM permissions p 
-- INNER JOIN role_permissions rp ON p.id = rp.permission_id 
-- WHERE rp.role_id = 9 
-- ORDER BY p.name;

