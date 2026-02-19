const { Cart, CartItem, Product, ProductBulkPrice, Discount, Address, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { PricingService, InventoryService, AuditLogService } = require('../../services');

/**
 * Get current user's cart
 */
exports.getCart = async (req, res, next) => {
    try {
        let cart = await Cart.findOne({
            where: {
                userId: req.user.id,
                status: 'active'
            },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'slug', 'thumbnail', 'stockQuantity', 'trackInventory', 'allowBackorder']
                    }]
                },
                {
                    model: Discount,
                    as: 'discount',
                    attributes: ['id', 'name', 'code', 'type', 'value']
                },
                {
                    model: Address,
                    as: 'shippingAddress'
                },
                {
                    model: Address,
                    as: 'billingAddress'
                }
            ]
        });

        if (!cart) {
            // Create new cart
            cart = await Cart.create({
                userId: req.user.id,
                status: 'active',
                lastActivityAt: new Date()
            });

            cart = await Cart.findByPk(cart.id, {
                include: [{ model: CartItem, as: 'items' }]
            });
        }

        res.json({
            success: true,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add item to cart
 */
exports.addToCart = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { productId, quantity } = req.body;

        // Validate product
        const product = await Product.findByPk(productId, {
            include: [{ model: ProductBulkPrice, as: 'bulkPrices', where: { isActive: true }, required: false }]
        });

        if (!product || product.isDeleted || !product.isActive) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Product not found or unavailable'
            });
        }

        // Check stock
        const stockCheck = await InventoryService.checkStock(productId, quantity);
        if (!stockCheck.available) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: stockCheck.message
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({
            where: { userId: req.user.id, status: 'active' },
            transaction
        });

        if (!cart) {
            cart = await Cart.create({
                userId: req.user.id,
                status: 'active',
                lastActivityAt: new Date()
            }, { transaction });
        }

        // Check if item already in cart
        let cartItem = await CartItem.findOne({
            where: { cartId: cart.id, productId },
            transaction
        });

        // Calculate pricing
        const totalQuantity = cartItem ? cartItem.quantity + quantity : quantity;
        const pricing = await PricingService.calculateCartItemTotals(product, totalQuantity);

        if (cartItem) {
            // Update existing item
            cartItem.quantity = totalQuantity;
            cartItem.unitPrice = pricing.unitPrice;
            cartItem.originalPrice = pricing.originalPrice;
            cartItem.taxEnabled = pricing.taxEnabled;
            cartItem.taxPercentage = pricing.taxPercentage;
            cartItem.taxAmount = pricing.taxAmount;
            cartItem.subtotal = pricing.subtotal;
            cartItem.total = pricing.total;
            cartItem.appliedBulkPriceId = pricing.bulkPriceApplied;
            await cartItem.save({ transaction });
        } else {
            // Create new item
            cartItem = await CartItem.create({
                cartId: cart.id,
                productId,
                quantity,
                unitPrice: pricing.unitPrice,
                originalPrice: pricing.originalPrice,
                taxEnabled: pricing.taxEnabled,
                taxPercentage: pricing.taxPercentage,
                taxAmount: pricing.taxAmount,
                subtotal: pricing.subtotal,
                total: pricing.total,
                productName: product.name,
                productSku: product.sku,
                productImage: product.thumbnail,
                appliedBulkPriceId: pricing.bulkPriceApplied
            }, { transaction });
        }

        // Update cart totals
        await this.recalculateCartTotals(cart.id, transaction);

        await transaction.commit();

        // Fetch updated cart
        const updatedCart = await this.fetchCart(cart.id);

        res.json({
            success: true,
            message: 'Item added to cart',
            data: updatedCart
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { itemId } = req.params;
        const { quantity } = req.body;

        const cartItem = await CartItem.findByPk(itemId, {
            include: [{
                model: Cart,
                as: 'cart',
                where: { userId: req.user.id, status: 'active' }
            }],
            transaction
        });

        if (!cartItem) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        if (quantity <= 0) {
            // Remove item
            await cartItem.destroy({ transaction });
        } else {
            // Check stock
            const stockCheck = await InventoryService.checkStock(cartItem.productId, quantity);
            if (!stockCheck.available) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: stockCheck.message
                });
            }

            // Recalculate pricing
            const product = await Product.findByPk(cartItem.productId);
            const pricing = await PricingService.calculateCartItemTotals(product, quantity);

            cartItem.quantity = quantity;
            cartItem.unitPrice = pricing.unitPrice;
            cartItem.originalPrice = pricing.originalPrice;
            cartItem.taxAmount = pricing.taxAmount;
            cartItem.subtotal = pricing.subtotal;
            cartItem.total = pricing.total;
            cartItem.appliedBulkPriceId = pricing.bulkPriceApplied;
            await cartItem.save({ transaction });
        }

        // Recalculate cart totals
        await this.recalculateCartTotals(cartItem.cart.id, transaction);

        await transaction.commit();

        const updatedCart = await this.fetchCart(cartItem.cart.id);

        res.json({
            success: true,
            message: quantity <= 0 ? 'Item removed from cart' : 'Cart updated',
            data: updatedCart
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { itemId } = req.params;

        const cartItem = await CartItem.findByPk(itemId, {
            include: [{
                model: Cart,
                as: 'cart',
                where: { userId: req.user.id, status: 'active' }
            }],
            transaction
        });

        if (!cartItem) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        const cartId = cartItem.cart.id;
        await cartItem.destroy({ transaction });

        await this.recalculateCartTotals(cartId, transaction);

        await transaction.commit();

        const updatedCart = await this.fetchCart(cartId);

        res.json({
            success: true,
            message: 'Item removed from cart',
            data: updatedCart
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Clear cart
 */
exports.clearCart = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const cart = await Cart.findOne({
            where: { userId: req.user.id, status: 'active' },
            transaction
        });

        if (!cart) {
            await transaction.commit();
            return res.status(200).json({
                success: true,
                message: 'Cart is already empty',
                data: null
            });
        }

        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction
        });

        cart.subtotal = 0;
        cart.taxAmount = 0;
        cart.discountAmount = 0;
        cart.total = 0;
        cart.itemCount = 0;
        cart.discountId = null;
        cart.couponCode = null;
        cart.lastActivityAt = new Date();
        await cart.save({ transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Cart cleared',
            data: cart
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Apply discount/coupon to cart
 */
exports.applyCoupon = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { couponCode } = req.body;

        if (!couponCode) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code is required'
            });
        }

        const cart = await Cart.findOne({
            where: { userId: req.user.id, status: 'active' },
            include: [{ model: CartItem, as: 'items' }],
            transaction
        });

        if (!cart || cart.items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Apply discount
        const result = await PricingService.applyDiscount(cart, couponCode, req.user.id);

        if (!result.success) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        // Update cart
        cart.discountId = result.discount.id;
        cart.couponCode = couponCode;
        cart.discountAmount = result.discountAmount;
        cart.total = cart.subtotal + cart.taxAmount - result.discountAmount;
        cart.lastActivityAt = new Date();
        await cart.save({ transaction });

        await transaction.commit();

        const updatedCart = await this.fetchCart(cart.id);

        res.json({
            success: true,
            message: result.message,
            data: updatedCart
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Remove discount/coupon from cart
 */
exports.removeCoupon = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const cart = await Cart.findOne({
            where: { userId: req.user.id, status: 'active' },
            transaction
        });

        if (!cart) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.discountId = null;
        cart.couponCode = null;
        cart.discountAmount = 0;
        cart.total = cart.subtotal + cart.taxAmount;
        cart.lastActivityAt = new Date();
        await cart.save({ transaction });

        await transaction.commit();

        const updatedCart = await this.fetchCart(cart.id);

        res.json({
            success: true,
            message: 'Coupon removed',
            data: updatedCart
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Set shipping/billing address
 */
exports.setAddresses = async (req, res, next) => {
    try {
        const { shippingAddressId, billingAddressId } = req.body;

        const cart = await Cart.findOne({
            where: { userId: req.user.id, status: 'active' }
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Validate addresses belong to user
        if (shippingAddressId) {
            const shippingAddr = await Address.findOne({
                where: { id: shippingAddressId, userId: req.user.id, isDeleted: false }
            });
            if (!shippingAddr) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shipping address'
                });
            }
            cart.shippingAddressId = shippingAddressId;
        }

        if (billingAddressId) {
            const billingAddr = await Address.findOne({
                where: { id: billingAddressId, userId: req.user.id, isDeleted: false }
            });
            if (!billingAddr) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid billing address'
                });
            }
            cart.billingAddressId = billingAddressId;
        }

        cart.lastActivityAt = new Date();
        await cart.save();

        const updatedCart = await this.fetchCart(cart.id);

        res.json({
            success: true,
            message: 'Addresses updated',
            data: updatedCart
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: Recalculate cart totals
 */
exports.recalculateCartTotals = async function (cartId, transaction = null) {
    const cart = await Cart.findByPk(cartId, {
        include: [{ model: CartItem, as: 'items' }],
        transaction
    });

    if (!cart) return null;

    // Use PricingService for consistent calculations
    const totals = await PricingService.calculateCartTotals(
        cart,
        cart.couponCode,
        cart.userId
    );

    // Update cart with new totals
    cart.subtotal = totals.subtotal;
    cart.taxAmount = totals.taxAmount;
    cart.shippingAmount = totals.shippingAmount;
    cart.discountAmount = totals.discountAmount;
    cart.total = totals.total;
    cart.itemCount = totals.itemCount;

    // Update discount if it was returned as null by PricingService
    if (!totals.appliedDiscount) {
        cart.discountId = null;
        cart.couponCode = null;
    }

    cart.lastActivityAt = new Date();
    await cart.save({ transaction });

    return cart;
};

/**
 * Helper: Fetch cart with all includes
 */
exports.fetchCart = async function (cartId) {
    return Cart.findByPk(cartId, {
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'slug', 'thumbnail', 'stockQuantity', 'trackInventory', 'allowBackorder']
                }]
            },
            {
                model: Discount,
                as: 'discount',
                attributes: ['id', 'name', 'code', 'type', 'value']
            },
            { model: Address, as: 'shippingAddress' },
            { model: Address, as: 'billingAddress' }
        ]
    });
};
