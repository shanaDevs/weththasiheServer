const { Discount, Order, sequelize } = require('../../models');
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
            'name', 'code', 'description', 'type', 'value', 'minOrderValue',
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
        const { code, cartTotal, itemCount } = req.body;

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

        // Check min order value
        if (discount.minOrderValue && cartTotal < parseFloat(discount.minOrderValue)) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: `Minimum order value of ₹${discount.minOrderValue} required`
            });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.type === 'percentage') {
            discountAmount = (cartTotal * parseFloat(discount.value)) / 100;
            if (discount.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, parseFloat(discount.maxDiscountAmount));
            }
        } else {
            discountAmount = parseFloat(discount.value);
        }

        res.json({
            success: true,
            valid: true,
            data: {
                id: discount.id,
                name: discount.name,
                code: discount.code,
                type: discount.type,
                value: discount.value,
                discountAmount: Math.round(discountAmount * 100) / 100,
                description: discount.description
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate unique discount code
 */
exports.generateCode = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
