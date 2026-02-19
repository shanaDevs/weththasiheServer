const express = require('express');
const router = express.Router();
const taxController = require('../../controllers/pricing/taxController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { taxValidators } = require('../../validators');

/**
 * @swagger
 * /taxes:
 *   get:
 *     summary: Get all tax configurations (Admin only)
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of taxes
 */
router.get('/',
    authenticateToken,
    requirePermission('taxes', 'read'),
    taxController.getTaxes
);

/**
 * @swagger
 * /taxes/{id}:
 *   get:
 *     summary: Get tax configuration by ID (Admin only)
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tax details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tax'
 */
router.get('/:id',
    authenticateToken,
    requirePermission('taxes', 'read'),
    taxController.getTax
);

/**
 * @swagger
 * /taxes:
 *   post:
 *     summary: Create new tax configuration (Admin only)
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tax'
 *     responses:
 *       201:
 *         description: Tax created
 */
router.post('/',
    authenticateToken,
    requirePermission('taxes', 'create'),
    taxValidators.create,
    taxController.createTax
);

/**
 * @swagger
 * /taxes/{id}:
 *   put:
 *     summary: Update tax configuration (Admin only)
 *     tags: [Taxes]
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
 *             $ref: '#/components/schemas/Tax'
 *     responses:
 *       200:
 *         description: Tax updated
 */
router.put('/:id',
    authenticateToken,
    requirePermission('taxes', 'update'),
    taxValidators.update,
    taxController.updateTax
);

/**
 * @swagger
 * /taxes/{id}:
 *   delete:
 *     summary: Delete tax configuration (Admin only)
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tax deleted
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('taxes', 'delete'),
    taxController.deleteTax
);

module.exports = router;
