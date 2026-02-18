const { Supplier, ProductBatch, Product, Sequelize } = require('../../models');
const { validationResult } = require('express-validator');

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
