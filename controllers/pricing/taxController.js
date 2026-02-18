const { Tax, Product, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService } = require('../../services');

/**
 * Get all taxes
 */
exports.getTaxes = async (req, res, next) => {
    try {
        const { isActive } = req.query;

        const where = {};
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const taxes = await Tax.findAll({
            where,
            order: [['name', 'ASC']]
        });

        res.json({
            success: true,
            data: taxes
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get tax by ID
 */
exports.getTax = async (req, res, next) => {
    try {
        const { id } = req.params;

        const tax = await Tax.findByPk(id);

        if (!tax) {
            return res.status(404).json({
                success: false,
                message: 'Tax not found'
            });
        }

        // Get products using this tax
        const productCount = await Product.count({
            where: { taxId: id }
        });

        res.json({
            success: true,
            data: {
                ...tax.toJSON(),
                productCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create tax
 */
exports.createTax = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, code, percentage, type, isInclusive, isDefault, description } = req.body;

        // Check unique code
        const existing = await Tax.findOne({ where: { code } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Tax code already exists'
            });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await Tax.update({ isDefault: false }, { where: {} });
        }

        const tax = await Tax.create({
            name,
            code,
            percentage,
            type: type || 'percentage',
            isInclusive: isInclusive || false,
            isDefault: isDefault || false,
            description,
            createdBy: req.user.id
        });

        await AuditLogService.logCreate(req, 'taxes', 'Tax', tax.id, { name, code, percentage });

        res.status(201).json({
            success: true,
            message: 'Tax created successfully',
            data: tax
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update tax
 */
exports.updateTax = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        const tax = await Tax.findByPk(id);

        if (!tax) {
            return res.status(404).json({
                success: false,
                message: 'Tax not found'
            });
        }

        const oldData = tax.toJSON();

        const { name, code, percentage, type, isInclusive, isDefault, isActive, description } = req.body;

        // Check unique code if changed
        if (code && code !== tax.code) {
            const existing = await Tax.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Tax code already exists'
                });
            }
        }

        // If setting as default, unset other defaults
        if (isDefault && !tax.isDefault) {
            await Tax.update({ isDefault: false }, { where: {} });
        }

        if (name !== undefined) tax.name = name;
        if (code !== undefined) tax.code = code;
        if (percentage !== undefined) tax.percentage = percentage;
        if (type !== undefined) tax.type = type;
        if (isInclusive !== undefined) tax.isInclusive = isInclusive;
        if (isDefault !== undefined) tax.isDefault = isDefault;
        if (isActive !== undefined) tax.isActive = isActive;
        if (description !== undefined) tax.description = description;
        tax.updatedBy = req.user.id;

        await tax.save();

        await AuditLogService.logUpdate(req, 'taxes', 'Tax', id, oldData, tax.toJSON());

        res.json({
            success: true,
            message: 'Tax updated successfully',
            data: tax
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete tax
 */
exports.deleteTax = async (req, res, next) => {
    try {
        const { id } = req.params;

        const tax = await Tax.findByPk(id);

        if (!tax) {
            return res.status(404).json({
                success: false,
                message: 'Tax not found'
            });
        }

        // Check if tax is in use
        const productCount = await Product.count({ where: { taxId: id } });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete tax. ${productCount} products are using this tax.`
            });
        }

        await AuditLogService.logDelete(req, 'taxes', 'Tax', id, tax.toJSON());

        await tax.destroy();

        res.json({
            success: true,
            message: 'Tax deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
