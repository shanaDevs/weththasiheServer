const express = require('express');
const router = express.Router();
const productController = require('../../controllers/products/productController');
const { authenticateToken, requirePermission, optionalAuth } = require('../../middleware/auth');
const { productValidators, queryValidators } = require('../../validators');

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get products for shopping
 *     description: Returns products that are in stock. Supports pagination, filtering, and search.
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', authenticateToken, queryValidators.pagination, productController.getProducts);

/**
 * @swagger
 * /products/admin:
 *   get:
 *     summary: Get all products (Admin)
 *     description: Returns all products including out of stock items
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of all products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires products.read permission
 */
router.get('/admin',
    authenticateToken,
    requirePermission('products', 'read'),
    queryValidators.pagination,
    productController.getProductsAdmin
);

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     description: Returns products with quantity below reorder level
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of low stock products
 *       401:
 *         description: Unauthorized
 */
router.get('/low-stock',
    authenticateToken,
    requirePermission('products', 'read'),
    productController.getLowStockProducts
);

/**
 * @swagger
 * /products/out-of-stock:
 *   get:
 *     summary: Get out of stock products
 *     description: Returns products with zero quantity
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of out of stock products
 */
router.get('/out-of-stock',
    authenticateToken,
    requirePermission('products', 'read'),
    productController.getOutOfStockProducts
);

/**
 * @swagger
 * /products/expiring:
 *   get:
 *     summary: Get expiring products
 *     description: Returns products expiring within 90 days
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: List of expiring products
 */
router.get('/expiring',
    authenticateToken,
    requirePermission('products', 'read'),
    productController.getExpiringProducts
);

// Get manufacturers (brands)
router.get('/manufacturers', authenticateToken, productController.getManufacturers);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id', optionalAuth, productController.getProduct);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               quantity:
 *                 type: integer
 *               categoryId:
 *                 type: integer
 *               taxEnabled:
 *                 type: boolean
 *               taxPercentage:
 *                 type: number
 *               manufacturer:
 *                 type: string
 *               requiresPrescription:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires products.create permission
 */
router.post('/',
    authenticateToken,
    requirePermission('products', 'create'),
    productValidators.create,
    productController.createProduct
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/:id',
    authenticateToken,
    requirePermission('products', 'update'),
    productValidators.update,
    productController.updateProduct
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (soft delete)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('products', 'delete'),
    productController.deleteProduct
);

/**
 * @swagger
 * /products/{id}/stock:
 *   patch:
 *     summary: Update product stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - type
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Quantity to add or remove
 *               type:
 *                 type: string
 *                 enum: [add, remove, set]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock updated successfully
 */
router.patch('/:id/stock',
    authenticateToken,
    requirePermission('inventory', 'update'),
    productValidators.updateStock,
    productController.updateStock
);

/**
 * @swagger
 * /products/{id}/inventory-movements:
 *   get:
 *     summary: Get product inventory movements
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of inventory movements
 */
router.get('/:id/inventory-movements',
    authenticateToken,
    requirePermission('inventory', 'read'),
    productController.getInventoryMovements
);

/**
 * @swagger
 * /products/bulk-update:
 *   post:
 *     summary: Bulk update products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *                     isActive:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Products updated successfully
 */
router.post('/bulk-update',
    authenticateToken,
    requirePermission('products', 'update'),
    productController.bulkUpdate
);

const inventoryController = require('../../controllers/inventory/inventoryController');
const orderRequestController = require('../../controllers/orders/orderRequestController');

// ... (existing routes)

// ----- Inventory & Batches -----
/**
 * @swagger
 * /products/suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contactPerson: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *     responses:
 *       201: { description: Supplier created }
 */
router.post('/suppliers', authenticateToken, requirePermission('manage_inventory'), inventoryController.createSupplier);

/**
 * @swagger
 * /products/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of suppliers }
 */
router.get('/suppliers', authenticateToken, requirePermission('manage_inventory'), inventoryController.getSuppliers);

/**
 * @swagger
 * /products/{productId}/batches:
 *   post:
 *     summary: Add product batch
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batchNumber, expiryDate, quantity, purchasePrice]
 *             properties:
 *               batchNumber: { type: string }
 *               expiryDate: { type: string, format: date }
 *               quantity: { type: integer }
 *               purchasePrice: { type: number }
 *     responses:
 *       201: { description: Batch added }
 */
router.post('/:productId/batches', authenticateToken, requirePermission('manage_inventory'), inventoryController.addProductBatch);

/**
 * @swagger
 * /products/{productId}/batches:
 *   get:
 *     summary: Get product batches
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of batches }
 */
router.get('/:productId/batches', authenticateToken, inventoryController.getProductBatches);
router.put('/batches/:id', authenticateToken, requirePermission('manage_inventory'), inventoryController.updateProductBatch);
router.delete('/batches/:id', authenticateToken, requirePermission('manage_inventory'), inventoryController.deleteProductBatch);

// ----- Order Requests (Order More) -----
/**
 * @swagger
 * /products/order-more:
 *   post:
 *     summary: Submit order more request
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: integer }
 *               quantity: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Request submitted }
 */
router.post('/order-more', authenticateToken, orderRequestController.submitOrderRequest);

/**
 * @swagger
 * /products/admin/order-requests:
 *   get:
 *     summary: Get all order requests
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of requests }
 */
router.get('/admin/order-requests', authenticateToken, requirePermission('manage_orders'), orderRequestController.getOrderRequests);

/**
 * @swagger
 * /products/admin/order-requests/{id}:
 *   patch:
 *     summary: Process order request
 *     tags: [Products]
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
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *               adminNotes: { type: string }
 *     responses:
 *       200: { description: Request processed }
 */
router.patch('/admin/order-requests/:id', authenticateToken, requirePermission('manage_orders'), orderRequestController.processOrderRequest);

module.exports = router;
