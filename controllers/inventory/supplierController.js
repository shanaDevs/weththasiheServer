const { Supplier, ProductBatch, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { AuditLogService } = require('../../services');
const { Op } = require('sequelize');

/**
 * Get all suppliers
 */
exports.getSuppliers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;

        const where = { isDeleted: false };
        if (status) where.status = status;
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } },
                { contactPerson: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Supplier.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                suppliers: rows,
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
 * Get supplier by ID
 */
exports.getSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id, {
            where: { isDeleted: false }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create supplier
 */
exports.createSupplier = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const supplier = await Supplier.create(req.body);

        await AuditLogService.logCreate(req, 'inventory', 'Supplier', supplier.id, supplier.toJSON());

        res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            data: supplier
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update supplier
 */
exports.updateSupplier = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        const previousData = supplier.toJSON();
        await supplier.update(req.body);

        await AuditLogService.logUpdate(req, 'inventory', 'Supplier', supplier.id, previousData, supplier.toJSON());

        res.json({
            success: true,
            message: 'Supplier updated successfully',
            data: supplier
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete supplier (Soft delete)
 */
exports.deleteSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        supplier.isDeleted = true;
        await supplier.save();

        await AuditLogService.logDelete(req, 'inventory', 'Supplier', supplier.id, supplier.toJSON());

        res.json({
            success: true,
            message: 'Supplier deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
