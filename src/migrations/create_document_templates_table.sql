-- =====================================================
-- MIGRATION: Document Templates
-- Purpose: DB-driven templates for letters/emails with versioning
-- =====================================================

USE deepflux_admissions;

CREATE TABLE IF NOT EXISTS document_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_key VARCHAR(100) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  subject VARCHAR(255) NULL,
  text_body LONGTEXT NOT NULL,
  html_body LONGTEXT NULL,
  placeholders_json JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_template_version (template_key, version),
  INDEX idx_template_key_active (template_key, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO document_templates (
  template_key,
  template_name,
  subject,
  text_body,
  html_body,
  placeholders_json,
  is_active,
  version
)
SELECT
  'admission_letter',
  'Default Admission Letter',
  'Provisional Admission Letter',
  'PROVISIONAL ADMISSION LETTER\n\nReference: {{reference}}\nDate Issued: {{issued_date}}\n\nDear {{student_name}},\n\nCongratulations. You have been offered provisional admission into {{school_name}}.\n\nApplication Number: {{application_number}}\nCandidate Email: {{student_email}}\n\nNext Steps:\n1. Login to the portal with your credentials.\n2. Complete profile and required documentation.\n3. Pay applicable admission and screening fees.\n4. Print your exam/admission card where applicable.\n\nThis offer remains provisional until all requirements are met and verified.\n\nAdmissions Office\n{{school_name}}',
  '<h1>PROVISIONAL ADMISSION LETTER</h1><p>Reference: {{reference}}</p><p>Date Issued: {{issued_date}}</p><p>Dear {{student_name}},</p><p>Congratulations. You have been offered provisional admission into {{school_name}}.</p><p><strong>Application Number:</strong> {{application_number}}</p><p><strong>Candidate Email:</strong> {{student_email}}</p><p><strong>Next Steps</strong></p><ol><li>Login to the portal with your credentials.</li><li>Complete profile and required documentation.</li><li>Pay applicable admission and screening fees.</li><li>Print your exam/admission card where applicable.</li></ol><p>This offer remains provisional until all requirements are met and verified.</p><p>Admissions Office<br/>{{school_name}}</p>',
  JSON_ARRAY('reference', 'issued_date', 'student_name', 'application_number', 'student_email', 'school_name'),
  TRUE,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM document_templates WHERE template_key = 'admission_letter'
);

