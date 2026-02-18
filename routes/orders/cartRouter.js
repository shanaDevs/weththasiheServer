const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/orders/cartController');
const { authenticateToken } = require('../../middleware/auth');
const { cartValidators } = require('../../validators');

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get current user's cart
 *     description: Returns the shopping cart with items, totals, and applied discounts
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CartItem'
 *                     subtotal:
 *                       type: number
 *                     taxAmount:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *                     totalAmount:
 *                       type: number
 *                     couponCode:
 *                       type: string
 */
router.get('/', authenticateToken, cartController.getCart);

/**
 * @swagger
 * /cart/items:
 *   post:
 *     summary: Add item to cart
 *     description: Adds a product to the shopping cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Validation error or out of stock
 */
router.post('/items',
    authenticateToken,
    cartValidators.addItem,
    cartController.addToCart
);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
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
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated
 *       404:
 *         description: Item not found in cart
 */
router.put('/items/:itemId',
    authenticateToken,
    cartValidators.updateItem,
    cartController.updateCartItem
);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.delete('/items/:itemId',
    authenticateToken,
    cartController.removeFromCart
);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Clear cart
 *     description: Removes all items from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete('/',
    authenticateToken,
    cartController.clearCart
);

/**
 * @swagger
 * /cart/coupon:
 *   post:
 *     summary: Apply coupon to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Coupon code
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Invalid or expired coupon
 */
router.post('/coupon',
    authenticateToken,
    cartValidators.applyCoupon,
    cartController.applyCoupon
);

/**
 * @swagger
 * /cart/coupon:
 *   delete:
 *     summary: Remove coupon from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon removed successfully
 */
router.delete('/coupon',
    authenticateToken,
    cartController.removeCoupon
);

/**
 * @swagger
 * /cart/addresses:
 *   put:
 *     summary: Set shipping/billing addresses
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingAddressId:
 *                 type: integer
 *               billingAddressId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Addresses set successfully
 */
router.put('/addresses',
    authenticateToken,
    cartController.setAddresses
);

module.exports = router;
