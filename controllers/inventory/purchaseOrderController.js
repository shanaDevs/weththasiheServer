const { PurchaseOrder, PurchaseOrderItem, Supplier, Product, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { AuditLogService } = require('../../services');
const { Op } = require('sequelize');

/**
 * Generate unique PO number
 */
const generatePONumber = async () => {
    const prefix = 'PO';
    const date = new Date();
    const dateStr = date.getFullYear().toString().slice(-2) +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');

    const count = await PurchaseOrder.count();
    return `${prefix}${dateStr}${(count + 1).toString().padStart(4, '0')}`;
};

/**
 * Get all purchase orders
 */
exports.getPurchaseOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, supplierId } = req.query;

        const where = { isDeleted: false };
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        const { count, rows } = await PurchaseOrder.findAndCountAll({
            where,
            include: [
                { model: Supplier, as: 'supplier', attributes: ['name', 'code'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                purchaseOrders: rows,
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
 * Get purchase order by ID
 */
exports.getPurchaseOrder = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findByPk(req.params.id, {
            include: [
                { model: Supplier, as: 'supplier' },
                {
                    model: PurchaseOrderItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product', attributes: ['name', 'sku'] }]
                }
            ]
        });

        if (!po || po.isDeleted) {
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        res.json({ success: true, data: po });
    } catch (error) {
        next(error);
    }
};

/**
 * Create purchase order
 */
exports.createPurchaseOrder = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { supplierId, items, expectedDate, notes } = req.body;

        const poNumber = await generatePONumber();

        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            const itemTotal = item.quantity * item.unitPrice;
            const taxAmount = itemTotal * (item.taxPercentage / 100 || 0);
            totalAmount += itemTotal + taxAmount;
        }

        const po = await PurchaseOrder.create({
            poNumber,
            supplierId,
            expectedDate,
            notes,
            totalAmount,
            status: 'draft',
            createdBy: req.user.id
        }, { transaction: t });

        for (const item of items) {
            const itemTotal = item.quantity * item.unitPrice;
            const taxAmount = itemTotal * (item.taxPercentage / 100 || 0);

            await PurchaseOrderItem.create({
                purchaseOrderId: po.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxPercentage: item.taxPercentage || 0,
                taxAmount,
                total: itemTotal + taxAmount
            }, { transaction: t });
        }

        await t.commit();

        await AuditLogService.logCreate(req, 'inventory', 'PurchaseOrder', po.id, { poNumber, totalAmount });

        res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            data: po
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

/**
 * Update purchase order status
 */
exports.updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const po = await PurchaseOrder.findByPk(id);
        if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

        const previousStatus = po.status;
        po.status = status;
        if (notes) po.notes = (po.notes ? po.notes + '\n' : '') + notes;
        po.updatedBy = req.user.id;

        await po.save();

        await AuditLogService.logStatusChange(req, 'inventory', 'PurchaseOrder', po.id, previousStatus, status, notes);

        res.json({
            success: true,
            message: `Purchase order status updated to ${status}`
        });
    } catch (error) {
        next(error);
    }
};
