-- =====================================================
-- DEPARTMENT MANAGEMENT TABLE
-- =====================================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    description TEXT,
    manager_id INT,
    budget DECIMAL(12,2) DEFAULT 0.00,
    location VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_departments_name (name),
    INDEX idx_departments_code (code),
    INDEX idx_departments_manager (manager_id),
    INDEX idx_departments_active (is_active)
);

-- Add department_id to employees table
ALTER TABLE employees ADD COLUMN department_id INT;
ALTER TABLE employees ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE employees ADD INDEX idx_employees_department_id (department_id);

-- Insert default departments
INSERT INTO departments (name, code, description, budget, location, is_active) VALUES
('Administration', 'ADMIN', 'Administrative staff and management', 500000.00, 'Main Building - Floor 1', TRUE),
('Academic Affairs', 'ACAD', 'Teaching staff and academic affairs', 1200000.00, 'Academic Building - Floor 2', TRUE),
('Finance', 'FIN', 'Financial management and accounting', 300000.00, 'Finance Office - Floor 1', TRUE),
('Information Technology', 'IT', 'IT support and system administration', 200000.00, 'IT Department - Floor 3', TRUE),
('Human Resources', 'HR', 'Human resources management', 150000.00, 'HR Office - Floor 1', TRUE),
('Student Affairs', 'STU', 'Student services and support', 400000.00, 'Student Center - Floor 2', TRUE),
('Maintenance', 'MAINT', 'Facilities and maintenance', 100000.00, 'Maintenance Building', TRUE),
('Security', 'SEC', 'Campus security and safety', 180000.00, 'Security Office - Ground Floor', TRUE);
