const { PurchaseOrder, PurchaseOrderItem, Supplier, Product, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { AuditLogService, EmailService, PdfService, InventoryService } = require('../../services');
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

/**
 * Send Purchase Order to supplier via email (with PDF attachment)
 * POST /purchase-orders/:id/send
 */
exports.sendPurchaseOrder = async (req, res, next) => {
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

        if (po.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Cannot send a cancelled purchase order' });
        }

        // Check supplier has email
        if (!po.supplier || !po.supplier.email) {
            return res.status(400).json({
                success: false,
                message: 'Supplier does not have an email address. Please update the supplier record first.'
            });
        }

        // Mark PO as sent (if it was draft)
        const previousStatus = po.status;
        if (po.status === 'draft') {
            po.status = 'sent';
            po.updatedBy = req.user.id;
            await po.save();
        }

        // Send email with PDF attachment
        const emailResult = await EmailService.sendPurchaseOrderEmail(po);

        // Log the status change
        if (previousStatus !== po.status) {
            await AuditLogService.logStatusChange(
                req, 'inventory', 'PurchaseOrder', po.id,
                previousStatus, po.status,
                `PO emailed to supplier: ${po.supplier.email}`
            );
        }

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: `PO status updated to 'sent' but email delivery failed: ${emailResult.reason || emailResult.error}`,
                data: { poNumber: po.poNumber, status: po.status }
            });
        }

        return res.json({
            success: true,
            message: `Purchase Order ${po.poNumber} sent to ${po.supplier.email} successfully`,
            data: {
                poNumber: po.poNumber,
                status: po.status,
                sentTo: po.supplier.email,
                emailMessageId: emailResult.messageId
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Download PO as PDF
 * GET /purchase-orders/:id/pdf
 */
exports.downloadPdf = async (req, res, next) => {
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

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="PO_${po.poNumber}.pdf"`);

        await PdfService.generatePurchaseOrderPdf(po, res);
    } catch (error) {
        next(error);
    }
};
/**
 * Receive items for a purchase order
 * POST /purchase-orders/:id/receive
 */
exports.receiveItems = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { items } = req.body; // Array of { productId, quantity, batchNumber, expiryDate }
        const { id } = req.params;

        const po = await PurchaseOrder.findByPk(id, {
            include: [{ model: PurchaseOrderItem, as: 'items' }],
            transaction: t
        });

        if (!po) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        if (po.status === 'cancelled' || po.status === 'received') {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Cannot receive items for a ${po.status} order` });
        }

        let allReceived = true;
        let someReceived = false;

        for (const receiveItem of items) {
            const poItem = po.items.find(i => i.productId === receiveItem.productId);
            if (!poItem) continue;

            const receiveQty = parseInt(receiveItem.quantity);
            if (isNaN(receiveQty) || receiveQty <= 0) continue;

            // Update PO Item received quantity
            poItem.receivedQuantity = (poItem.receivedQuantity || 0) + receiveQty;
            await poItem.save({ transaction: t });

            // Increase inventory
            await InventoryService.increaseStock(
                poItem.productId,
                receiveQty,
                'purchase',
                'purchase_order',
                po.id,
                po.poNumber,
                {
                    batchNumber: receiveItem.batchNumber,
                    expiryDate: receiveItem.expiryDate,
                    costPrice: poItem.unitPrice,
                    reason: `Received from PO ${po.poNumber}`,
                    req
                },
                t
            );

            someReceived = true;
        }

        // Check if PO is full or partially received
        for (const item of po.items) {
            if (item.receivedQuantity < item.quantity) {
                allReceived = false;
            } else {
                someReceived = true;
            }
        }

        const previousStatus = po.status;
        if (allReceived) {
            po.status = 'received';
        } else if (someReceived) {
            po.status = 'partially_received';
        }

        await po.save({ transaction: t });

        await AuditLogService.logUpdate(
            req,
            'inventory',
            'PurchaseOrder',
            po.id,
            { status: previousStatus },
            { status: po.status },
            `Received items for PO ${po.poNumber}`
        );

        await t.commit();

        // ─── Post-Commit Actions ──────────────────────────────────────────────
        // Send email notification for stock arrival (non-blocking)
        EmailService.sendStockReceiptNotification(po, items).catch(err =>
            console.error('Failed to send stock receipt email:', err.message)
        );

        res.json({
            success: true,
            message: 'Items received and inventory updated successfully',
            data: {
                status: po.status,
                items: po.items
            }
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};
