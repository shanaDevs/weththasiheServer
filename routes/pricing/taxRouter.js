const express = require('express');
const router = express.Router();
const taxController = require('../../controllers/pricing/taxController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { taxValidators } = require('../../validators');

/**
 * @route   GET /api/taxes
 * @desc    Get all taxes
 * @access  Admin
 */
router.get('/',
    authenticateToken,
    requirePermission('taxes', 'read'),
    taxController.getTaxes
);

/**
 * @route   GET /api/taxes/:id
 * @desc    Get tax by ID
 * @access  Admin
 */
router.get('/:id',
    authenticateToken,
    requirePermission('taxes', 'read'),
    taxController.getTax
);

/**
 * @route   POST /api/taxes
 * @desc    Create tax
 * @access  Admin
 */
router.post('/',
    authenticateToken,
    requirePermission('taxes', 'create'),
    taxValidators.create,
    taxController.createTax
);

/**
 * @route   PUT /api/taxes/:id
 * @desc    Update tax
 * @access  Admin
 */
router.put('/:id',
    authenticateToken,
    requirePermission('taxes', 'update'),
    taxValidators.update,
    taxController.updateTax
);

/**
 * @route   DELETE /api/taxes/:id
 * @desc    Delete tax
 * @access  Admin
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('taxes', 'delete'),
    taxController.deleteTax
);

module.exports = router;
