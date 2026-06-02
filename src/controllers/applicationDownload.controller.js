const { generateApplicationPDF } = require('../utils/applicationPDFGenerator');
const { findApplicantById } = require('../models/applicant.model');
const { findSchoolSettings } = require('../models/settings-upload.model');

/**
 * Download application as PDF
 */
const downloadApplicationController = async (req, res) => {
  try {
    const { id } = req.params;

    // Get application data
    const applicationResult = await findApplicantById(id);

    if (!applicationResult) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const application = applicationResult;
    const isStudent = req.user?.role_name === 'Student';
    if (isStudent && Number(application.user_id) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to download this application'
      });
    }

    // Get school settings for PDF header
    let schoolSettings = {};
    try {
      const schoolResult = await findSchoolSettings();
      if (schoolResult) {
        schoolSettings = schoolResult;
      }
    } catch (schoolError) {
      console.warn('Could not fetch school settings:', schoolError.message);
    }

    // Generate PDF
    const pdfResult = await generateApplicationPDF(application, schoolSettings);

    // Set response headers for PDF download
    const filename = `application_${application.application_number || application.id}_${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfResult.pdf.length);
    
    // Send PDF buffer
    res.send(pdfResult.pdf);

  } catch (error) {
    console.error('❌ Error downloading application PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate application PDF',
      error: error.message
    });
  }
};

module.exports = {
  downloadApplicationController
};
