const { Supplier, ProductBatch, Product, InventoryMovement, User, Sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Inventory Management Controller (Suppliers & Batches)
 */
exports.createSupplier = async (req, res, next) => {
    try {
        const { name, code, contactPerson, email, phone, address } = req.body;

        const supplier = await Supplier.create({
            name, code, contactPerson, email, phone, address
        });

        res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            data: supplier
        });
    } catch (error) {
        next(error);
    }
};

exports.getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await Supplier.findAll({
            where: { isDeleted: false }
        });
        res.json({ success: true, data: suppliers });
    } catch (error) {
        next(error);
    }
};

exports.addProductBatch = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const {
            batchNumber,
            supplierId,
            mfgDate,
            expiryDate,
            costPrice,
            sellingPrice,
            mrp,
            stockQuantity
        } = req.body;

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const batch = await ProductBatch.create({
            productId,
            batchNumber,
            supplierId,
            mfgDate,
            expiryDate,
            costPrice,
            sellingPrice,
            mrp,
            stockQuantity
        });

        res.status(201).json({
            success: true,
            message: 'Product batch added successfully',
            data: batch
        });
    } catch (error) {
        next(error);
    }
};

exports.getProductBatches = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const batches = await ProductBatch.findAll({
            where: { productId },
            include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }],
            order: [['expiryDate', 'ASC']]
        });

        res.json({ success: true, data: batches });
    } catch (error) {
        next(error);
    }
};

exports.updateProductBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const batch = await ProductBatch.findByPk(id);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        await batch.update(req.body);
        res.json({ success: true, message: 'Batch updated', data: batch });
    } catch (error) {
        next(error);
    }
};

exports.deleteProductBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const batch = await ProductBatch.findByPk(id);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        await batch.destroy();
        res.json({ success: true, message: 'Batch deleted' });
    } catch (error) {
        next(error);
    }
};
/**
 * Get inventory movements (ledger)
 */
exports.getInventoryMovements = async (req, res, next) => {
    try {
        const { productId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

        const where = {};
        if (productId) where.productId = productId;
        if (type) where.type = type;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await InventoryMovement.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['name', 'sku'] },
                { model: User, as: 'creator', attributes: ['userName'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                movements: rows,
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
 * Get inventory stats/overview
 */
exports.getInventoryStats = async (req, res, next) => {
    try {
        const totalProducts = await Product.count({ where: { trackInventory: true, isDeleted: false } });
        const lowStockProducts = await Product.count({
            where: {
                trackInventory: true,
                isDeleted: false,
                stockQuantity: { [Op.lte]: Sequelize.col('low_stock_threshold') },
                stockQuantity: { [Op.gt]: 0 }
            }
        });
        const outOfStockProducts = await Product.count({
            where: {
                trackInventory: true,
                isDeleted: false,
                stockQuantity: { [Op.lte]: 0 }
            }
        });

        res.json({
            success: true,
            data: {
                totalProducts,
                lowStockProducts,
                outOfStockProducts
            }
        });
    } catch (error) {
        next(error);
    }
};
