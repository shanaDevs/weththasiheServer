const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../../controllers/inventory/purchaseOrderController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { body } = require('express-validator');

// Validation rules
const poValidation = [
    body('supplierId').isInt().withMessage('Supplier ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isInt().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice').isDecimal().withMessage('Unit price is required')
];

router.get('/', authenticateToken, requirePermission('inventory', 'read'), purchaseOrderController.getPurchaseOrders);
router.get('/:id/pdf', authenticateToken, requirePermission('inventory', 'read'), purchaseOrderController.downloadPdf);
router.get('/:id', authenticateToken, requirePermission('inventory', 'read'), purchaseOrderController.getPurchaseOrder);
router.post('/', authenticateToken, requirePermission('inventory', 'create'), poValidation, purchaseOrderController.createPurchaseOrder);
router.post('/:id/send', authenticateToken, requirePermission('inventory', 'update'), purchaseOrderController.sendPurchaseOrder);
router.patch('/:id/status', authenticateToken, requirePermission('inventory', 'update'), purchaseOrderController.updateStatus);
router.post('/:id/receive', authenticateToken, requirePermission('inventory', 'update'), purchaseOrderController.receiveItems);

module.exports = router;
