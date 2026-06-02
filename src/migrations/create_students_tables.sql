-- =====================================================
-- MIGRATION: Create Students Management Tables
-- Purpose: Student management system with schema support
-- Date: 2025-10-08
-- =====================================================

USE deepflux_admissions;

-- =====================================================
-- 1. STUDENT SCHEMAS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS student_schemas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student_schemas_active (is_active),
    INDEX idx_student_schemas_name (schema_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. STUDENT SCHEMA FIELDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS student_schema_fields (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schema_id INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type ENUM('text', 'number', 'email', 'tel', 'date', 'select', 'textarea', 'file', 'checkbox', 'radio') NOT NULL,
    field_options JSON,
    is_required BOOLEAN DEFAULT FALSE,
    field_order INT DEFAULT 0,
    validation_rules JSON,
    help_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (schema_id) REFERENCES student_schemas(id) ON DELETE CASCADE,
    INDEX idx_student_fields_schema (schema_id),
    UNIQUE KEY unique_schema_field (schema_id, field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. STUDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    schema_id INT NOT NULL,
    
    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    postal_code VARCHAR(20),
    
    -- Guardian/Emergency Contact
    guardian_name VARCHAR(200),
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(255),
    guardian_relationship VARCHAR(50),
    
    -- Academic Background
    previous_school VARCHAR(200),
    graduation_year INT,
    
    -- System Integration
    user_id INT NULL UNIQUE,
    profile_photo VARCHAR(500),
    status ENUM('active', 'inactive', 'graduated', 'suspended', 'withdrawn') DEFAULT 'active',
    
    -- Custom Fields (Schema-based)
    custom_data JSON,
    
    -- Email Tracking
    welcome_email_sent BOOLEAN DEFAULT FALSE,
    welcome_email_sent_at TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    -- Foreign Keys
    FOREIGN KEY (schema_id) REFERENCES student_schemas(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_students_student_id (student_id),
    INDEX idx_students_email (email),
    INDEX idx_students_user_id (user_id),
    INDEX idx_students_schema (schema_id),
    INDEX idx_students_status (status),
    INDEX idx_students_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. INSERT DEFAULT STUDENT SCHEMA
-- =====================================================
INSERT INTO student_schemas (schema_name, display_name, description, created_by)
VALUES 
  ('undergraduate', 'Undergraduate Student', 'Schema for undergraduate degree programs', 14),
  ('postgraduate', 'Postgraduate Student', 'Schema for masters and PhD programs', 14),
  ('certificate', 'Certificate Program', 'Schema for certificate programs', 14)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

SELECT 'Migration completed successfully!' as status,
       (SELECT COUNT(*) FROM students) as total_students,
       (SELECT COUNT(*) FROM student_schemas) as total_schemas;

