const { Payment, Order, OrderItem, Doctor, User, Product, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService, NotificationService, PayHereService, InventoryService } = require('../../services');

/**
 * Get payments for order
 */
exports.getOrderPayments = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const payments = await Payment.findAll({
            where: { orderId },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add payment to order
 */
exports.addPayment = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { orderId } = req.params;
        const { amount, method, transactionId, notes } = req.body;

        const order = await Order.findByPk(orderId, {
            include: [{ model: Doctor, as: 'doctor' }],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (parseFloat(amount) > parseFloat(order.dueAmount)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Payment amount cannot exceed due amount (₹${order.dueAmount})`
            });
        }

        // Create payment
        const payment = await Payment.create({
            orderId,
            amount,
            method,
            transactionId,
            notes,
            status: 'completed',
            processedAt: new Date(),
            processedBy: req.user.id,
            createdBy: req.user.id
        }, { transaction });

        // Update order
        order.paidAmount = parseFloat(order.paidAmount) + parseFloat(amount);
        order.dueAmount = parseFloat(order.total) - parseFloat(order.paidAmount);

        if (order.dueAmount <= 0) {
            order.paymentStatus = 'paid';
        } else {
            order.paymentStatus = 'partial';
        }

        await order.save({ transaction });

        // If credit order from doctor, update doctor credit
        if (order.isCredit && order.doctor) {
            order.doctor.currentCredit = parseFloat(order.doctor.currentCredit) - parseFloat(amount);
            await order.doctor.save({ transaction });
        }

        await transaction.commit();

        await AuditLogService.logCreate(req, 'payments', 'Payment', payment.id, {
            orderId,
            amount,
            method
        });

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                payment,
                order: {
                    id: order.id,
                    paidAmount: order.paidAmount,
                    dueAmount: order.dueAmount,
                    paymentStatus: order.paymentStatus
                }
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get all payments (Admin)
 */
exports.getAllPayments = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            method,
            startDate,
            endDate,
            search,
            doctorId,
            userId,
            productId,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (method) where.method = method;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = end;
            }
        }

        // Build order include with optional doctor/user/product filters
        const orderWhere = {};
        if (doctorId) orderWhere.doctorId = doctorId;
        if (userId) orderWhere.userId = userId;

        if (productId) {
            orderWhere.id = {
                [Op.in]: sequelize.literal(`(SELECT order_id FROM order_items WHERE product_id = ${parseInt(productId)})`)
            };
        }

        if (search) {
            where[Op.or] = [
                { transactionId: { [Op.like]: `%${search}%` } },
                { notes: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Payment.findAndCountAll({
            where,
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: Object.keys(orderWhere).length > 0 ? orderWhere : undefined,
                    attributes: ['id', 'orderNumber', 'total', 'paidAmount', 'dueAmount', 'userId', 'doctorId', 'paymentStatus', 'status', 'createdAt'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'firstName', 'lastName', 'userName', 'phone']
                        },
                        {
                            model: Doctor,
                            as: 'doctor',
                            attributes: ['id', 'licenseNumber', 'hospitalClinic', 'specialization'],
                            include: [{
                                model: User,
                                as: 'user',
                                attributes: ['id', 'firstName', 'lastName', 'userName', 'phone']
                            }]
                        },
                        {
                            model: OrderItem,
                            as: 'items',
                            attributes: ['id', 'productId', 'productName', 'quantity', 'unitPrice', 'total'],
                        }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                },
                {
                    model: User,
                    as: 'refunder',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            distinct: true
        });

        res.json({
            success: true,
            data: {
                payments: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Process refund
 */
exports.processRefund = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        const originalPayment = await Payment.findByPk(id, {
            include: [{ model: Order, as: 'order' }],
            transaction
        });

        if (!originalPayment) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (originalPayment.status !== 'completed') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Only completed payments can be refunded'
            });
        }

        const refundAmount = amount || originalPayment.amount;

        if (parseFloat(refundAmount) > parseFloat(originalPayment.amount)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Refund amount cannot exceed original payment'
            });
        }

        // Create refund record
        const refund = await Payment.create({
            orderId: originalPayment.orderId,
            amount: -Math.abs(refundAmount),
            method: 'refund',
            status: 'completed',
            transactionId: `REF-${originalPayment.transactionId || originalPayment.id}`,
            notes: reason,
            refundedPaymentId: originalPayment.id,
            processedAt: new Date(),
            processedBy: req.user.id,
            createdBy: req.user.id
        }, { transaction });

        // Update original payment
        originalPayment.refundedAmount = parseFloat(originalPayment.refundedAmount || 0) + parseFloat(refundAmount);
        if (originalPayment.refundedAmount >= originalPayment.amount) {
            originalPayment.status = 'refunded';
        } else {
            originalPayment.status = 'partial_refund';
        }
        await originalPayment.save({ transaction });

        // Update order
        const order = originalPayment.order;
        order.paidAmount = parseFloat(order.paidAmount) - parseFloat(refundAmount);
        order.dueAmount = parseFloat(order.total) - parseFloat(order.paidAmount);
        await order.save({ transaction });

        await transaction.commit();

        await AuditLogService.logCreate(req, 'payments', 'Payment', refund.id, {
            type: 'refund',
            originalPaymentId: id,
            amount: refundAmount,
            reason
        });

        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: refund
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get payment stats
 */
exports.getPaymentStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter[Op.gte] = new Date(startDate);
            if (endDate) dateFilter[Op.lte] = new Date(endDate);
        }

        const where = { status: 'completed', amount: { [Op.gt]: 0 } };
        if (Object.keys(dateFilter).length > 0) {
            where.createdAt = dateFilter;
        }

        // Total by method
        const byMethod = await Payment.findAll({
            where,
            attributes: [
                'method',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['method']
        });

        // Total paid
        const totalPaid = await Payment.sum('amount', { where });

        // Total refunds
        const totalRefunds = await Payment.sum('amount', {
            where: {
                ...where,
                amount: { [Op.lt]: 0 }
            }
        });

        res.json({
            success: true,
            data: {
                totalPaid: totalPaid || 0,
                totalRefunds: Math.abs(totalRefunds || 0),
                netPayments: (totalPaid || 0) + (totalRefunds || 0),
                byMethod: byMethod.map(item => ({
                    method: item.method,
                    count: parseInt(item.get('count')),
                    total: parseFloat(item.get('total'))
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};
/**
 * Verify order payment status (used by frontend success/cancel pages)
 * GET /payments/verify/:orderNumber
 */
exports.verifyOrderPayment = async (req, res, next) => {
    try {
        const { orderNumber } = req.params;

        const order = await Order.findOne({
            where: {
                orderNumber,
                userId: req.user.id,
                isDeleted: false
            },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'slug', 'thumbnail']
                    }]
                },
                {
                    model: Payment,
                    as: 'payments',
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: {
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                total: order.total,
                paidAmount: order.paidAmount,
                dueAmount: order.dueAmount,
                itemCount: order.itemCount,
                items: order.items,
                payments: order.payments,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handle PayHere IPN Notification
 */
exports.handlePayHereNotify = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const data = req.body;

        console.log('--- [PayHere IPN] Received ---', JSON.stringify(data));

        // 1. Verify Hash
        if (!PayHereService.verifyIpnHash(data)) {
            await transaction.rollback();
            console.error('PayHere IPN Hash Verification Failed', data);
            return res.status(400).send('Invalid Hash');
        }

        const { order_id, payhere_amount, status_code, payment_id, method } = data;

        // 2. Find Order
        const order = await Order.findOne({
            where: { orderNumber: order_id },
            include: [{ model: OrderItem, as: 'items' }],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            console.error('Order not found for PayHere IPN', order_id);
            return res.status(404).send('Order not found');
        }

        console.log(`[PayHere IPN] Order ${order_id} - status_code: ${status_code}`);

        // 3. Process according to status code
        // 2 = Success, 0 = Pending, -1 = Canceled, -2 = Failed, -3 = Chargedback
        if (Number(status_code) === 2) {

            // Check if payment already recorded
            const existingPayment = await Payment.findOne({
                where: { transactionId: payment_id },
                transaction
            });

            if (!existingPayment) {
                // Record payment
                await Payment.create({
                    orderId: order.id,
                    amount: payhere_amount,
                    method: method || 'payhere',
                    transactionId: payment_id,
                    status: 'completed',
                    processedAt: new Date(),
                    notes: 'Paid via PayHere'
                }, { transaction });

                // Update order
                order.paidAmount = parseFloat(order.paidAmount || 0) + parseFloat(payhere_amount);
                order.dueAmount = parseFloat(order.total) - parseFloat(order.paidAmount);

                if (order.dueAmount <= 0) {
                    order.paymentStatus = 'paid';
                    order.status = 'confirmed'; // Auto-confirm if fully paid
                } else {
                    order.paymentStatus = 'partial';
                }

                await order.save({ transaction });
            }
        } else if (Number(status_code) === 0) {
            // Pending
            order.paymentStatus = 'pending';
            await order.save({ transaction });
        } else if ([-1, -2, -3].includes(Number(status_code))) {
            // Canceled / Failed / Chargedback
            order.paymentStatus = 'failed';

            // Only cancel the order if it was still pending
            if (order.status === 'pending') {
                order.status = 'cancelled';
                order.cancelledAt = new Date();
                order.cancelReason = status_code === '-1' ? 'Payment cancelled by customer' :
                    status_code === '-2' ? 'Payment failed' : 'Payment charged back';

                // Release reserved stock
                for (const item of order.items) {
                    try {
                        await InventoryService.releaseReservedStock(
                            item.productId,
                            item.quantity,
                            order.orderNumber,
                            req,
                            transaction
                        );
                    } catch (stockErr) {
                        console.error(`Failed to release stock for product ${item.productId}:`, stockErr.message);
                    }
                }

                // Update items status
                await OrderItem.update(
                    { status: 'cancelled' },
                    { where: { orderId: order.id }, transaction }
                );
            }

            await order.save({ transaction });
        }

        await transaction.commit();
        res.status(200).send('OK');
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('PayHere IPN Error:', error);
        res.status(500).send('Error');
    }
};
