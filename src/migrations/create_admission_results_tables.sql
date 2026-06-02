-- =====================================================
-- MIGRATION: Admission Results + Subject Scoring
-- Purpose:
-- 1. Custom subjects and score entry per applicant
-- 2. Auto aggregate total/average
-- 3. Benchmark-based success filtering
-- 4. Admission letter metadata storage
-- =====================================================

USE deepflux_admissions;

CREATE TABLE IF NOT EXISTS admission_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_name VARCHAR(120) NOT NULL UNIQUE,
  max_score DECIMAL(6,2) NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applicant_subject_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  applicant_id INT NOT NULL,
  subject_id INT NOT NULL,
  score DECIMAL(6,2) NOT NULL DEFAULT 0,
  entered_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES admission_subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_applicant_subject (applicant_id, subject_id),
  INDEX idx_scores_applicant (applicant_id),
  INDEX idx_scores_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  applicant_id INT NOT NULL UNIQUE,
  total_score DECIMAL(8,2) NOT NULL DEFAULT 0,
  average_score DECIMAL(8,2) NOT NULL DEFAULT 0,
  benchmark_score DECIMAL(8,2) NOT NULL DEFAULT 0,
  is_successful BOOLEAN NOT NULL DEFAULT FALSE,
  admission_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  decision_notes TEXT NULL,
  decided_by INT NULL,
  decided_at TIMESTAMP NULL,
  letter_ref VARCHAR(120) NULL,
  letter_payload JSON NULL,
  letter_generated_at TIMESTAMP NULL,
  letter_sent BOOLEAN NOT NULL DEFAULT FALSE,
  letter_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_results_successful (is_successful),
  INDEX idx_results_status (admission_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  benchmark_score DECIMAL(8,2) NOT NULL DEFAULT 180,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admission_settings (benchmark_score)
SELECT 180
WHERE NOT EXISTS (SELECT 1 FROM admission_settings);

