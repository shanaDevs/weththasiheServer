const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payments/paymentController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { paymentValidators, queryValidators } = require('../../validators');

/**
 * @route   GET /api/payments
 * @desc    Get all payments
 * @access  Admin
 */
router.get('/',
    authenticateToken,
    requirePermission('payments', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    paymentController.getAllPayments
);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Admin
 */
router.get('/stats',
    authenticateToken,
    requirePermission('payments', 'read'),
    queryValidators.dateRange,
    paymentController.getPaymentStats
);

/**
 * @route   GET /api/payments/order/:orderId
 * @desc    Get payments for an order
 * @access  Admin
 */
router.get('/order/:orderId',
    authenticateToken,
    requirePermission('payments', 'read'),
    paymentController.getOrderPayments
);

/**
 * @route   POST /api/payments/order/:orderId
 * @desc    Add payment to order
 * @access  Admin
 */
router.post('/order/:orderId',
    authenticateToken,
    requirePermission('payments', 'create'),
    paymentValidators.addPayment,
    paymentController.addPayment
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Process refund
 * @access  Admin
 */
router.post('/:id/refund',
    authenticateToken,
    requirePermission('payments', 'refund'),
    paymentValidators.refund,
    paymentController.processRefund
);

/**
 * @route   POST /api/payments/payhere-notify
 * @desc    PayHere IPN callback
 * @access  Public
 */
router.post('/payhere-notify', paymentController.handlePayHereNotify);

module.exports = router;
