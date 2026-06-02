-- Remove app_status field and update status enum
ALTER TABLE applicants 
DROP COLUMN app_status;

-- Update status enum to only have draft, submitted, approved
ALTER TABLE applicants 
MODIFY COLUMN status ENUM('draft', 'submitted', 'approved') DEFAULT 'draft';

-- Update existing applications
UPDATE applicants 
SET status = 'submitted' 
WHERE status IN ('under_review', 'rejected', 'admitted');

-- Keep only draft, submitted, approved
UPDATE applicants 
SET status = 'approved' 
WHERE status = 'approved';
