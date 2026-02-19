const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orders/orderController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { orderValidators, queryValidators } = require('../../validators');

/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: Get my orders
 *     description: Returns authenticated user's orders with pagination
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/my',
    authenticateToken,
    queryValidators.pagination,
    orderController.getMyOrders
);

/**
 * @swagger
 * /orders/stats:
 *   get:
 *     summary: Get order statistics
 *     description: Returns order statistics for a date range
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Order statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOrders:
 *                   type: integer
 *                 totalRevenue:
 *                   type: number
 *                 averageOrderValue:
 *                   type: number
 *                 statusBreakdown:
 *                   type: object
 */
router.get('/stats',
    authenticateToken,
    requirePermission('orders', 'read'),
    queryValidators.dateRange,
    orderController.getOrderStats
);

/**
 * @swagger
 * /orders/download/excel:
 *   get:
 *     summary: Download orders as Excel
 *     description: Downloads orders in Excel format with filters
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: rangeType
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, custom]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/download/excel',
    authenticateToken,
    requirePermission('orders', 'read'),
    orderController.downloadOrdersExcel
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders (Admin)
 *     description: Returns all orders with filtering and pagination
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get('/',
    authenticateToken,
    requirePermission('orders', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    orderController.getAllOrders
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Returns order details. Users can only view their own orders.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.get('/:id', authenticateToken, orderController.getOrder);
router.get('/:id/payment-data', authenticateToken, orderController.getPaymentData);
router.get('/:id/invoice', orderController.downloadInvoice);



/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create order from cart
 *     description: Creates a new order from the user's shopping cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, upi, bank_transfer, credit]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Cart is empty or validation error
 */
router.post('/',
    authenticateToken,
    orderValidators.create,
    orderController.createOrder
);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Updates order status. Only valid status transitions are allowed.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, processing, shipped, delivered, cancelled, refunded]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status transition
 */
router.patch('/:id/status',
    authenticateToken,
    requirePermission('orders', 'update'),
    orderValidators.updateStatus,
    orderController.updateOrderStatus
);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     description: Cancel an order. Users can only cancel pending orders.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled
 */
router.post('/:id/cancel',
    authenticateToken,
    orderController.cancelOrder
);

module.exports = router;
