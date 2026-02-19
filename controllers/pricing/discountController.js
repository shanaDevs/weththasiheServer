const { Discount, Order, Product, Category, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService } = require('../../services');

/**
 * Get all discounts
 */
exports.getDiscounts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            isActive,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};
        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Discount.findAndCountAll({
            where,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                discounts: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get discount by ID
 */
exports.getDiscount = async (req, res, next) => {
    try {
        const { id } = req.params;

        const discount = await Discount.findByPk(id);

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found'
            });
        }

        // Get usage stats
        const orderCount = await Order.count({
            where: { discountId: id }
        });

        const totalSaved = await Order.sum('discountAmount', {
            where: { discountId: id }
        });

        res.json({
            success: true,
            data: {
                ...discount.toJSON(),
                stats: {
                    orderCount,
                    totalSaved: totalSaved || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create discount
 */
exports.createDiscount = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { code } = req.body;

        // Check unique code
        if (code) {
            const existing = await Discount.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Discount code already exists'
                });
            }
        }

        const discountData = {
            ...req.body,
            code: code || this.generateCode(),
            createdBy: req.user.id
        };

        const discount = await Discount.create(discountData);

        await AuditLogService.logCreate(req, 'discounts', 'Discount', discount.id, {
            name: discount.name,
            code: discount.code,
            type: discount.type,
            value: discount.value
        });

        res.status(201).json({
            success: true,
            message: 'Discount created successfully',
            data: discount
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update discount
 */
exports.updateDiscount = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        const discount = await Discount.findByPk(id);

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found'
            });
        }

        const oldData = discount.toJSON();

        // Check unique code if changed
        if (req.body.code && req.body.code !== discount.code) {
            const existing = await Discount.findOne({ where: { code: req.body.code } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Discount code already exists'
                });
            }
        }

        const updateFields = [
            'name', 'code', 'description', 'type', 'value', 'minOrderAmount',
            'maxDiscountAmount', 'usageLimit', 'usageLimitPerUser', 'startDate',
            'endDate', 'isActive', 'applicableProducts', 'applicableCategories',
            'excludedProducts', 'excludedCategories', 'conditions', 'stackable'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                discount[field] = req.body[field];
            }
        });

        discount.updatedBy = req.user.id;
        await discount.save();

        await AuditLogService.logUpdate(req, 'discounts', 'Discount', id, oldData, discount.toJSON());

        res.json({
            success: true,
            message: 'Discount updated successfully',
            data: discount
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete discount
 */
exports.deleteDiscount = async (req, res, next) => {
    try {
        const { id } = req.params;

        const discount = await Discount.findByPk(id);

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found'
            });
        }

        await AuditLogService.logDelete(req, 'discounts', 'Discount', id, discount.toJSON());

        await discount.destroy();

        res.json({
            success: true,
            message: 'Discount deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate discount code
 */
exports.validateCode = async (req, res, next) => {
    try {
        const { code, cartTotal, items = [] } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Discount code is required'
            });
        }

        const discount = await Discount.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true
            }
        });

        if (!discount) {
            return res.status(404).json({
                success: false,
                valid: false,
                message: 'Invalid discount code'
            });
        }

        // Check dates
        const now = new Date();
        if (discount.startDate && new Date(discount.startDate) > now) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: 'Discount is not yet active'
            });
        }

        if (discount.endDate && new Date(discount.endDate) < now) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: 'Discount has expired'
            });
        }

        // Check usage limit
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: 'Discount usage limit reached'
            });
        }

        // Check min order value (Global check)
        if (discount.minOrderValue && parseFloat(cartTotal) < parseFloat(discount.minOrderValue)) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: `Minimum order value of ${discount.minOrderAmount} required`
            });
        }

        // --- Filter Applicable Items & Calculate Base ---
        let applicableTotal = parseFloat(cartTotal) || 0;
        let applicableItems = items;

        if (items.length > 0) {
            const hasAgencyFilter = discount.agencyIds && discount.agencyIds.length > 0;
            const hasBrandFilter = discount.manufacturers && discount.manufacturers.length > 0;
            const hasProductFilter = discount.applicableTo === 'products' && discount.applicableIds?.length > 0;
            const hasCategoryFilter = discount.applicableTo === 'categories' && discount.applicableIds?.length > 0;

            if (hasAgencyFilter || hasBrandFilter || hasProductFilter || hasCategoryFilter) {
                // Fetch product details for validation
                const productIds = items.map(i => i.productId || i.id);
                // Ensure unique IDs to avoid DB errors or redundant fetching
                const uniqueProductIds = [...new Set(productIds)];

                const products = await Product.findAll({
                    where: { id: { [Op.in]: uniqueProductIds } },
                    attributes: ['id', 'agencyId', 'manufacturer', 'categoryId']
                });

                const productMap = {};
                products.forEach(p => { productMap[p.id] = p; });

                applicableItems = items.filter(item => {
                    const pid = item.productId || item.id;
                    const product = productMap[pid];

                    // If product not found in DB, it might be invalid item, skip it
                    if (!product) return false;

                    // Check Agency
                    if (hasAgencyFilter && !discount.agencyIds.includes(product.agencyId)) return false;

                    // Check Manufacturer
                    if (hasBrandFilter && !discount.manufacturers.includes(product.manufacturer)) return false;

                    // Check Batches
                    if (discount.batchIds && discount.batchIds.length > 0) {
                        if (!item.batchId || !discount.batchIds.includes(item.batchId)) return false;
                    }

                    // Check Specific Products
                    if (hasProductFilter && !discount.applicableIds.includes(product.id)) return false;

                    // Check Categories
                    if (hasCategoryFilter && !discount.applicableIds.includes(product.categoryId)) return false;

                    return true;
                });

                // Recalculate applicable total from filtered items
                applicableTotal = applicableItems.reduce((sum, item) => {
                    const price = parseFloat(item.price || item.sellingPrice || 0);
                    const qty = parseInt(item.quantity || 1);
                    return sum + (price * qty);
                }, 0);
            }
        }

        // If specific rules exist but no items match, the discount amount is 0 (or invalid depending on logic)
        // Here we'll just let it calculate 0 discount if no items match.

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.type === 'percentage') {
            discountAmount = (applicableTotal * parseFloat(discount.value)) / 100;
            if (discount.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, parseFloat(discount.maxDiscountAmount));
            }
        } else {
            // Fixed Amount
            discountAmount = parseFloat(discount.value);
            // Cap at applicable total to avoid negative payment
            if (discountAmount > applicableTotal) {
                discountAmount = applicableTotal;
            }
        }

        res.json({
            success: true,
            valid: true,
            discountAmount,
            data: {
                ...discount.toJSON(),
                discountAmount
            }
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Generate unique discount code
 */
exports.generateCode = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
