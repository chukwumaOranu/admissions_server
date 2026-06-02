const {
  generateApplicationNumber,
  createApplicant,
  findApplicantById,
  findApplicantByApplicationNumber,
  getAllApplicantsSimple,
  findAllApplicants,
  findApplicantsByUserId,
  updateApplicant,
  submitApplication,
  updateApplicationStatus,
  updatePaymentStatus,
  deleteApplicant,
  findApplicantsByStatus,
  findApplicantsByExamDate,
  getApplicantStats,
  checkApplicantEmailExists,
  checkApplicationNumberExists,
  getRecentApplications
} = require('../models/applicant.model');

const { processPassportPhoto, deletePhotoFile } = require('../utils/imageProcessor.utils');
const emailService = require('../utils/emailService');
const { findUserByEmail, findUserById } = require('../models/user.model');
const {
  checkEntryDateCapacity,
  findNextAvailableEntryDate,
  syncEntryDateCurrentRegistrations
} = require('../models/payment-exam.model');
const { findStudentByUserId } = require('../models/student.model');

// =====================================================
// APPLICANT CONTROLLER FUNCTIONS
// =====================================================

const isStudentUser = (req) => req.user?.role_name === 'Student';

const canAccessApplicant = (req, applicant) => {
  if (!isStudentUser(req)) return true;
  return applicant && Number(applicant.user_id) === Number(req.user.id);
};

// Create new applicant
const createApplicantController = async (req, res) => {
  try {
    const {
      schema_id,
      // Handle both field formats (frontend sends applicant_* fields)
      applicant_name,
      applicant_email,
      applicant_phone,
      // Legacy format
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      nationality,
      address,
      city,
      state,
      country,
      guardian_name,
      guardian_phone,
      guardian_email,
      emergency_contact_name,
      emergency_contact_phone,
      passport_photo,
      custom_data
    } = req.body;

    // Map frontend fields to backend fields
    let finalFirstName, finalLastName, finalEmail, finalPhone;
    
    if (applicant_name) {
      // Split applicant_name into first_name and last_name
      const nameParts = applicant_name.trim().split(' ');
      finalFirstName = nameParts[0] || '';
      finalLastName = nameParts.slice(1).join(' ') || '';
    } else {
      finalFirstName = first_name || '';
      finalLastName = last_name || '';
    }
    
    finalEmail = applicant_email || email;
    finalPhone = applicant_phone || phone;

    // Validate required fields
    if (!schema_id || !finalFirstName || !finalLastName || !finalEmail) {
      return res.status(400).json({
        success: false,
        message: 'Schema ID, first name, last name, and email are required'
      });
    }

    // Check if email already exists
    const emailExists = await checkApplicantEmailExists(finalEmail);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    let finalPassportPhoto = passport_photo || null;
    if (!finalPassportPhoto && req.user?.id) {
      const student = await findStudentByUserId(req.user.id);
      finalPassportPhoto = student?.profile_photo || null;
    }

    // Create applicant with mapped fields (include user_id if authenticated)
    const result = await createApplicant({
      schema_id,
      first_name: finalFirstName,
      last_name: finalLastName,
      middle_name: middle_name || '',
      email: finalEmail,
      phone: finalPhone,
      date_of_birth,
      gender,
      nationality,
      address,
      emergency_contact_name: guardian_name || emergency_contact_name,
      emergency_contact_phone: guardian_phone || emergency_contact_phone,
      passport_photo: finalPassportPhoto,
      custom_data,
      user_id: req.user?.id || null // Link to user if authenticated
    });

    // Fetch the complete application data to return
    const completeApplication = await findApplicantById(result.id);
    
    res.status(201).json({
      success: true,
      message: 'Applicant created successfully',
      data: completeApplication
    });

  } catch (error) {
    console.error('Error creating applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all applicants (simple version)
const getAllApplicantsController = async (req, res) => {
  try {
    const applicants = await getAllApplicantsSimple();

    res.status(200).json({
      success: true,
      message: 'Applicants retrieved successfully',
      data: {
        applications: applicants,
        count: applicants.length
      }
    });

  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicant by ID
const getApplicantByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    
    const applicant = await findApplicantById(id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }
    if (!canAccessApplicant(req, applicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access this application'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Applicant retrieved successfully',
      data: applicant
    });

  } catch (error) {
    console.error('Error fetching applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicant by application number
const getApplicantByApplicationNumberController = async (req, res) => {
  try {
    const { applicationNumber } = req.params;

    const applicant = await findApplicantByApplicationNumber(applicationNumber);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Applicant retrieved successfully',
      data: applicant
    });

  } catch (error) {
    console.error('Error fetching applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicants by user_id (for student portal)
// req.user is set by protectRoute middleware from NextAuth session
const getApplicantsByUserIdController = async (req, res) => {
  try {
    // Get user ID from authenticated session (set by protectRoute middleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    // Fetch applications for the authenticated user
    const applicants = await findApplicantsByUserId(userId);

    // Return applications (empty array if none found)
    res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully',
      data: Array.isArray(applicants) ? applicants : []
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update applicant
const updateApplicantController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if applicant exists
    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }
    if (!canAccessApplicant(req, existingApplicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update this application'
      });
    }

    // Check if email already exists (if being updated)
    if (updateData.email && updateData.email !== existingApplicant.email) {
      const emailExists = await checkApplicantEmailExists(updateData.email, id);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update applicant
    const updatedApplicant = await updateApplicant(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Applicant updated successfully',
      data: updatedApplicant
    });

  } catch (error) {
    console.error('Error updating applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Submit application
const submitApplicationController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if applicant exists
    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }
    if (!canAccessApplicant(req, existingApplicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to submit this application'
      });
    }

    // Check if already submitted
    if (existingApplicant.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Application already submitted'
      });
    }

    // Submit application
    const submittedApplicant = await submitApplication(id);

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: submittedApplicant
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update application status
const updateApplicationStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const reviewed_by = req.user.id;

    // Validate status
    const validStatuses = ['draft', 'submitted', 'approved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if applicant exists
    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    // Update status
    const updatedApplicant = await updateApplicationStatus(id, status, reviewed_by, review_notes);

    if (status === 'approved' && existingApplicant.email) {
      // Email should never block application approval. SMTP can be slow or unavailable.
      setImmediate(async () => {
        try {
          const initialized = await emailService.initialize();
          if (!initialized) {
            console.warn('⚠️ Application approved, but email service is not available.');
            return;
          }

          const loginUser = existingApplicant.user_id
            ? await findUserById(existingApplicant.user_id)
            : await findUserByEmail(existingApplicant.email);

          const emailResult = await emailService.sendApplicationApprovalEmail({
            email: existingApplicant.email,
            first_name: existingApplicant.first_name,
            last_name: existingApplicant.last_name,
            application_number: existingApplicant.application_number,
            schema_display_name: existingApplicant.schema_display_name || existingApplicant.schema_name,
            username: loginUser?.username,
            password: loginUser?.temp_password
          });

          if (emailResult.success) {
            console.log('✅ Application approval email sent to:', existingApplicant.email);
          } else {
            console.warn('⚠️ Failed to send application approval email:', emailResult.error || emailResult.message);
          }
        } catch (error) {
          console.error('❌ Error sending application approval email:', error.message);
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: {
        applicant: updatedApplicant,
        emailQueued: status === 'approved' && !!existingApplicant.email
      }
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update payment status
const updatePaymentStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_reference } = req.body;

    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'cancelled'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    // Check if applicant exists
    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    // Update payment status
    const updatedApplicant = await updatePaymentStatus(id, payment_status, payment_reference);

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: updatedApplicant
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete applicant
const deleteApplicantController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if applicant exists
    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }
    if (!canAccessApplicant(req, existingApplicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this application'
      });
    }

    // Delete applicant
    await deleteApplicant(id);

    res.status(200).json({
      success: true,
      message: 'Applicant deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicants by status
const getApplicantsByStatusController = async (req, res) => {
  try {
    const { status } = req.params;

    const applicants = await findApplicantsByStatus(status);

    res.status(200).json({
      success: true,
      message: 'Applicants retrieved successfully',
      data: applicants
    });

  } catch (error) {
    console.error('Error fetching applicants by status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicants by exam date
const getApplicantsByExamDateController = async (req, res) => {
  try {
    const { examDateId } = req.params;

    const applicants = await findApplicantsByExamDate(examDateId);

    res.status(200).json({
      success: true,
      message: 'Applicants retrieved successfully',
      data: applicants
    });

  } catch (error) {
    console.error('Error fetching applicants by exam date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicant statistics
const getApplicantStatsController = async (req, res) => {
  try {
    const stats = await getApplicantStats();

    res.status(200).json({
      success: true,
      message: 'Applicant statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching applicant statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if email exists
const checkApplicantEmailExistsController = async (req, res) => {
  try {
    const { email } = req.params;
    const { excludeId } = req.query;

    const exists = await checkApplicantEmailExists(email, excludeId);

    res.status(200).json({
      success: true,
      message: 'Email check completed',
      data: { exists }
    });

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if application number exists
const checkApplicationNumberExistsController = async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const { excludeId } = req.query;

    const exists = await checkApplicationNumberExists(applicationNumber, excludeId);

    res.status(200).json({
      success: true,
      message: 'Application number check completed',
      data: { exists }
    });

  } catch (error) {
    console.error('Error checking application number:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get recent applications
const getRecentApplicationsController = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const applications = await getRecentApplications(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Recent applications retrieved successfully',
      data: applications
    });

  } catch (error) {
    console.error('Error fetching recent applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload passport photo
const uploadPassportPhotoController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }
    
    // Find applicant
    const applicant = await findApplicantById(id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    if (!canAccessApplicant(req, applicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update this application photo'
      });
    }
    
    // Process passport photo with Sharp (400x500 passport size)
    const photoUrl = await processPassportPhoto(req.file.path, id);
    
    // Delete old photo if exists
    if (applicant.passport_photo) {
      deletePhotoFile(applicant.passport_photo);
    }
    
    // Update database
    await updateApplicant(id, { passport_photo: photoUrl });
    
    res.status(200).json({
      success: true,
      message: 'Passport photo uploaded successfully',
      data: {
        passport_photo: photoUrl
      }
    });
    
  } catch (error) {
    console.error('Error uploading passport photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload passport photo',
      error: error.message
    });
  }
};

/**
 * Delete applicant passport photo
 */
const deletePassportPhotoController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find applicant
    const applicant = await findApplicantById(id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    if (!canAccessApplicant(req, applicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update this application photo'
      });
    }
    
    // Delete photo file
    if (applicant.passport_photo) {
      deletePhotoFile(applicant.passport_photo);
    }
    
    // Update database
    await updateApplicant(id, { passport_photo: null });
    
    res.status(200).json({
      success: true,
      message: 'Passport photo deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting passport photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete passport photo',
      error: error.message
    });
  }
};

// Search applicants
const searchApplicantsController = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const options = {
      page: 1,
      limit: parseInt(limit),
      search: q.trim()
    };

    const result = await findAllApplicants(options);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: result.applicants,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error searching applicants:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get applicant dashboard data
const getApplicantDashboardController = async (req, res) => {
  try {
    const [stats, recentApplications] = await Promise.all([
      getApplicantStats(),
      getRecentApplications(5)
    ]);

    res.status(200).json({
      success: true,
      message: 'Applicant dashboard data retrieved successfully',
      data: {
        stats,
        recentApplications
      }
    });

  } catch (error) {
    console.error('Error fetching applicant dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Generate application number
const generateApplicationNumberController = async (req, res) => {
  try {
    const applicationNumber = await generateApplicationNumber();

    res.status(200).json({
      success: true,
      message: 'Application number generated successfully',
      data: { application_number: applicationNumber }
    });

  } catch (error) {
    console.error('Error generating application number:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// =====================================================
// EXAM ASSIGNMENT MANAGEMENT FUNCTIONS
// =====================================================

// Assign exam to applicant(s)
const assignExamController = async (req, res) => {
  try {
    const { applicant_ids, exam_date_id, auto_assign_next_available = false } = req.body;

    if (!applicant_ids || !Array.isArray(applicant_ids) || applicant_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Applicant IDs are required'
      });
    }

    if (!exam_date_id && !auto_assign_next_available) {
      return res.status(400).json({
        success: false,
        message: 'Exam date ID is required when auto_assign_next_available is false'
      });
    }

    const touchedEntryDateIds = new Set();

    // Update each applicant with exam date, optionally auto-selecting next available by capacity
    const results = [];
    for (const applicantId of applicant_ids) {
      try {
        const existingApplicant = await findApplicantById(applicantId);
        if (!existingApplicant) {
          results.push({
            applicant_id: applicantId,
            success: false,
            error: 'Applicant not found'
          });
          continue;
        }

        let targetEntryDateId = exam_date_id;

        if (auto_assign_next_available) {
          if (targetEntryDateId) {
            const hasCapacity = await checkEntryDateCapacity(targetEntryDateId);
            if (!hasCapacity) {
              const nextAvailable = await findNextAvailableEntryDate();
              if (!nextAvailable) {
                results.push({
                  applicant_id: applicantId,
                  success: false,
                  error: 'No available exam dates with free capacity'
                });
                continue;
              }
              targetEntryDateId = nextAvailable.id;
            }
          } else {
            const nextAvailable = await findNextAvailableEntryDate();
            if (!nextAvailable) {
              results.push({
                applicant_id: applicantId,
                success: false,
                error: 'No available exam dates with free capacity'
              });
              continue;
            }
            targetEntryDateId = nextAvailable.id;
          }
        } else {
          const hasCapacity = await checkEntryDateCapacity(targetEntryDateId);
          if (!hasCapacity) {
            results.push({
              applicant_id: applicantId,
              success: false,
              error: 'Selected exam date is full'
            });
            continue;
          }
        }

        const updatedApplicant = await updateApplicant(applicantId, { exam_date_id: targetEntryDateId });
        if (existingApplicant.exam_date_id) touchedEntryDateIds.add(existingApplicant.exam_date_id);
        if (targetEntryDateId) touchedEntryDateIds.add(targetEntryDateId);
        results.push({
          applicant_id: applicantId,
          success: true,
          assigned_exam_date_id: targetEntryDateId,
          data: updatedApplicant
        });
      } catch (error) {
        results.push({
          applicant_id: applicantId,
          success: false,
          error: error.message
        });
      }
    }

    for (const entryDateId of touchedEntryDateIds) {
      await syncEntryDateCurrentRegistrations(entryDateId);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Exam assigned to ${successCount} applicant(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      data: {
        total_assigned: successCount,
        total_failed: failureCount,
        results
      }
    });

  } catch (error) {
    console.error('Error assigning exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update exam assignment for a single applicant
const updateExamAssignmentController = async (req, res) => {
  try {
    const { id } = req.params;
    const { exam_date_id } = req.body;

    if (!exam_date_id) {
      return res.status(400).json({
        success: false,
        message: 'Exam date ID is required'
      });
    }

    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    const hasCapacity = await checkEntryDateCapacity(exam_date_id);
    if (!hasCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Selected exam date is full'
      });
    }

    const updatedApplicant = await updateApplicant(id, { exam_date_id });
    if (existingApplicant.exam_date_id) {
      await syncEntryDateCurrentRegistrations(existingApplicant.exam_date_id);
    }
    await syncEntryDateCurrentRegistrations(exam_date_id);

    res.status(200).json({
      success: true,
      message: 'Exam assignment updated successfully',
      data: updatedApplicant
    });

  } catch (error) {
    console.error('Error updating exam assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Student self-service exam date selection (capacity-aware)
const selectMyExamDateController = async (req, res) => {
  try {
    const { id } = req.params;
    const { exam_date_id } = req.body;

    if (!exam_date_id) {
      return res.status(400).json({
        success: false,
        message: 'Exam date ID is required'
      });
    }

    const existingApplicant = await findApplicantById(id);
    if (!existingApplicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    if (!canAccessApplicant(req, existingApplicant)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to update this application'
      });
    }

    if (existingApplicant.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Application must be paid before selecting exam date'
      });
    }

    if (!['submitted', 'approved'].includes(existingApplicant.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application must be submitted before selecting exam date'
      });
    }

    const hasCapacity = await checkEntryDateCapacity(exam_date_id);
    if (!hasCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Selected exam date is full'
      });
    }

    const updatedApplicant = await updateApplicant(id, { exam_date_id });
    if (existingApplicant.exam_date_id) {
      await syncEntryDateCurrentRegistrations(existingApplicant.exam_date_id);
    }
    await syncEntryDateCurrentRegistrations(exam_date_id);

    res.status(200).json({
      success: true,
      message: 'Exam date selected successfully',
      data: updatedApplicant
    });
  } catch (error) {
    console.error('Error selecting exam date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Remove exam assignment from applicant(s)
const removeExamAssignmentController = async (req, res) => {
  try {
    const { applicant_ids } = req.body;

    if (!applicant_ids || !Array.isArray(applicant_ids) || applicant_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Applicant IDs are required'
      });
    }

    // Remove exam assignment from each applicant (set exam_date_id to null)
    const touchedEntryDateIds = new Set();
    const results = [];
    for (const applicantId of applicant_ids) {
      try {
        const existingApplicant = await findApplicantById(applicantId);
        const updatedApplicant = await updateApplicant(applicantId, { exam_date_id: null });
        if (existingApplicant?.exam_date_id) touchedEntryDateIds.add(existingApplicant.exam_date_id);
        results.push({
          applicant_id: applicantId,
          success: true,
          data: updatedApplicant
        });
      } catch (error) {
        results.push({
          applicant_id: applicantId,
          success: false,
          error: error.message
        });
      }
    }

    for (const entryDateId of touchedEntryDateIds) {
      await syncEntryDateCurrentRegistrations(entryDateId);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Exam assignment removed from ${successCount} applicant(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      data: {
        total_removed: successCount,
        total_failed: failureCount,
        results
      }
    });

  } catch (error) {
    console.error('Error removing exam assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam assignment statistics
const getExamAssignmentStatsController = async (req, res) => {
  try {
    const { findAllApplicants, findEntryDateById } = require('../models/applicant.model');
    const { findAllEntryDates } = require('../models/payment-exam.model');

    // Get all approved and paid applications
    const applications = await findAllApplicants({
      status: 'approved',
      payment_status: 'paid'
    });

    // Get all available exam dates
    const examDates = await findAllEntryDates();

    const stats = {
      total_eligible_applications: applications.length,
      assigned_to_exam: applications.filter(app => app.exam_date_id).length,
      not_assigned: applications.filter(app => !app.exam_date_id).length,
      available_exam_dates: examDates.length,
      exam_date_breakdown: {}
    };

    // Calculate breakdown by exam date
    for (const examDate of examDates) {
      const assignedCount = applications.filter(app => app.exam_date_id === examDate.id).length;
      stats.exam_date_breakdown[examDate.id] = {
        exam_title: examDate.exam_title,
        exam_date: examDate.exam_date,
        exam_time: examDate.exam_time,
        exam_venue: examDate.exam_venue,
        max_capacity: examDate.max_capacity,
        assigned_count: assignedCount,
        available_capacity: examDate.max_capacity - assignedCount
      };
    }

    res.status(200).json({
      success: true,
      message: 'Exam assignment statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error getting exam assignment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createApplicantController,
  getAllApplicantsController,
  getApplicantByIdController,
  getApplicantByApplicationNumberController,
  getApplicantsByUserIdController,
  updateApplicantController,
  submitApplicationController,
  updateApplicationStatusController,
  updatePaymentStatusController,
  deleteApplicantController,
  getApplicantsByStatusController,
  getApplicantsByExamDateController,
  getApplicantStatsController,
  checkApplicantEmailExistsController,
  checkApplicationNumberExistsController,
  getRecentApplicationsController,
  uploadPassportPhotoController,
  deletePassportPhotoController,
  searchApplicantsController,
  getApplicantDashboardController,
  generateApplicationNumberController,
  // Exam assignment management
  assignExamController,
  updateExamAssignmentController,
  selectMyExamDateController,
  removeExamAssignmentController,
  getExamAssignmentStatsController
};
