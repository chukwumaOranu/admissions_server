-- Add app_status field to applicants table
ALTER TABLE applicants 
ADD COLUMN app_status ENUM('under_review', 'approved', 'admitted') DEFAULT 'under_review' 
AFTER status;

-- Update existing submitted applications to have app_status = 'under_review'
UPDATE applicants 
SET app_status = 'under_review' 
WHERE status = 'submitted';

-- Update existing approved applications to have app_status = 'approved'
UPDATE applicants 
SET app_status = 'approved' 
WHERE status = 'approved';

-- Update existing admitted applications to have app_status = 'admitted'
UPDATE applicants 
SET app_status = 'admitted' 
WHERE status = 'admitted';
