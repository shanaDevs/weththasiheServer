const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payments/paymentController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { paymentValidators, queryValidators } = require('../../validators');

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get all recorded payments (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/',
    authenticateToken,
    requirePermission('payments', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    paymentController.getAllPayments
);

/**
 * @swagger
 * /payments/my-payments:
 *   get:
 *     summary: Get my payments (Doctor current user)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my payments
 */
router.get('/my-payments',
    authenticateToken,
    paymentController.getMyPayments
);


/**
 * @swagger
 * /payments/stats:
 *   get:
 *     summary: Get payment financial statistics
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment stats
 */
router.get('/stats',
    authenticateToken,
    requirePermission('payments', 'read'),
    queryValidators.dateRange,
    paymentController.getPaymentStats
);

/**
 * @swagger
 * /payments/order/{orderId}:
 *   get:
 *     summary: Get all payments linked to a specific order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of payments for the order
 */
router.get('/order/:orderId',
    authenticateToken,
    requirePermission('payments', 'read'),
    paymentController.getOrderPayments
);

/**
 * @swagger
 * /payments/order/{orderId}:
 *   post:
 *     summary: Manually add a payment to an order (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       201:
 *         description: Payment added
 */
router.post('/order/:orderId',
    authenticateToken,
    requirePermission('payments', 'create'),
    paymentValidators.addPayment,
    paymentController.addPayment
);

/**
 * @swagger
 * /payments/{id}/refund:
 *   post:
 *     summary: Process a full or partial refund for a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Refund processed
 */
router.post('/:id/refund',
    authenticateToken,
    requirePermission('payments', 'refund'),
    paymentValidators.refund,
    paymentController.processRefund
);

/**
 * @swagger
 * /payments/verify/{orderNumber}:
 *   get:
 *     summary: Verify payment status for an order (used by checkout success/cancel pages)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order payment details
 *       404:
 *         description: Order not found
 */
router.get('/verify/:orderNumber',
    authenticateToken,
    paymentController.verifyOrderPayment
);

/**
 * @swagger
 * /payments/payhere-notify:
 *   post:
 *     summary: Webhook for PayHere payment notifications
 *     tags: [Payments]
 *     security: []
 *     responses:
 *       200:
 *         description: Notification received
 */
router.post('/payhere-notify', paymentController.handlePayHereNotify);

module.exports = router;
