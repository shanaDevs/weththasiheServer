const express = require('express');
const router = express.Router();
const supplierController = require('../../controllers/inventory/supplierController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { body } = require('express-validator');

// Validation rules
const supplierValidation = [
    body('name').notEmpty().withMessage('Supplier name is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().notEmpty().withMessage('Phone number is required')
];

router.get('/', authenticateToken, requirePermission('inventory', 'read'), supplierController.getSuppliers);
router.get('/:id', authenticateToken, requirePermission('inventory', 'read'), supplierController.getSupplier);
router.post('/', authenticateToken, requirePermission('inventory', 'create'), supplierValidation, supplierController.createSupplier);
router.put('/:id', authenticateToken, requirePermission('inventory', 'update'), supplierValidation, supplierController.updateSupplier);
router.delete('/:id', authenticateToken, requirePermission('inventory', 'delete'), supplierController.deleteSupplier);

module.exports = router;
