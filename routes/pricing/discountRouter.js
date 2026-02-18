const express = require('express');
const router = express.Router();
const discountController = require('../../controllers/pricing/discountController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { discountValidators, queryValidators } = require('../../validators');

/**
 * @route   GET /api/discounts
 * @desc    Get all discounts
 * @access  Admin
 */
router.get('/',
    authenticateToken,
    requirePermission('discounts', 'read'),
    queryValidators.pagination,
    discountController.getDiscounts
);

/**
 * @route   GET /api/discounts/:id
 * @desc    Get discount by ID
 * @access  Admin
 */
router.get('/:id',
    authenticateToken,
    requirePermission('discounts', 'read'),
    discountController.getDiscount
);

/**
 * @route   POST /api/discounts
 * @desc    Create discount
 * @access  Admin
 */
router.post('/',
    authenticateToken,
    requirePermission('discounts', 'create'),
    discountValidators.create,
    discountController.createDiscount
);

/**
 * @route   PUT /api/discounts/:id
 * @desc    Update discount
 * @access  Admin
 */
router.put('/:id',
    authenticateToken,
    requirePermission('discounts', 'update'),
    discountValidators.update,
    discountController.updateDiscount
);

/**
 * @route   DELETE /api/discounts/:id
 * @desc    Delete discount
 * @access  Admin
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('discounts', 'delete'),
    discountController.deleteDiscount
);

/**
 * @route   POST /api/discounts/validate
 * @desc    Validate discount code
 * @access  Private
 */
router.post('/validate',
    authenticateToken,
    discountController.validateCode
);

module.exports = router;
