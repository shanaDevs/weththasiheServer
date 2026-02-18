const { Promotion, Product, Category, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService } = require('../../services');

/**
 * Get all promotions
 */
exports.getPromotions = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            status,
            isActive,
            search,
            sortBy = 'displayOrder',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};
        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        if (status) {
            const now = new Date();
            switch (status) {
                case 'upcoming':
                    where.startDate = { [Op.gt]: now };
                    break;
                case 'active':
                    where.startDate = { [Op.lte]: now };
                    where.endDate = { [Op.gte]: now };
                    break;
                case 'expired':
                    where.endDate = { [Op.lt]: now };
                    break;
            }
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Promotion.findAndCountAll({
            where,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                promotions: rows,
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
 * Get active promotions (for shop)
 */
exports.getActivePromotions = async (req, res, next) => {
    try {
        const now = new Date();

        const promotions = await Promotion.findAll({
            where: {
                isActive: true,
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            },
            order: [['displayOrder', 'DESC']],
            attributes: ['id', 'name', 'description', 'type', 'bannerImage', 'discountValue', 'discountType', 'startDate', 'endDate']
        });

        res.json({
            success: true,
            data: promotions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get promotion by ID
 */
exports.getPromotion = async (req, res, next) => {
    try {
        const { id } = req.params;

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }

        // Get applicable products if any
        let products = [];
        if (promotion.applicableProducts && promotion.applicableProducts.length > 0) {
            products = await Product.findAll({
                where: { id: { [Op.in]: promotion.applicableProducts } },
                attributes: ['id', 'name', 'sku', 'thumbnail', 'sellingPrice']
            });
        }

        // Get applicable categories if any
        let categories = [];
        if (promotion.applicableCategories && promotion.applicableCategories.length > 0) {
            categories = await Category.findAll({
                where: { id: { [Op.in]: promotion.applicableCategories } },
                attributes: ['id', 'name', 'slug']
            });
        }

        res.json({
            success: true,
            data: {
                ...promotion.toJSON(),
                products,
                categories
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create promotion
 */
exports.createPromotion = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const promotionData = {
            ...req.body,
            createdBy: req.user.id
        };

        const promotion = await Promotion.create(promotionData);

        await AuditLogService.logCreate(req, 'promotions', 'Promotion', promotion.id, {
            name: promotion.name,
            type: promotion.type,
            discountValue: promotion.discountValue
        });

        // Notify doctors about the new promotion
        try {
            const doctors = await User.findAll({
                include: [{
                    model: Doctor,
                    as: 'doctorProfile',
                    where: { status: 'active' }
                }],
                where: { isDisabled: false, isDeleted: false }
            });

            for (const doctorUser of doctors) {
                await NotificationService.send({
                    user: doctorUser,
                    emailTemplate: 'new_promotion',
                    smsTemplate: 'new_promotion_sms',
                    placeholders: {
                        doctor_name: `Dr. ${doctorUser.firstName} ${doctorUser.lastName}`,
                        promotion_name: promotion.name,
                        promotion_description: promotion.description || '',
                        promotion_type: promotion.type,
                        discount_value: promotion.discountValue,
                        expiry_date: promotion.endDate ? new Date(promotion.endDate).toLocaleDateString() : 'N/A'
                    }
                });
            }
        } catch (notifyError) {
            console.error('Failed to send promotion notifications:', notifyError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Promotion created successfully and notifications sent.',
            data: promotion
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update promotion
 */
exports.updatePromotion = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }

        const oldData = promotion.toJSON();

        const updateFields = [
            'name', 'description', 'type', 'startDate', 'endDate', 'isActive',
            'displayOrder', 'discountType', 'discountValue', 'buyQuantity', 'getQuantity',
            'bundleProducts', 'bundlePrice', 'applicableProducts', 'applicableCategories',
            'excludedProducts', 'minQuantity', 'maxQuantity', 'usageLimit', 'customerLimit',
            'conditions', 'bannerImage', 'displayOnHome', 'stackable'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                promotion[field] = req.body[field];
            }
        });

        promotion.updatedBy = req.user.id;
        await promotion.save();

        await AuditLogService.logUpdate(req, 'promotions', 'Promotion', id, oldData, promotion.toJSON());

        res.json({
            success: true,
            message: 'Promotion updated successfully',
            data: promotion
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete promotion
 */
exports.deletePromotion = async (req, res, next) => {
    try {
        const { id } = req.params;

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }

        await AuditLogService.logDelete(req, 'promotions', 'Promotion', id, promotion.toJSON());

        await promotion.destroy();

        res.json({
            success: true,
            message: 'Promotion deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get promotion products
 */
exports.getPromotionProducts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }

        let where = {
            isActive: true,
            isDeleted: false
        };

        // Filter by applicable products/categories
        if (promotion.applicableProducts && promotion.applicableProducts.length > 0) {
            where.id = { [Op.in]: promotion.applicableProducts };
        } else if (promotion.applicableCategories && promotion.applicableCategories.length > 0) {
            where.categoryId = { [Op.in]: promotion.applicableCategories };
        }

        // Exclude products
        if (promotion.excludedProducts && promotion.excludedProducts.length > 0) {
            where.id = where.id
                ? { [Op.and]: [where.id, { [Op.notIn]: promotion.excludedProducts }] }
                : { [Op.notIn]: promotion.excludedProducts };
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            attributes: ['id', 'name', 'slug', 'sku', 'thumbnail', 'sellingPrice', 'mrp', 'stockQuantity'],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                products: rows,
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
