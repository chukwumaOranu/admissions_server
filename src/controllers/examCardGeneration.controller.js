const { generateCompleteExamCard } = require('../utils/examCardGeneratorSimple');
const { findApplicantById } = require('../models/applicant.model');
const { findStudentById, findStudentByEmail } = require('../models/student.model');
const { findEntryDateById, createExamCard, findExamCardByApplicant } = require('../models/payment-exam.model');
const { findSchoolSettings } = require('../models/settings-upload.model');
const emailService = require('../utils/emailService');
const path = require('path');
const fs = require('fs').promises;

// =====================================================
// EXAM CARD GENERATION CONTROLLER
// =====================================================

/**
 * Generate exam card for an applicant
 */
const generateExamCardController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { format = 'both' } = req.query; // 'image', 'pdf', or 'both'

    // Find applicant
    const applicant = await findApplicantById(applicantId);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    if (applicant.payment_status !== 'paid' || !['submitted', 'approved'].includes(applicant.status)) {
      return res.status(400).json({
        success: false,
        message: 'Applicant must be submitted and paid before exam card generation'
      });
    }

    // If applicant doesn't have a passport photo, try to find the student's profile photo
    if (!applicant.passport_photo && !applicant.profile_photo && !applicant.student_profile_photo) {
      try {
        // Find student by email (since they're the same person)
        const student = await findStudentByEmail(applicant.email);
        if (student && student.profile_photo) {
          applicant.student_profile_photo = student.profile_photo;
        }
      } catch (error) {
        // Silent fail - continue without profile photo
      }
    }

    // Check if applicant has exam date assigned
    if (!applicant.exam_date_id) {
      return res.status(400).json({
        success: false,
        message: 'No exam date assigned to this applicant'
      });
    }

    // Find exam details
    const examData = await findEntryDateById(applicant.exam_date_id);
    if (!examData) {
      return res.status(404).json({
        success: false,
        message: 'Exam details not found'
      });
    }

    // Fetch school name for branding
    const schoolSettings = await findSchoolSettings();
    const schoolName = schoolSettings?.school_name || 'DeepFlux Academy';
    const schoolContact = {
      address: schoolSettings?.school_address || null,
      phone: schoolSettings?.school_phone || null,
      email: schoolSettings?.school_email || null,
      website: schoolSettings?.school_website || null
    };

    // Check if exam card already exists for this applicant
    const existingExamCard = await findExamCardByApplicant(applicant.id);
    let examCardRecord = existingExamCard;

    // Generate exam card
    const examCard = await generateCompleteExamCard(applicant, { ...examData, schoolName, schoolContact });

    // Save exam card to database if it doesn't exist
    if (!examCardRecord) {
      // Save files to disk
      const timestamp = Date.now();
      const baseFilename = `exam-card-${applicant.application_id || applicant.id}-${timestamp}`;
      
      // Ensure directories exist
      const examCardsDir = path.join(__dirname, '../../uploads/exam-cards');
      const qrCodesDir = path.join(__dirname, '../../uploads/qr-codes');
      await fs.mkdir(examCardsDir, { recursive: true });
      await fs.mkdir(qrCodesDir, { recursive: true });
      
      // Save PDF file
      const pdfPath = `uploads/exam-cards/${baseFilename}.pdf`;
      const pdfFullPath = path.join(__dirname, '../../', pdfPath);
      await fs.writeFile(pdfFullPath, examCard.pdf);
      
      // Save QR code image
      const qrCodeImagePath = `uploads/qr-codes/${baseFilename}-qr.png`;
      const qrCodeFullPath = path.join(__dirname, '../../', qrCodeImagePath);
      const qrCodeBuffer = Buffer.from(examCard.qrCode.split(',')[1], 'base64');
      await fs.writeFile(qrCodeFullPath, qrCodeBuffer);
      
      examCardRecord = await createExamCard({
        applicant_id: applicant.id,
        entry_date_id: applicant.exam_date_id,
        qr_code_data: examCard.qrCode,
        qr_code_image: qrCodeImagePath,
        card_image: null, // We're not saving the JPEG image, only PDF
        card_pdf: pdfPath
      });
    }

    // Send email with exam card attachment if requested
    const shouldSendEmail = req.query.send_email === 'true' || (req.body && req.body.send_email === true);
    if (shouldSendEmail) {
      try {
        await emailService.initialize();
        const emailResult = await emailService.sendExamCardEmail(
          {
            email: applicant.email,
            first_name: applicant.first_name,
            last_name: applicant.last_name,
            exam_date: examData.exam_date,
            exam_time: examData.exam_time,
            exam_venue: examData.exam_venue,
            exam_title: examData.exam_title,
            application_id: applicant.application_id
          },
          examCard.pdf // Attach PDF to email
        );
        
        if (emailResult.success) {
          console.log('✅ Exam card email sent to:', applicant.email);
        } else {
          console.warn('⚠️ Failed to send exam card email:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Error sending exam card email:', error.message);
        // Don't fail the request if email fails
      }
    }

    // Set response headers based on format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `exam-card-${applicant.application_id || applicant.id}-${timestamp}`;

    if (format === 'image') {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.jpg"`);
      res.send(examCard.image);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.send(examCard.pdf);
    } else {
      // Return both formats as JSON with base64 data
      res.status(200).json({
        success: true,
        message: 'Exam card generated successfully',
        data: {
          image: `data:image/jpeg;base64,${examCard.image.toString('base64')}`,
          pdf: `data:application/pdf;base64,${examCard.pdf.toString('base64')}`,
          qrCode: examCard.qrCode,
          metadata: examCard.metadata
        }
      });
    }

  } catch (error) {
    console.error('Error generating exam card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exam card',
      error: error.message
    });
  }
};

/**
 * Generate exam card preview (for testing)
 */
const generateExamCardPreviewController = async (req, res) => {
  try {
    const { applicantId } = req.params;

    // Find applicant
    const applicant = await findApplicantById(applicantId);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    // Use mock exam data for preview
    const mockExamData = {
      exam_title: 'Sample Exam',
      exam_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      exam_time: '10:00:00',
      exam_venue: 'Main Auditorium',
      exam_duration: 120,
      schema_display_name: 'Sample Program'
    };

    // Generate exam card
    const examCard = await generateCompleteExamCard(applicant, mockExamData);

    // Return image preview
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'inline; filename="exam-card-preview.jpg"');
    res.send(examCard.image);

  } catch (error) {
    console.error('Error generating exam card preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exam card preview',
      error: error.message
    });
  }
};

/**
 * Bulk generate exam cards for multiple applicants
 */
const bulkGenerateExamCardsController = async (req, res) => {
  try {
    const { applicantIds, format = 'pdf' } = req.body;

    if (!applicantIds || !Array.isArray(applicantIds) || applicantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Applicant IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const applicantId of applicantIds) {
      try {
        // Find applicant
        const applicant = await findApplicantById(applicantId);
        if (!applicant) {
          errors.push({ applicantId, error: 'Applicant not found' });
          continue;
        }

        if (applicant.payment_status !== 'paid' || !['submitted', 'approved'].includes(applicant.status)) {
          errors.push({ applicantId, error: 'Applicant must be submitted and paid before exam card generation' });
          continue;
        }

        // Check if applicant has exam date assigned
        if (!applicant.exam_date_id) {
          errors.push({ applicantId, error: 'No exam date assigned' });
          continue;
        }

        // Find exam details
        const examData = await findEntryDateById(applicant.exam_date_id);
        if (!examData) {
          errors.push({ applicantId, error: 'Exam details not found' });
          continue;
        }

        // Generate exam card
        const examCard = await generateCompleteExamCard(applicant, examData);
        
        results.push({
          applicantId,
          applicationId: applicant.application_id || applicant.id,
          success: true,
          data: format === 'pdf' ? examCard.pdf : examCard.image
        });

      } catch (error) {
        errors.push({ applicantId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${results.length} exam cards successfully`,
      data: {
        results,
        errors,
        summary: {
          total: applicantIds.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Error in bulk exam card generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exam cards',
      error: error.message
    });
  }
};

module.exports = {
  generateExamCardController,
  generateExamCardPreviewController,
  bulkGenerateExamCardsController
};
