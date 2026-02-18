const express = require('express');
const router = express.Router();
const promotionController = require('../../controllers/pricing/promotionController');
const { authenticateToken, requirePermission, optionalAuth } = require('../../middleware/auth');
const { promotionValidators, queryValidators } = require('../../validators');

/**
 * @route   GET /api/promotions/active
 * @desc    Get active promotions (for shop)
 * @access  Public
 */
router.get('/active', optionalAuth, promotionController.getActivePromotions);

/**
 * @route   GET /api/promotions
 * @desc    Get all promotions
 * @access  Admin
 */
router.get('/',
    authenticateToken,
    requirePermission('promotions', 'read'),
    queryValidators.pagination,
    promotionController.getPromotions
);

/**
 * @route   GET /api/promotions/:id
 * @desc    Get promotion by ID
 * @access  Admin
 */
router.get('/:id',
    authenticateToken,
    requirePermission('promotions', 'read'),
    promotionController.getPromotion
);

/**
 * @route   GET /api/promotions/:id/products
 * @desc    Get promotion products
 * @access  Public
 */
router.get('/:id/products',
    optionalAuth,
    queryValidators.pagination,
    promotionController.getPromotionProducts
);

/**
 * @route   POST /api/promotions
 * @desc    Create promotion
 * @access  Admin
 */
router.post('/',
    authenticateToken,
    requirePermission('promotions', 'create'),
    promotionValidators.create,
    promotionController.createPromotion
);

/**
 * @route   PUT /api/promotions/:id
 * @desc    Update promotion
 * @access  Admin
 */
router.put('/:id',
    authenticateToken,
    requirePermission('promotions', 'update'),
    promotionValidators.update,
    promotionController.updatePromotion
);

/**
 * @route   DELETE /api/promotions/:id
 * @desc    Delete promotion
 * @access  Admin
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('promotions', 'delete'),
    promotionController.deletePromotion
);

module.exports = router;
