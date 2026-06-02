const { generatePaymentInvoice } = require('../utils/paymentInvoiceGenerator');
const { findApplicantById } = require('../models/applicant.model');
const { findPaymentTransactionByReference } = require('../models/payment-exam.model');
const { findSchoolSettings } = require('../models/settings-upload.model');

// =====================================================
// PAYMENT INVOICE GENERATION CONTROLLER
// =====================================================

/**
 * Generate payment invoice PDF
 */
const generatePaymentInvoiceController = async (req, res) => {
  try {
    const { transactionReference } = req.params;

    console.log('🔍 Generating payment invoice for:', transactionReference);

    // Find payment by reference
    const payment = await findPaymentTransactionByReference(transactionReference);
    if (!payment) {
      console.log('❌ Payment not found:', transactionReference);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    console.log('✅ Payment found:', {
      id: payment.id,
      reference: payment.transaction_reference,
      amount: payment.amount,
      status: payment.payment_status
    });

    // Find applicant
    const applicant = await findApplicantById(payment.applicant_id);
    if (!applicant) {
      console.log('❌ Applicant not found:', payment.applicant_id);
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    console.log('✅ Applicant found:', {
      id: applicant.id,
      name: `${applicant.first_name} ${applicant.last_name}`,
      email: applicant.email
    });

    let schoolData = {};
    try {
      schoolData = await findSchoolSettings() || {};
    } catch (settingsError) {
      console.warn('⚠️ Could not load school settings for payment invoice:', settingsError.message);
    }

    // Generate invoice
    console.log('🔄 Generating payment invoice...');
    const invoice = await generatePaymentInvoice(payment, applicant, schoolData);
    console.log('✅ Invoice generated - PDF size:', invoice.pdf.length, 'bytes');

    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `payment-invoice-${payment.transaction_reference}-${timestamp}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.setHeader('Content-Length', invoice.pdf.length);

    // Send PDF
    res.send(invoice.pdf);

  } catch (error) {
    console.error('❌ Error generating payment invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment invoice',
      error: error.message
    });
  }
};

/**
 * Generate payment invoice preview (returns JSON with base64 PDF)
 */
const generatePaymentInvoicePreviewController = async (req, res) => {
  try {
    const { transactionReference } = req.params;

    // Find payment by reference
    const payment = await findPaymentTransactionByReference(transactionReference);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Find applicant
    const applicant = await findApplicantById(payment.applicant_id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    let schoolData = {};
    try {
      schoolData = await findSchoolSettings() || {};
    } catch (settingsError) {
      console.warn('Could not load school settings for payment invoice preview:', settingsError.message);
    }

    // Generate invoice
    const invoice = await generatePaymentInvoice(payment, applicant, schoolData);

    // Return JSON with base64 PDF
    res.status(200).json({
      success: true,
      message: 'Payment invoice generated successfully',
      data: {
        pdf: `data:application/pdf;base64,${invoice.pdf.toString('base64')}`,
        metadata: invoice.metadata
      }
    });

  } catch (error) {
    console.error('Error generating payment invoice preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment invoice preview',
      error: error.message
    });
  }
};

module.exports = {
  generatePaymentInvoiceController,
  generatePaymentInvoicePreviewController
};
