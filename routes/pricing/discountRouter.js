const express = require('express');
const router = express.Router();
const discountController = require('../../controllers/pricing/discountController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { discountValidators, queryValidators } = require('../../validators');

/**
 * @swagger
 * /discounts:
 *   get:
 *     summary: Get all discounts (Admin only)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of discounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/',
    authenticateToken,
    requirePermission('discounts', 'read'),
    queryValidators.pagination,
    discountController.getDiscounts
);

/**
 * @swagger
 * /discounts/{id}:
 *   get:
 *     summary: Get discount by ID (Admin only)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Discount details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 */
router.get('/:id',
    authenticateToken,
    requirePermission('discounts', 'read'),
    discountController.getDiscount
);

/**
 * @swagger
 * /discounts:
 *   post:
 *     summary: Create new discount (Admin only)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Discount'
 *     responses:
 *       201:
 *         description: Discount created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/',
    authenticateToken,
    requirePermission('discounts', 'create'),
    discountValidators.create,
    discountController.createDiscount
);

/**
 * @swagger
 * /discounts/{id}:
 *   put:
 *     summary: Update discount (Admin only)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Discount'
 *     responses:
 *       200:
 *         description: Discount updated
 */
router.put('/:id',
    authenticateToken,
    requirePermission('discounts', 'update'),
    discountValidators.update,
    discountController.updateDiscount
);

/**
 * @swagger
 * /discounts/{id}:
 *   delete:
 *     summary: Delete discount (Admin only)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Discount deleted
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('discounts', 'delete'),
    discountController.deleteDiscount
);

/**
 * @swagger
 * /discounts/validate:
 *   post:
 *     summary: Validate a discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, orderAmount]
 *             properties:
 *               code: { type: string }
 *               orderAmount: { type: number }
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/validate',
    authenticateToken,
    discountController.validateCode
);

module.exports = router;
