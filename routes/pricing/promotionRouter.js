const express = require('express');
const router = express.Router();
const promotionController = require('../../controllers/pricing/promotionController');
const { authenticateToken, requirePermission, optionalAuth } = require('../../middleware/auth');
const { promotionValidators, queryValidators } = require('../../validators');

/**
 * @swagger
 * /promotions/active:
 *   get:
 *     summary: Get all active promotions
 *     tags: [Promotions]
 *     security: []
 *     responses:
 *       200:
 *         description: List of active campaigns
 */
router.get('/active', optionalAuth, promotionController.getActivePromotions);

/**
 * @swagger
 * /promotions:
 *   get:
 *     summary: Get all promotions (Admin only)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of promotions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/',
    authenticateToken,
    requirePermission('promotions', 'read'),
    queryValidators.pagination,
    promotionController.getPromotions
);

/**
 * @swagger
 * /promotions/{id}:
 *   get:
 *     summary: Get promotion detail by ID (Admin only)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 */
router.get('/:id',
    authenticateToken,
    requirePermission('promotions', 'read'),
    promotionController.getPromotion
);

/**
 * @swagger
 * /promotions/{id}/products:
 *   get:
 *     summary: Get products associated with a promotion
 *     tags: [Promotions]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - $ref: '#/components/parameters/PageParam'
 *     responses:
 *       200:
 *         description: List of products under this promotion
 */
router.get('/:id/products',
    optionalAuth,
    queryValidators.pagination,
    promotionController.getPromotionProducts
);

/**
 * @swagger
 * /promotions:
 *   post:
 *     summary: Create new promotional campaign (Admin only)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Promotion'
 *     responses:
 *       201:
 *         description: Promotion created
 */
router.post('/',
    authenticateToken,
    requirePermission('promotions', 'create'),
    promotionValidators.create,
    promotionController.createPromotion
);

/**
 * @swagger
 * /promotions/{id}:
 *   put:
 *     summary: Update promotion (Admin only)
 *     tags: [Promotions]
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
 *             $ref: '#/components/schemas/Promotion'
 *     responses:
 *       200:
 *         description: Promotion updated
 */
router.put('/:id',
    authenticateToken,
    requirePermission('promotions', 'update'),
    promotionValidators.update,
    promotionController.updatePromotion
);

/**
 * @swagger
 * /promotions/{id}:
 *   delete:
 *     summary: Delete promotion (Admin only)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion deleted
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('promotions', 'delete'),
    promotionController.deletePromotion
);

module.exports = router;
