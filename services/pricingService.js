const { Tax, Discount, Promotion, ProductBulkPrice, Product, SystemSetting, ProductBatch } = require('../models');
const { Op } = require('sequelize');

/**
 * Pricing Service - Handles tax, discount, and promotion calculations
 */
class PricingService {
    /**
     * Calculate price for a product including bulk pricing and batches
     * @param {Object} product - Product object
     * @param {number} quantity - Quantity ordered
     * @param {string} batchNumber - Optional batch number
     * @returns {Object} - Price breakdown
     */
    static async calculateProductPrice(product, quantity, batchNumber = null) {
        let unitPrice = parseFloat(product.sellingPrice);
        let bulkPriceApplied = null;
        let batchApplied = null;

        // Check for batch-specific pricing
        if (batchNumber) {
            const batch = await ProductBatch.findOne({
                where: { productId: product.id, batchNumber, status: 'active' }
            });
            if (batch) {
                unitPrice = parseFloat(batch.sellingPrice);
                batchApplied = batch.id;
            }
        } else {
            // Default to newest active batch price if available and product price is 0
            const latestBatch = await ProductBatch.findOne({
                where: { productId: product.id, status: 'active' },
                order: [['createdAt', 'DESC']]
            });
            if (latestBatch && (unitPrice === 0 || !unitPrice)) {
                unitPrice = parseFloat(latestBatch.sellingPrice);
                batchApplied = latestBatch.id;
            }
        }

        // Check for bulk pricing (on top of base/batch price)
        if (product.bulkPriceEnabled && quantity >= product.minOrderQuantity) {
            const bulkPrices = await ProductBulkPrice.findAll({
                where: {
                    productId: product.id,
                    isActive: true,
                    minQuantity: { [Op.lte]: quantity }
                },
                order: [['minQuantity', 'DESC']]
            });

            for (const bulkPrice of bulkPrices) {
                if (quantity >= bulkPrice.minQuantity &&
                    (!bulkPrice.maxQuantity || quantity <= bulkPrice.maxQuantity)) {

                    if (bulkPrice.price) {
                        unitPrice = parseFloat(bulkPrice.price);
                    } else if (bulkPrice.discountPercentage) {
                        unitPrice = unitPrice * (1 - bulkPrice.discountPercentage / 100);
                    }
                    bulkPriceApplied = bulkPrice.id;
                    break;
                }
            }
        }

        return {
            originalPrice: parseFloat(product.sellingPrice),
            unitPrice: Math.round(unitPrice * 100) / 100,
            bulkPriceApplied,
            batchApplied,
            bulkDiscount: Math.round((parseFloat(product.sellingPrice) - unitPrice) * 100) / 100
        };
    }

    /**
     * Calculate tax for a product (handles inclusive/exclusive)
     */
    static calculateProductTax(product, amount) {
        if (!product.taxEnabled) {
            return {
                taxEnabled: false,
                taxPercentage: 0,
                taxAmount: 0,
                amountBeforeTax: amount,
                amountAfterTax: amount
            };
        }

        const taxPercentage = parseFloat(product.taxPercentage) || 0;

        // Check if price already includes tax (based on Tax model type if available)
        // If we don't have the tax object here, we default to exclusive unless specified
        const isInclusive = product.tax?.type === 'inclusive';

        let taxAmount, amountBeforeTax, amountAfterTax;

        if (isInclusive) {
            amountAfterTax = amount;
            amountBeforeTax = amount / (1 + taxPercentage / 100);
            taxAmount = amountAfterTax - amountBeforeTax;
        } else {
            amountBeforeTax = amount;
            taxAmount = (amount * taxPercentage) / 100;
            amountAfterTax = amount + taxAmount;
        }

        return {
            taxEnabled: true,
            taxPercentage,
            isInclusive,
            taxAmount: Math.round(taxAmount * 100) / 100,
            amountBeforeTax: Math.round(amountBeforeTax * 100) / 100,
            amountAfterTax: Math.round(amountAfterTax * 100) / 100
        };
    }

    /**
     * Calculate cart item totals with batch and tax
     */
    static async calculateCartItemTotals(product, quantity, batchNumber = null) {
        const pricing = await this.calculateProductPrice(product, quantity, batchNumber);
        const subtotal = pricing.unitPrice * quantity;
        const tax = this.calculateProductTax(product, subtotal);

        return {
            quantity,
            unitPrice: pricing.unitPrice,
            unitPriceWithTax: Math.round((tax.amountAfterTax / quantity) * 100) / 100,
            batchApplied: pricing.batchApplied,
            bulkPriceApplied: pricing.bulkPriceApplied,
            taxAmount: tax.taxAmount,
            subtotal: tax.amountBeforeTax,
            total: tax.amountAfterTax,
            taxPercentage: tax.taxPercentage
        };
    }

    /**
     * Apply discount to cart
     * @param {Object} cart - Cart object with items
     * @param {string} discountCode - Discount code to apply (optional)
     * @param {number} userId - User ID for user-specific discounts
     * @returns {Object} - Discount result
     */
    static async applyDiscount(cart, discountCode = null, userId = null) {
        let discount = null;

        if (discountCode) {
            // Find discount by code
            discount = await Discount.findOne({
                where: {
                    code: discountCode,
                    isActive: true,
                    isDeleted: false
                }
            });
        } else {
            // Find automatic discounts
            discount = await Discount.findOne({
                where: {
                    isAutomatic: true,
                    isActive: true,
                    isDeleted: false
                },
                order: [['priority', 'DESC']]
            });
        }

        if (!discount) {
            return {
                success: false,
                message: 'Discount not found or inactive'
            };
        }

        // Validate discount
        const validation = await this.validateDiscount(discount, cart, userId);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }

        // Calculate discount amount
        const discountAmount = this.calculateDiscountAmount(discount, cart);

        return {
            success: true,
            discount,
            discountAmount,
            message: `Discount "${discount.name}" applied`
        };
    }

    /**
     * Validate if discount can be applied
     */
    static async validateDiscount(discount, cart, userId) {
        const now = new Date();

        // Check date validity
        if (discount.startDate && new Date(discount.startDate) > now) {
            return { valid: false, message: 'Discount has not started yet' };
        }
        if (discount.endDate && new Date(discount.endDate) < now) {
            return { valid: false, message: 'Discount has expired' };
        }

        // Check usage limit
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return { valid: false, message: 'Discount usage limit reached' };
        }

        // Check minimum order amount
        if (discount.minOrderAmount && cart.subtotal < discount.minOrderAmount) {
            return {
                valid: false,
                message: `Minimum order of ${discount.minOrderAmount} required`
            };
        }

        // Check minimum quantity
        if (discount.minQuantity && cart.itemCount < discount.minQuantity) {
            return {
                valid: false,
                message: `Minimum ${discount.minQuantity} items required`
            };
        }

        // Check user-specific usage
        if (userId && discount.usageLimitPerUser) {
            const { Order } = require('../models');
            const userUsage = await Order.count({
                where: {
                    userId,
                    discountId: discount.id
                }
            });

            if (userUsage >= discount.usageLimitPerUser) {
                return { valid: false, message: 'You have already used this discount' };
            }
        }

        // Check applicable products/categories
        if (discount.applicableTo !== 'all') {
            // TODO: Validate cart contains applicable items
        }

        return { valid: true };
    }

    /**
     * Calculate discount amount (including buy_x_get_y)
     */
    static calculateDiscountAmount(discount, cart) {
        let discountAmount = 0;
        const subtotal = parseFloat(cart.subtotal);

        switch (discount.type) {
            case 'percentage':
                discountAmount = (subtotal * discount.value) / 100;
                if (discount.maxDiscountAmount) {
                    discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
                }
                break;

            case 'fixed_amount':
                discountAmount = Math.min(discount.value, subtotal);
                break;

            case 'free_shipping':
                discountAmount = parseFloat(cart.shippingAmount) || 0;
                break;

            case 'buy_x_get_y':
                // Logic: Buy X items, get Y items free (of the same product or cheapest in applicable set)
                // For simplicity here, we apply it to the whole cart itemCount if applicable
                // metadata: { x: 2, y: 1 }
                const { x, y } = discount.metadata || { x: 2, y: 1 };
                const sets = Math.floor(cart.itemCount / (x + y));
                const freeItemsCount = sets * y;

                // Average unit price to simplify global discount
                const avgUnitPrice = subtotal / cart.itemCount;
                discountAmount = freeItemsCount * avgUnitPrice;
                break;
        }

        return Math.round(discountAmount * 100) / 100;
    }

    /**
     * Get active promotions for products
     * @param {Array} productIds - Array of product IDs
     */
    static async getActivePromotions(productIds = null) {
        const now = new Date();
        const where = {
            isActive: true,
            isDeleted: false,
            status: 'active',
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
        };

        const promotions = await Promotion.findAll({
            where,
            order: [['displayOrder', 'ASC']]
        });

        if (productIds && productIds.length > 0) {
            // Filter promotions applicable to these products
            return promotions.filter(promo => {
                if (promo.applicableTo === 'all') return true;
                if (promo.applicableTo === 'products' && promo.productIds) {
                    return productIds.some(id => promo.productIds.includes(id));
                }
                // TODO: Handle category-based promotions
                return false;
            });
        }

        return promotions;
    }

    /**
     * Apply promotion pricing to a product
     */
    static applyPromotionToProduct(product, promotion) {
        if (!promotion) return null;

        const originalPrice = parseFloat(product.sellingPrice);
        let promotionPrice = originalPrice;

        switch (promotion.discountType) {
            case 'percentage':
                promotionPrice = originalPrice * (1 - promotion.discountValue / 100);
                break;

            case 'fixed_amount':
                promotionPrice = originalPrice - promotion.discountValue;
                break;

            case 'special_price':
                promotionPrice = parseFloat(promotion.discountValue);
                break;
        }

        return {
            originalPrice,
            promotionPrice: Math.max(0, Math.round(promotionPrice * 100) / 100),
            promotionId: promotion.id,
            promotionName: promotion.name,
            discountPercentage: Math.round((1 - promotionPrice / originalPrice) * 100)
        };
    }

    /**
     * Calculate complete cart totals
     * @param {Object} cart - Cart with items
     * @param {string} discountCode - Optional discount code
     * @param {number} userId - User ID
     * @returns {Object} - Complete cart totals
     */
    static async calculateCartTotals(cart, discountCode = null, userId = null) {
        let subtotal = 0;
        let taxAmount = 0;
        let itemCount = 0;

        // Calculate item totals
        for (const item of cart.items) {
            subtotal += parseFloat(item.subtotal);
            taxAmount += parseFloat(item.taxAmount);
            itemCount += item.quantity;
        }

        // Apply discount
        let discountAmount = 0;
        let appliedDiscount = null;

        if (discountCode || true) { // Also check for automatic discounts
            const discountResult = await this.applyDiscount(
                { subtotal, itemCount, ...cart },
                discountCode,
                userId
            );

            if (discountResult.success) {
                discountAmount = discountResult.discountAmount;
                appliedDiscount = discountResult.discount;
            }
        }

        // Calculate shipping (Range-based)
        const deliveryRangesSetting = await this.getSettingValue('delivery_ranges', '[]');
        let deliveryRanges = [];
        try {
            deliveryRanges = JSON.parse(deliveryRangesSetting);
        } catch (e) {
            console.error('Failed to parse delivery_ranges setting:', e.message);
        }

        let shippingAmount = 0;
        if (itemCount > 0) {
            // Find applicable range
            const applicableRange = deliveryRanges.find(range =>
                subtotal >= (range.min || 0) && (range.max === null || range.max === undefined || subtotal <= range.max)
            );

            if (applicableRange) {
                shippingAmount = parseFloat(applicableRange.charge);
            } else {
                // Default fallback
                const freeShippingThreshold = parseFloat(await this.getSettingValue('free_shipping_threshold', 5000));
                const defaultShippingCharge = parseFloat(await this.getSettingValue('default_shipping_charge', 100));
                if (subtotal < freeShippingThreshold) {
                    shippingAmount = defaultShippingCharge;
                }
            }
        }

        // Calculate total
        const total = subtotal + taxAmount + shippingAmount - discountAmount;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            shippingAmount: Math.round(shippingAmount * 100) / 100,
            discountAmount: Math.round(discountAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
            itemCount,
            appliedDiscount: appliedDiscount ? {
                id: appliedDiscount.id,
                code: appliedDiscount.code,
                name: appliedDiscount.name
            } : null
        };
    }

    /**
     * Helper: Get setting value
     */
    static async getSettingValue(key, defaultValue = null) {
        try {
            const setting = await SystemSetting.findOne({ where: { key } });
            if (!setting) return defaultValue;

            // Handle different data types if necessary, but for now assuming string/number
            return setting.value || defaultValue;
        } catch (error) {
            console.error(`Error fetching setting ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Get default tax
     */
    static async getDefaultTax() {
        return Tax.findOne({
            where: {
                isDefault: true,
                isActive: true,
                isDeleted: false
            }
        });
    }

    /**
     * Get tax by ID
     */
    static async getTaxById(taxId) {
        return Tax.findOne({
            where: {
                id: taxId,
                isActive: true,
                isDeleted: false
            }
        });
    }

    /**
     * Validate coupon code
     */
    static async validateCoupon(code, userId = null) {
        const discount = await Discount.findOne({
            where: {
                code,
                isActive: true,
                isDeleted: false
            }
        });

        if (!discount) {
            return { valid: false, message: 'Invalid coupon code' };
        }

        // Use a mock cart for basic validation
        const mockCart = { subtotal: 0, itemCount: 0 };
        return this.validateDiscount(discount, mockCart, userId);
    }
}

module.exports = PricingService;
