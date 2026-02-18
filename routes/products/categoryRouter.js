const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/products/categoryController');
const { authenticateToken, requirePermission, optionalAuth } = require('../../middleware/auth');
const { categoryValidators } = require('../../validators');

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security: []
 *     responses:
 *       200: { description: List of categories }
 */
router.get('/', optionalAuth, categoryController.getCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get single category
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Category details }
 */
router.get('/:id', optionalAuth, categoryController.getCategory);

/**
 * @swagger
 * /categories/{id}/products:
 *   get:
 *     summary: Get products in category
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of products }
 */
router.get('/:id/products', optionalAuth, categoryController.getCategoryProducts);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create category (Admin)
 *     tags: [Categories]
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
 *               description: { type: string }
 *               parentId: { type: integer }
 *               image: { type: string }
 *               icon: { type: string }
 *     responses:
 *       201: { description: Category created }
 */
router.post('/',
    authenticateToken,
    requirePermission('categories', 'create'),
    categoryValidators.create,
    categoryController.createCategory
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update category (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Category updated }
 */
router.put('/:id',
    authenticateToken,
    requirePermission('categories', 'update'),
    categoryValidators.update,
    categoryController.updateCategory
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete category (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Category deleted }
 */
router.delete('/:id',
    authenticateToken,
    requirePermission('categories', 'delete'),
    categoryController.deleteCategory
);

/**
 * @swagger
 * /categories/reorder:
 *   post:
 *     summary: Reorder categories (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orders]
 *             properties:
 *               orders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     sortOrder: { type: integer }
 *     responses:
 *       200: { description: Reordered successfully }
 */
router.post('/reorder',
    authenticateToken,
    requirePermission('categories', 'update'),
    categoryController.reorderCategories
);

module.exports = router;
