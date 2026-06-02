-- =====================================================
-- MIGRATION: Add missing student portal permissions
-- =====================================================

USE deepflux_admissions;

INSERT INTO permissions (name, description, is_active, created_at, updated_at)
SELECT p.name, p.description, 1, NOW(), NOW()
FROM (
  SELECT 'student_analytics.read' AS name, 'View student analytics dashboard' AS description
  UNION ALL
  SELECT 'student_report.read', 'View student reports dashboard'
) p
LEFT JOIN permissions existing ON existing.name = p.name
WHERE existing.id IS NULL;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
INNER JOIN permissions p ON p.name IN ('student_analytics.read', 'student_report.read')
LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE r.name = 'Student'
  AND rp.id IS NULL;

