const axios = require('axios');
const crypto = require('crypto');
const { 
  createPaymentTransaction, 
  findPaymentTransactionByReference, 
  findPaymentTransactionById,
  findPaymentTransactionsByApplicant,
  findPaymentTransactionsByUser,
  updatePaymentTransactionStatus,
  updatePaymentTransaction,
  deletePaymentTransaction,
  findAllPaymentTransactions,
  getPaymentStats,
  getDailyPaymentSummary
} = require('../models/payment-exam.model');

const { updatePaymentStatus, findApplicantById } = require('../models/applicant.model');
const { findSchoolSettings } = require('../models/settings-upload.model');

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SUBACCOUNT = process.env.PAYSTACK_SUBACCOUNT;
const PAYSTACK_SPLIT_CODE = process.env.PAYSTACK_SPLIT_CODE;
const PAYSTACK_BEARER = process.env.PAYSTACK_BEARER;
const PAYSTACK_TRANSACTION_CHARGE = process.env.PAYSTACK_TRANSACTION_CHARGE;

const parseJsonSafe = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const toPositiveIntegerOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
};

const normalizePaystackBearer = (value) => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return ['account', 'subaccount'].includes(normalized) ? normalized : null;
};

const isStudentUser = (req) => req.user?.role_name === 'Student';

const ensureApplicantOwnership = async (req, applicantId) => {
  if (!isStudentUser(req)) return true;

  const applicant = await findApplicantById(applicantId);
  if (!applicant) return false;
  return Number(applicant.user_id) === Number(req.user.id);
};

const ensureTransactionAccess = (req, transaction) => {
  if (!isStudentUser(req)) return true;
  return Number(transaction?.applicant_user_id) === Number(req.user.id);
};

// =====================================================
// PAYMENT CONTROLLER FUNCTIONS
// =====================================================

// Create new payment transaction
const createPaymentTransactionController = async (req, res) => {
  try {
    const {
      transaction_reference,
      applicant_id,
      amount,
      currency,
      payment_method,
      payment_status,
      paystack_response,
      gateway_response
    } = req.body;

    // Validate required fields
    if (!transaction_reference || !applicant_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference, applicant ID, and amount are required'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Create payment transaction
    const transaction = await createPaymentTransaction({
      transaction_reference,
      applicant_id,
      amount,
      currency: currency || 'NGN',
      payment_method: payment_method || 'card',
      payment_status: payment_status || 'pending',
      paystack_response,
      gateway_response
    });

    if (transaction.payment_status === 'success') {
      try {
        await updatePaymentStatus(transaction.applicant_id, 'paid', transaction.transaction_reference);
      } catch (error) {
        console.error('❌ Failed to update application payment status:', error.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Payment transaction created successfully',
      data: transaction
    });

  } catch (error) {
    console.error('Error creating payment transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all payment transactions with pagination and filters
const getAllPaymentTransactionsController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      payment_status = 'success',
      payment_method = null,
      date_from = null,
      date_to = null
    } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: search || '',
      payment_status: payment_status || null,
      payment_method: payment_method || null,
      date_from: date_from || null,
      date_to: date_to || null
    };

    const result = await findAllPaymentTransactions(options);

    res.status(200).json({
      success: true,
      message: 'Payment transactions retrieved successfully',
      data: result.transactions,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get payment transaction by reference
const getPaymentTransactionByReferenceController = async (req, res) => {
  try {
    const { reference } = req.params;

    const transaction = await findPaymentTransactionByReference(reference);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }
    if (!ensureTransactionAccess(req, transaction)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access this payment transaction'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment transaction retrieved successfully',
      data: transaction
    });

  } catch (error) {
    console.error('Error fetching payment transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get payment transaction by ID
const getPaymentTransactionByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await findPaymentTransactionById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }
    if (!ensureTransactionAccess(req, transaction)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access this payment transaction'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment transaction retrieved successfully',
      data: transaction
    });

  } catch (error) {
    console.error('Error fetching payment transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get transactions by applicant
const getPaymentTransactionsByApplicantController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const hasAccess = await ensureApplicantOwnership(req, applicantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access payment transactions for this applicant'
      });
    }

    const transactions = await findPaymentTransactionsByApplicant(applicantId);

    res.status(200).json({
      success: true,
      message: 'Payment transactions retrieved successfully',
      data: transactions
    });

  } catch (error) {
    console.error('Error fetching payment transactions by applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get transactions for current authenticated user
const getMyPaymentTransactionsController = async (req, res) => {
  try {
    const transactions = await findPaymentTransactionsByUser(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Payment transactions retrieved successfully',
      data: transactions
    });

  } catch (error) {
    console.error('Error fetching current user payment transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update payment transaction status
const updatePaymentTransactionStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paystack_response } = req.body;

    // Validate status
    const validStatuses = ['pending', 'success', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    // Check if transaction exists
    const existingTransaction = await findPaymentTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }

    // Update transaction status
    const updatedTransaction = await updatePaymentTransactionStatus(id, status, paystack_response);

    res.status(200).json({
      success: true,
      message: 'Payment transaction status updated successfully',
      data: updatedTransaction
    });

  } catch (error) {
    console.error('Error updating payment transaction status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update payment transaction details
const updatePaymentTransactionController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_reference,
      applicant_id,
      amount,
      currency,
      payment_method,
      payment_status,
      paystack_response,
      gateway_response,
      paid_at
    } = req.body;

    const existingTransaction = await findPaymentTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    if (payment_status !== undefined) {
      const validStatuses = ['pending', 'success', 'failed', 'cancelled'];
      if (!validStatuses.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status'
        });
      }
    }

    const updatedTransaction = await updatePaymentTransaction(id, {
      transaction_reference,
      applicant_id,
      amount,
      currency,
      payment_method,
      payment_status,
      paystack_response,
      gateway_response,
      paid_at
    });

    if (updatedTransaction?.payment_status === 'success') {
      try {
        await updatePaymentStatus(updatedTransaction.applicant_id, 'paid', updatedTransaction.transaction_reference);
      } catch (error) {
        console.error('❌ Failed to update application payment status:', error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment transaction updated successfully',
      data: updatedTransaction
    });

  } catch (error) {
    console.error('Error updating payment transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete payment transaction
const deletePaymentTransactionController = async (req, res) => {
  try {
    const { id } = req.params;

    const existingTransaction = await findPaymentTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }

    await deletePaymentTransaction(id);

    res.status(200).json({
      success: true,
      message: 'Payment transaction deleted successfully',
      data: { id: Number(id) }
    });

  } catch (error) {
    console.error('Error deleting payment transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get payment statistics
const getPaymentStatsController = async (req, res) => {
  try {
    const stats = await getPaymentStats();

    res.status(200).json({
      success: true,
      message: 'Payment statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get daily payment summary
const getDailyPaymentSummaryController = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const summary = await getDailyPaymentSummary(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Daily payment summary retrieved successfully',
      data: summary
    });

  } catch (error) {
    console.error('Error fetching daily payment summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search payment transactions
const searchPaymentTransactionsController = async (req, res) => {
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

    const result = await findAllPaymentTransactions(options);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: result.transactions,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error searching payment transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get payment dashboard data
const getPaymentDashboardController = async (req, res) => {
  try {
    const [stats, dailySummary] = await Promise.all([
      getPaymentStats(),
      getDailyPaymentSummary(7)
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment dashboard data retrieved successfully',
      data: {
        stats,
        dailySummary
      }
    });

  } catch (error) {
    console.error('Error fetching payment dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify payment with Paystack (REAL INTEGRATION)
const verifyPaymentController = async (req, res) => {
  try {
    const { reference } = req.params;

    // Validate Paystack configuration
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.'
      });
    }

    // Find transaction by reference
    const transaction = await findPaymentTransactionByReference(reference);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }
    if (!ensureTransactionAccess(req, transaction)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to verify this payment transaction'
      });
    }

    // If already verified, return existing data
    if (transaction.payment_status === 'success') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: {
          transaction,
          applicant_id: transaction.applicant_id, // Add applicant_id for frontend
          already_verified: true
        }
      });
    }

    // Call Paystack API to verify payment
    const paystackResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (!paystackResponse.data.status) {
      throw new Error(paystackResponse.data.message || 'Paystack verification failed');
    }

    const paymentData = paystackResponse.data.data;

    // Determine payment status from Paystack response
    let paymentStatus = 'failed';
    if (paymentData.status === 'success') {
      paymentStatus = 'success';
    } else if (paymentData.status === 'abandoned') {
      paymentStatus = 'cancelled';
    }
    

    // Update transaction status in database
    const updatedTransaction = await updatePaymentTransactionStatus(
      transaction.id,
      paymentStatus,
      paymentData
    );

    // If payment successful, update application payment status
    if (paymentStatus === 'success') {
      try {
        await updatePaymentStatus(transaction.applicant_id, 'paid', reference);
      } catch (error) {
        console.error('❌ Failed to update application payment status:', error.message);
        // Don't fail the entire verification if this fails
      }
    }

    res.status(200).json({
      success: true,
      message: paymentStatus === 'success' 
        ? 'Payment verified successfully' 
        : 'Payment verification completed',
      data: {
        transaction: updatedTransaction,
        applicant_id: transaction.applicant_id, // Add applicant_id for frontend
        payment_status: paymentStatus,
        amount_paid: paymentData.amount / 100, // Convert kobo to naira
        paid_at: paymentData.paid_at,
        channel: paymentData.channel,
        currency: paymentData.currency
      }
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to verify payment',
      error: error.message
    });
  }
};

// Initialize payment with Paystack (REAL INTEGRATION)
const initializePaymentController = async (req, res) => {
  try {
    const {
      applicant_id,
      amount,
      email,
      callback_url,
      metadata: requestMetadata,
      subaccount: requestSubaccount,
      paystack_subaccount,
      split_code: requestSplitCode,
      paystack_split_code,
      bearer: requestBearer,
      paystack_bearer,
      transaction_charge: requestTransactionCharge,
      paystack_transaction_charge
    } = req.body;

    // Validate required fields
    if (!applicant_id || !amount || !email) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID, amount, and email are required'
      });
    }
    const hasAccess = await ensureApplicantOwnership(req, applicant_id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to initialize payment for this applicant'
      });
    }

    // Validate Paystack configuration
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.'
      });
    }

    // Generate unique transaction reference
    const transaction_reference = `ADM${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Convert amount to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(parseFloat(amount) * 100);

    // Load school-level payment routing defaults (if configured)
    let schoolSettings = null;
    let schoolCustomSettings = {};
    try {
      schoolSettings = await findSchoolSettings();
      schoolCustomSettings = parseJsonSafe(schoolSettings?.custom_settings, {}) || {};
    } catch (settingsError) {
      console.warn('⚠️ Failed to load school settings for Paystack routing:', settingsError.message);
    }

    const resolvedSubaccount = (
      requestSubaccount ||
      paystack_subaccount ||
      schoolCustomSettings.paystack_subaccount ||
      schoolCustomSettings.paystack_subaccount_code ||
      PAYSTACK_SUBACCOUNT ||
      null
    );

    const resolvedSplitCode = (
      requestSplitCode ||
      paystack_split_code ||
      schoolCustomSettings.paystack_split_code ||
      PAYSTACK_SPLIT_CODE ||
      null
    );

    // Use one Paystack routing mode at a time.
    // If split code is provided, prefer split routing and skip subaccount field.
    const routingMode = resolvedSplitCode ? 'split' : (resolvedSubaccount ? 'subaccount' : 'none');
    const effectiveSubaccount = routingMode === 'subaccount' ? resolvedSubaccount : null;
    const effectiveSplitCode = routingMode === 'split' ? resolvedSplitCode : null;

    const resolvedBearer = normalizePaystackBearer(
      requestBearer ||
      paystack_bearer ||
      schoolCustomSettings.paystack_bearer ||
      PAYSTACK_BEARER
    );

    const resolvedTransactionCharge = toPositiveIntegerOrNull(
      requestTransactionCharge ??
      paystack_transaction_charge ??
      schoolCustomSettings.paystack_transaction_charge ??
      PAYSTACK_TRANSACTION_CHARGE
    );

    // Create payment transaction in database
    const transaction = await createPaymentTransaction({
      transaction_reference,
      applicant_id,
      amount: parseFloat(amount),
      currency: 'NGN',
      payment_method: 'card',
      payment_status: 'pending'
    });

    // Call Paystack API to initialize payment
    const metadata = {
      ...(parseJsonSafe(requestMetadata, {}) || {}),
      applicant_id,
      transaction_id: transaction.id,
      school_payment_routing: {
        mode: routingMode,
        subaccount: effectiveSubaccount,
        split_code: effectiveSplitCode
      }
    };

    const existingCustomFields = Array.isArray(metadata.custom_fields) ? metadata.custom_fields : [];
    metadata.custom_fields = [
      ...existingCustomFields,
      {
        display_name: 'Applicant ID',
        variable_name: 'applicant_id',
        value: applicant_id
      }
    ];

    const paystackPayload = {
      email,
      amount: amountInKobo, // Amount in kobo
      reference: transaction_reference,
      callback_url: callback_url || `${process.env.FRONTEND_URL}/admin/dashboard/student-portal/payments/verify`,
      metadata
    };

    // Paystack split/subaccount routing (optional)
    if (effectiveSubaccount) {
      paystackPayload.subaccount = effectiveSubaccount;
    }
    if (effectiveSplitCode) {
      paystackPayload.split_code = effectiveSplitCode;
    }
    if (resolvedBearer) {
      paystackPayload.bearer = resolvedBearer;
    }
    if (resolvedTransactionCharge !== null) {
      paystackPayload.transaction_charge = resolvedTransactionCharge;
    }

    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      paystackPayload,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!paystackResponse.data.status) {
      throw new Error(paystackResponse.data.message || 'Paystack initialization failed');
    }

    console.log('✅ Paystack payment initialized:', paystackResponse.data.data);
    if (effectiveSubaccount || effectiveSplitCode) {
      console.log('💳 Paystack payment routing applied:', {
        mode: routingMode,
        subaccount: effectiveSubaccount,
        split_code: effectiveSplitCode,
        bearer: resolvedBearer || null,
        transaction_charge: resolvedTransactionCharge
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        transaction_id: transaction.id,
        reference: transaction_reference,
        authorization_url: paystackResponse.data.data.authorization_url,
        access_code: paystackResponse.data.data.access_code,
        payment_routing: {
          mode: routingMode,
          subaccount: effectiveSubaccount,
          split_code: effectiveSplitCode
        }
      }
    });

  } catch (error) {
    console.error('❌ Error initializing payment:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to initialize payment',
      error: error.message
    });
  }
};

// Get payment methods
const getPaymentMethodsController = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or other supported cards',
        icon: 'credit-card',
        enabled: true
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        icon: 'bank',
        enabled: true
      },
      {
        id: 'ussd',
        name: 'USSD',
        description: 'Pay via USSD',
        icon: 'mobile',
        enabled: true
      },
      {
        id: 'qr',
        name: 'QR Code',
        description: 'Scan QR code to pay',
        icon: 'qr-code',
        enabled: false
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Payment methods retrieved successfully',
      data: paymentMethods
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get currencies
const getCurrenciesController = async (req, res) => {
  try {
    const currencies = [
      {
        code: 'NGN',
        name: 'Nigerian Naira',
        symbol: '₦',
        enabled: true
      },
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        enabled: false
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        enabled: false
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        enabled: false
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Currencies retrieved successfully',
      data: currencies
    });

  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Paystack Webhook Handler (REAL INTEGRATION)
const paystackWebhookController = async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Webhook secret key is not configured'
      });
    }

    // Validate webhook signature
    const payload = req.rawBody || JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(payload)
      .digest('hex');

    const signature = req.headers['x-paystack-signature'];
    const hashBuffer = Buffer.from(hash);
    const signatureBuffer = Buffer.from(signature || '');
    const isValidSignature =
      hashBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(hashBuffer, signatureBuffer);

    if (!isValidSignature) {
      console.warn('⚠️ Invalid Paystack webhook signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = req.body;
    console.log('📥 Paystack Webhook Event:', event.event);

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const { reference, status, amount, paid_at, channel, customer } = event.data;

      // Find transaction
      const transaction = await findPaymentTransactionByReference(reference);
      
      if (transaction) {
        // Update transaction status
        await updatePaymentTransactionStatus(
          transaction.id,
          'success',
          event.data
        );
        await updatePaymentStatus(transaction.applicant_id, 'paid', reference);

        console.log('✅ Payment webhook processed:', {
          reference,
          amount: amount / 100,
          applicant_id: transaction.applicant_id
        });

        // You can add additional logic here:
        // - Update application payment status
        // - Send confirmation email
        // - Generate exam card
      } else {
        console.warn('⚠️ Transaction not found for reference:', reference);
      }
    }

    // Acknowledge webhook receipt
    res.status(200).send('Webhook received');

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createPaymentTransactionController,
  getAllPaymentTransactionsController,
  getPaymentTransactionByReferenceController,
  getPaymentTransactionByIdController,
  getPaymentTransactionsByApplicantController,
  getMyPaymentTransactionsController,
  updatePaymentTransactionStatusController,
  updatePaymentTransactionController,
  deletePaymentTransactionController,
  getPaymentStatsController,
  getDailyPaymentSummaryController,
  searchPaymentTransactionsController,
  getPaymentDashboardController,
  verifyPaymentController,
  initializePaymentController,
  paystackWebhookController,
  getPaymentMethodsController,
  getCurrenciesController
};
