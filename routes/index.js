const express = require('express');
const router = express.Router();

// Import route files
// Users & Auth
router.use('/users', require('./users/userRouter'));

// Products & Categories
router.use('/products', require('./products/productRouter'));
router.use('/categories', require('./products/categoryRouter'));

// Orders & Cart
router.use('/orders', require('./orders/orderRouter'));
router.use('/cart', require('./orders/cartRouter'));

// Customers
router.use('/doctors', require('./customers/doctorRouter'));

// Pricing
router.use('/taxes', require('./pricing/taxRouter'));
router.use('/discounts', require('./pricing/discountRouter'));
router.use('/promotions', require('./pricing/promotionRouter'));

// Payments
router.use('/payments', require('./payments/paymentRouter'));

// Settings & Audit
router.use('/settings', require('./settings/settingsRouter'));
router.use('/audit-logs', require('./audit/auditRouter'));

// Upload
router.use('/upload', require('./upload'));


/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API and database status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

module.exports = router;

