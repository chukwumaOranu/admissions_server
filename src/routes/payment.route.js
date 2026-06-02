const express = require('express');
const router = express.Router();

// Import controllers
const PaymentController = require('../controllers/payment.controller');
const PaymentInvoiceController = require('../controllers/paymentInvoice.controller');

// Import middleware
const { protectRoute, requireRoles } = require('../middlewares/auth.middleware');

// =====================================================
// PAYMENT TRANSACTION ROUTES
// =====================================================

// Create new payment transaction
router.post('/transactions', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.createPaymentTransactionController);

// Get all payment transactions with pagination and filters
router.get('/transactions', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.getAllPaymentTransactionsController);

// Get current user's payment transactions
router.get('/transactions/my', protectRoute, PaymentController.getMyPaymentTransactionsController);

// Get payment transaction by reference
router.get('/transactions/reference/:reference', protectRoute, PaymentController.getPaymentTransactionByReferenceController);

// Get payment transaction by ID
router.get('/transactions/:id', protectRoute, PaymentController.getPaymentTransactionByIdController);

// Get transactions by applicant
router.get('/transactions/applicant/:applicantId', protectRoute, PaymentController.getPaymentTransactionsByApplicantController);

// Update payment transaction status
router.put('/transactions/:id/status', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.updatePaymentTransactionStatusController);

// Update payment transaction details
router.put('/transactions/:id', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.updatePaymentTransactionController);

// Delete payment transaction
router.delete('/transactions/:id', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.deletePaymentTransactionController);

// =====================================================
// PAYSTACK INTEGRATION ROUTES
// =====================================================

// Initialize payment with Paystack
router.post('/initialize', protectRoute, PaymentController.initializePaymentController);

// Verify payment with Paystack
router.get('/verify/:reference', protectRoute, PaymentController.verifyPaymentController);

// Paystack Webhook (NO AUTH - Paystack calls this)
router.post('/webhook', PaymentController.paystackWebhookController);

// =====================================================
// PAYMENT UTILITY ROUTES
// =====================================================

// Get payment statistics
router.get('/stats/overview', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.getPaymentStatsController);

// Get daily payment summary
router.get('/stats/daily-summary', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.getDailyPaymentSummaryController);

// Search payment transactions
router.get('/search/query', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.searchPaymentTransactionsController);

// Get payment dashboard data
router.get('/dashboard/overview', protectRoute, requireRoles('Super Admin', 'Admin'), PaymentController.getPaymentDashboardController);

// Get payment methods
router.get('/methods/list', protectRoute, PaymentController.getPaymentMethodsController);

// Get currencies
router.get('/currencies/list', protectRoute, PaymentController.getCurrenciesController);

// =====================================================
// PAYMENT INVOICE ROUTES
// =====================================================

// Generate payment invoice PDF
router.get('/invoice/:transactionReference', protectRoute, PaymentInvoiceController.generatePaymentInvoiceController);

// Generate payment invoice preview (JSON with base64 PDF)
router.get('/invoice/:transactionReference/preview', protectRoute, PaymentInvoiceController.generatePaymentInvoicePreviewController);

module.exports = router;
