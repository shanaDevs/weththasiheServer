const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventory/inventoryController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');

router.get('/movements', authenticateToken, requirePermission('inventory', 'read'), inventoryController.getInventoryMovements);
router.get('/stats', authenticateToken, requirePermission('inventory', 'read'), inventoryController.getInventoryStats);

// Batch management routes
router.post('/batches/:productId', authenticateToken, requirePermission('inventory', 'create'), inventoryController.addProductBatch);
router.get('/batches/:productId', authenticateToken, requirePermission('inventory', 'read'), inventoryController.getProductBatches);
router.put('/batches/:id', authenticateToken, requirePermission('inventory', 'update'), inventoryController.updateProductBatch);
router.delete('/batches/:id', authenticateToken, requirePermission('inventory', 'delete'), inventoryController.deleteProductBatch);

module.exports = router;
