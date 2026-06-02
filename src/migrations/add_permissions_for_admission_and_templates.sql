-- =====================================================
-- MIGRATION: Add permissions for admission workflow, templates, and exam assignment
-- =====================================================

USE deepflux_admissions;

-- Create permissions (idempotent)
INSERT INTO permissions (name, description, is_active, created_at, updated_at)
SELECT p.name, p.description, 1, NOW(), NOW()
FROM (
  SELECT 'admission_subject.read' AS name, 'View admission subjects' AS description
  UNION ALL SELECT 'admission_subject.create', 'Create admission subjects'
  UNION ALL SELECT 'admission_subject.update', 'Update admission subjects'
  UNION ALL SELECT 'admission_benchmark.read', 'View admission benchmark score'
  UNION ALL SELECT 'admission_benchmark.update', 'Update admission benchmark score'
  UNION ALL SELECT 'admission_score.create', 'Enter/update applicant admission scores'
  UNION ALL SELECT 'admission_result.read', 'View admission results and successful candidates'
  UNION ALL SELECT 'admission_decision.update', 'Update applicant admission decision'
  UNION ALL SELECT 'admission_letter.generate', 'Generate admission letter PDF'
  UNION ALL SELECT 'admission_letter.send', 'Send admission letters via email'
  UNION ALL SELECT 'settings.template.read', 'View document templates'
  UNION ALL SELECT 'settings.template.create', 'Create new document template version'
  UNION ALL SELECT 'settings.template.update', 'Update existing document template'
  UNION ALL SELECT 'settings.template.activate', 'Activate a document template version'
  UNION ALL SELECT 'settings.template.preview', 'Preview rendered document template'
  UNION ALL SELECT 'exam_assignment.manage', 'Assign and manage exam slots for applicants'
  UNION ALL SELECT 'exam_calendar.read', 'View exam calendar slot availability'
  UNION ALL SELECT 'student.login.send', 'Send student login credentials via email'
) p
LEFT JOIN permissions existing ON existing.name = p.name
WHERE existing.id IS NULL;

-- Assign permissions to Super Admin + Admin roles (idempotent)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id AS role_id, p.id AS permission_id, NOW()
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'admission_subject.read',
  'admission_subject.create',
  'admission_subject.update',
  'admission_benchmark.read',
  'admission_benchmark.update',
  'admission_score.create',
  'admission_result.read',
  'admission_decision.update',
  'admission_letter.generate',
  'admission_letter.send',
  'settings.template.read',
  'settings.template.create',
  'settings.template.update',
  'settings.template.activate',
  'settings.template.preview',
  'exam_assignment.manage',
  'exam_calendar.read',
  'student.login.send'
)
LEFT JOIN role_permissions rp
  ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE r.name IN ('Super Admin', 'Admin')
  AND rp.id IS NULL;

