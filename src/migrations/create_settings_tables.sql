-- =====================================================
-- MIGRATION: Create settings tables used by settings-upload model
-- =====================================================

USE deepflux_admissions;

CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  debug_mode BOOLEAN NOT NULL DEFAULT FALSE,
  log_level VARCHAR(20) NOT NULL DEFAULT 'info',
  session_timeout INT NOT NULL DEFAULT 3600,
  max_login_attempts INT NOT NULL DEFAULT 5,
  password_min_length INT NOT NULL DEFAULT 8,
  require_email_verification BOOLEAN NOT NULL DEFAULT TRUE,
  auto_backup BOOLEAN NOT NULL DEFAULT TRUE,
  backup_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  backup_retention_days INT NOT NULL DEFAULT 30,
  cache_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cache_ttl INT NOT NULL DEFAULT 300,
  rate_limiting BOOLEAN NOT NULL DEFAULT TRUE,
  rate_limit_requests INT NOT NULL DEFAULT 100,
  rate_limit_window INT NOT NULL DEFAULT 900,
  custom_settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_by INT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  smtp_host VARCHAR(255) NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_username VARCHAR(255) NULL,
  smtp_password VARCHAR(255) NULL,
  from_name VARCHAR(255) NULL,
  from_email VARCHAR(255) NULL,
  reply_to_email VARCHAR(255) NULL,
  test_email VARCHAR(255) NULL,
  email_verification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  welcome_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notification_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_templates JSON NULL,
  custom_settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_by INT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  password_policy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  password_min_length INT NOT NULL DEFAULT 8,
  password_require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_numbers BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_symbols BOOLEAN NOT NULL DEFAULT FALSE,
  password_expiry_days INT NOT NULL DEFAULT 90,
  max_login_attempts INT NOT NULL DEFAULT 5,
  lockout_duration_minutes INT NOT NULL DEFAULT 30,
  session_timeout_minutes INT NOT NULL DEFAULT 60,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_method VARCHAR(20) NOT NULL DEFAULT 'email',
  ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ip_whitelist JSON NULL,
  ip_blacklist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ip_blacklist JSON NULL,
  audit_log_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  audit_log_retention_days INT NOT NULL DEFAULT 365,
  ssl_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  csrf_protection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  xss_protection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  custom_settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_by INT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

