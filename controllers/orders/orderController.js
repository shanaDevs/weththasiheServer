const {
    Order, OrderItem, OrderStatusHistory, Cart, CartItem,
    Product, User, Doctor, Address, Discount, Promotion,
    Payment, sequelize
} = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
    AuditLogService, InventoryService, PricingService, NotificationService, PayHereService
} = require('../../services');

/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
    const prefix = 'ORD';
    const date = new Date();
    const dateStr = date.getFullYear().toString().slice(-2) +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');

    // Get today's order count
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await Order.count({
        where: {
            createdAt: { [Op.between]: [startOfDay, endOfDay] }
        }
    });

    return `${prefix}${dateStr}${(count + 1).toString().padStart(4, '0')}`;
};

/**
 * Get user's orders
 */
exports.getMyOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const where = {
            userId: req.user.id,
            isDeleted: false
        };

        if (status) where.status = status;

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'slug', 'thumbnail']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                orders: rows,
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
 * Get single order
 */
exports.getOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.roleLevel >= 60;

        const where = { isDeleted: false };

        // Check by ID or order number
        if (isNaN(id)) {
            where.orderNumber = id;
        } else {
            where.id = id;
        }

        // Non-admin users can only see their own orders
        if (!isAdmin) {
            where.userId = req.user.id;
        }

        const order = await Order.findOne({
            where,
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
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'phone', 'userName']
                },
                {
                    model: Doctor,
                    as: 'doctor',
                    attributes: ['id', 'licenseNumber', 'specialization', 'hospitalClinic']
                },
                {
                    model: OrderStatusHistory,
                    as: 'statusHistory',
                    order: [['createdAt', 'DESC']],
                    limit: 10
                },
                {
                    model: Payment,
                    as: 'payments'
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
            data: order
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payment data for existing order (for retry)
 */
exports.getPaymentData = async (req, res, next) => {
    try {
        const { id } = req.params;
        const where = {
            userId: req.user.id,
            isDeleted: false,
            paymentStatus: { [Op.not]: 'paid' }
        };

        if (isNaN(id)) {
            where.orderNumber = id;
        } else {
            where.id = id;
        }

        const order = await Order.findOne({ where });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or already paid'
            });
        }

        const user = await User.findByPk(req.user.id);
        const payhereData = PayHereService.prepareCheckoutData(order, user);

        res.json({
            success: true,
            data: payhereData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create order from cart
 */
exports.createOrder = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            paymentMethod,
            customerNotes,
            note,
            shippingAddressId,
            billingAddressId,
            useCredit
        } = req.body;

        // Use customerNotes if provided, otherwise use note
        const orderNotes = customerNotes || note;

        // Get cart
        const cart = await Cart.findOne({
            where: { userId: req.user.id, status: 'active' },
            include: [
                { model: CartItem, as: 'items' },
                { model: Address, as: 'shippingAddress' },
                { model: Address, as: 'billingAddress' }
            ],
            transaction
        });

        if (!cart || cart.items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Get addresses
        const shippingAddrId = shippingAddressId || cart.shippingAddressId;
        const billingAddrId = billingAddressId || cart.billingAddressId;

        if (!shippingAddrId) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Shipping address is required'
            });
        }

        const shippingAddress = await Address.findByPk(shippingAddrId, { transaction });
        if (!shippingAddress) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Shipping address not found'
            });
        }

        const billingAddress = billingAddrId
            ? await Address.findByPk(billingAddrId, { transaction })
            : shippingAddress;

        if (!billingAddress) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Billing address not found'
            });
        }

        // Validate stock for all items
        for (const item of cart.items) {
            const stockCheck = await InventoryService.checkStock(item.productId, item.quantity);
            if (!stockCheck.available) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `${item.productName}: ${stockCheck.message}`
                });
            }
        }

        // Get doctor profile if exists
        const doctor = await Doctor.findOne({
            where: { userId: req.user.id },
            transaction
        });

        // Check credit eligibility for doctors
        let isCredit = false;
        let creditDueDate = null;

        if (useCredit && doctor && doctor.isVerified) {
            const availableCredit = parseFloat(doctor.creditLimit) - parseFloat(doctor.currentCredit);
            if (cart.total <= availableCredit) {
                isCredit = true;
                creditDueDate = new Date();
                creditDueDate.setDate(creditDueDate.getDate() + (doctor.paymentTerms || 30));
            }
        }

        // Generate order number
        const orderNumber = await generateOrderNumber();

        // Create order
        const order = await Order.create({
            orderNumber,
            userId: req.user.id,
            doctorId: doctor?.id,
            subtotal: cart.subtotal,
            taxAmount: cart.taxAmount,
            shippingAmount: cart.shippingAmount,
            discountAmount: cart.discountAmount,
            total: cart.total,
            discountId: cart.discountId,
            couponCode: cart.couponCode,
            itemCount: cart.items.length,
            totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
            status: 'pending',
            paymentStatus: isCredit ? 'credit' : 'pending',
            paymentMethod,
            isCredit,
            creditDueDate,
            dueAmount: cart.total,
            shippingAddress: shippingAddress.toJSON(),
            billingAddress: billingAddress.toJSON(),
            customerNotes: orderNotes,
            source: 'web',
            ipAddress: AuditLogService.getIpAddress(req),
            userAgent: req.headers['user-agent'],
            createdBy: req.user.id
        }, { transaction });

        // Create order items
        for (const cartItem of cart.items) {
            const product = await Product.findByPk(cartItem.productId, { transaction });
            if (!product) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Product ${cartItem.productName} not found`
                });
            }

            await OrderItem.create({
                orderId: order.id,
                productId: cartItem.productId,
                productName: cartItem.productName,
                productSku: cartItem.productSku,
                productImage: cartItem.productImage,
                genericName: product.genericName,
                manufacturer: product.manufacturer,
                batchNumber: product.batchNumber,
                expiryDate: product.expiryDate,
                quantity: cartItem.quantity,
                unitPrice: cartItem.unitPrice,
                originalPrice: cartItem.originalPrice,
                costPrice: product.costPrice,
                taxEnabled: cartItem.taxEnabled,
                taxPercentage: cartItem.taxPercentage,
                taxAmount: cartItem.taxAmount,
                discountPercentage: cartItem.discountPercentage,
                discountAmount: cartItem.discountAmount,
                subtotal: cartItem.subtotal,
                total: cartItem.total,
                promotionId: cartItem.promotionId,
                appliedBulkPriceId: cartItem.appliedBulkPriceId,
                status: 'pending'
            }, { transaction });

            // Reserve stock
            await InventoryService.reserveStock(
                cartItem.productId,
                cartItem.quantity,
                orderNumber,
                req,
                transaction
            );
        }

        // Update doctor credit if using credit
        if (isCredit && doctor) {
            doctor.currentCredit = parseFloat(doctor.currentCredit) + parseFloat(cart.total);
            await doctor.save({ transaction });
        }

        // Update discount usage count
        if (cart.discountId) {
            await Discount.increment('usedCount', {
                where: { id: cart.discountId },
                transaction
            });
        }

        // Create status history
        await OrderStatusHistory.create({
            orderId: order.id,
            newStatus: 'pending',
            notes: 'Order placed',
            changedBy: req.user.id,
            changedByName: req.user.userName,
            ipAddress: AuditLogService.getIpAddress(req)
        }, { transaction });

        // Mark cart as converted
        cart.status = 'converted';
        await cart.save({ transaction });

        await transaction.commit();

        // The following operations are performed after successful commit.
        // If they fail, we still want the order to be considered "placed" successfully.
        try {
            // Send order confirmation notification
            const user = await User.findByPk(req.user.id, {
                include: [{ model: Doctor, as: 'doctorProfile' }]
            });
            if (user) {
                await NotificationService.sendOrderConfirmation(order, user);
                // Alert admins
                await NotificationService.sendNewOrderAlertToAdmins(order, user);
            }

            // Audit log
            await AuditLogService.logCreate(req, 'orders', 'Order', order.id, {
                orderNumber,
                total: order.total,
                itemCount: order.itemCount
            });
        } catch (postCommitError) {
            console.error('Post-commit error (notifications/logs):', postCommitError);
        }

        // Fetch complete order
        const createdOrder = await Order.findByPk(order.id, {
            include: [
                { model: OrderItem, as: 'items' },
                { model: Payment, as: 'payments' }
            ]
        });

        // Prepare PayHere data if selected
        let payhereData = null;
        if (paymentMethod === 'payhere') {
            const user = await User.findByPk(req.user.id);
            payhereData = PayHereService.prepareCheckoutData(order, user);
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                ...createdOrder.toJSON(),
                payhereData
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(error);
    }
};

/**
 * Get all orders (Admin)
 */
exports.getAllOrders = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            paymentStatus,
            startDate,
            endDate,
            rangeType, // 'daily', 'weekly', 'monthly', 'yearly', 'custom'
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = { isDeleted: false };

        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;

        // Handle date range based on rangeType or custom dates
        if (rangeType || startDate || endDate) {
            const now = new Date();
            where.createdAt = {};

            if (rangeType) {
                switch (rangeType) {
                    case 'daily':
                        where.createdAt[Op.gte] = new Date(now.setHours(0, 0, 0, 0));
                        where.createdAt[Op.lte] = new Date(now.setHours(23, 59, 59, 999));
                        break;
                    case 'weekly':
                        const weekStart = new Date(now);
                        weekStart.setDate(now.getDate() - now.getDay());
                        weekStart.setHours(0, 0, 0, 0);
                        where.createdAt[Op.gte] = weekStart;
                        where.createdAt[Op.lte] = new Date();
                        break;
                    case 'monthly':
                        where.createdAt[Op.gte] = new Date(now.getFullYear(), now.getMonth(), 1);
                        where.createdAt[Op.lte] = new Date();
                        break;
                    case 'yearly':
                        where.createdAt[Op.gte] = new Date(now.getFullYear(), 0, 1);
                        where.createdAt[Op.lte] = new Date();
                        break;
                    case 'custom':
                        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                        if (endDate) {
                            const endDateTime = new Date(endDate);
                            endDateTime.setHours(23, 59, 59, 999);
                            where.createdAt[Op.lte] = endDateTime;
                        }
                        break;
                }
            } else {
                // Fallback to direct date range
                if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    where.createdAt[Op.lte] = endDateTime;
                }
            }
        }

        if (search) {
            where[Op.or] = [
                { orderNumber: { [Op.like]: `%${search}%` } },
                { '$user.firstName$': { [Op.like]: `%${search}%` } },
                { '$user.lastName$': { [Op.like]: `%${search}%` } },
                { '$user.phone$': { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'phone']
                },
                {
                    model: Doctor,
                    as: 'doctor',
                    attributes: ['id', 'licenseNumber', 'hospitalClinic']
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                orders: rows,
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
 * Update order status
 */
exports.updateOrderStatus = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { status, notes, trackingNumber, trackingUrl, expectedDeliveryDate } = req.body;

        const order = await Order.findByPk(id, {
            include: [
                { model: OrderItem, as: 'items' },
                { model: User, as: 'user', include: [{ model: Doctor, as: 'doctorProfile' }] }
            ],
            transaction
        });

        if (!order || order.isDeleted) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const previousStatus = order.status;

        // Validate status transition
        const validTransitions = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['processing', 'packed', 'shipped', 'cancelled'],
            processing: ['packed', 'shipped', 'cancelled'],
            packed: ['shipped', 'cancelled'],
            shipped: ['out_for_delivery', 'delivered', 'refunded', 'cancelled'],
            out_for_delivery: ['delivered', 'cancelled'],
            delivered: ['returned', 'refunded'],
            returned: ['refunded']
        };

        if (!validTransitions[previousStatus]?.includes(status)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Cannot transition from ${previousStatus} to ${status}`
            });
        }

        // Update order
        order.status = status;

        // Status-specific updates
        if (status === 'confirmed') {
            order.confirmedAt = new Date();
        } else if (status === 'processing') {
            order.processedAt = new Date();
        } else if (status === 'shipped') {
            order.shippedAt = new Date();
            if (trackingNumber) order.trackingNumber = trackingNumber;
            if (trackingUrl) order.trackingUrl = trackingUrl;
            if (expectedDeliveryDate) order.expectedDeliveryDate = expectedDeliveryDate;

            // Reduce actual stock
            for (const item of order.items) {
                await InventoryService.reduceStock(
                    item.productId,
                    item.quantity,
                    'order',
                    order.id,
                    order.orderNumber,
                    req,
                    transaction
                );
            }
        } else if (status === 'delivered') {
            order.deliveredAt = new Date();

            // Update order items status
            await OrderItem.update(
                { status: 'fulfilled', fulfilledQuantity: sequelize.col('quantity') },
                { where: { orderId: order.id }, transaction }
            );
        } else if (status === 'cancelled') {
            order.cancelledAt = new Date();
            order.cancelledBy = req.user.id;
            order.cancelReason = notes;

            // Release reserved stock
            for (const item of order.items) {
                await InventoryService.releaseReservedStock(
                    item.productId,
                    item.quantity,
                    order.orderNumber,
                    req,
                    transaction
                );
            }

            // Update items status
            await OrderItem.update(
                { status: 'cancelled' },
                { where: { orderId: order.id }, transaction }
            );
        }

        order.updatedBy = req.user.id;
        await order.save({ transaction });

        // Create status history
        await OrderStatusHistory.create({
            orderId: order.id,
            previousStatus,
            newStatus: status,
            notes,
            changedBy: req.user.id,
            changedByName: req.user.userName,
            ipAddress: AuditLogService.getIpAddress(req),
            metadata: { trackingNumber, trackingUrl, expectedDeliveryDate }
        }, { transaction });

        await transaction.commit();

        try {
            // Send notification
            await NotificationService.sendOrderStatusUpdate(order, order.user, previousStatus);

            // Audit log
            await AuditLogService.logStatusChange(
                req, 'orders', 'Order', id, previousStatus, status, notes
            );
        } catch (postCommitError) {
            console.error('Post-commit error in status update:', postCommitError);
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            data: order
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(error);
    }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res, next) => {
    req.body.status = 'cancelled';
    return this.updateOrderStatus(req, res, next);
};

/**
 * Get order statistics (Admin dashboard)
 */
exports.getOrderStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter[Op.gte] = new Date(startDate);
            if (endDate) dateFilter[Op.lte] = new Date(endDate);
        }

        const where = { isDeleted: false };
        if (Object.keys(dateFilter).length > 0) {
            where.createdAt = dateFilter;
        }

        // Get counts by status
        const statusCounts = await Order.findAll({
            where,
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status']
        });

        // Get revenue stats
        const revenueStats = await Order.findOne({
            where: { ...where, status: { [Op.notIn]: ['cancelled', 'returned', 'refunded'] } },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
                [sequelize.fn('SUM', sequelize.col('tax_amount')), 'totalTax'],
                [sequelize.fn('SUM', sequelize.col('discount_amount')), 'totalDiscount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
                [sequelize.fn('AVG', sequelize.col('total')), 'averageOrderValue']
            ]
        });

        // Get today's orders
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayStats = await Order.findOne({
            where: {
                isDeleted: false,
                createdAt: { [Op.gte]: startOfToday }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
            ]
        });

        const totalOrders = statusCounts.reduce((sum, item) => sum + parseInt(item.get('count')), 0);
        const statusBreakdown = statusCounts.reduce((acc, item) => {
            acc[item.status] = parseInt(item.get('count'));
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: parseFloat(revenueStats?.get('totalRevenue')) || 0,
                averageOrderValue: parseFloat(revenueStats?.get('averageOrderValue')) || 0,
                statusBreakdown,
                revenue: {
                    total: parseFloat(revenueStats?.get('totalRevenue')) || 0,
                    tax: parseFloat(revenueStats?.get('totalTax')) || 0,
                    discount: parseFloat(revenueStats?.get('totalDiscount')) || 0,
                    orderCount: parseInt(revenueStats?.get('orderCount')) || 0,
                    averageOrderValue: parseFloat(revenueStats?.get('averageOrderValue')) || 0
                },
                today: {
                    orders: parseInt(todayStats?.get('count')) || 0,
                    revenue: parseFloat(todayStats?.get('revenue')) || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Download orders as Excel
 */
exports.downloadOrdersExcel = async (req, res, next) => {
    try {
        const ExcelJS = require('exceljs');
        const {
            status,
            paymentStatus,
            startDate,
            endDate,
            rangeType, // 'daily', 'weekly', 'monthly', 'yearly', 'custom'
            search
        } = req.query;

        const where = { isDeleted: false };

        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;

        // Handle date range based on rangeType or custom dates
        if (rangeType || startDate || endDate) {
            const now = new Date();
            where.createdAt = {};

            if (rangeType) {
                switch (rangeType) {
                    case 'daily':
                        where.createdAt[Op.gte] = new Date(now.setHours(0, 0, 0, 0));
                        where.createdAt[Op.lte] = new Date(now.setHours(23, 59, 59, 999));
                        break;
                    case 'weekly':
                        const weekStart = new Date(now);
                        weekStart.setDate(now.getDate() - now.getDay());
                        weekStart.setHours(0, 0, 0, 0);
                        where.createdAt[Op.gte] = weekStart;
                        where.createdAt[Op.lte] = new Date();
                        break;
                    case 'monthly':
                        where.createdAt[Op.gte] = new Date(now.getFullYear(), now.getMonth(), 1);
                        where.createdAt[Op.lte] = new Date();
                        break;
                    case 'yearly':
                        where.createdAt[Op.gte] = new Date(now.getFullYear(), 0, 1);
                        where.createdAt[Op.lte] = new Date();
                        break;
                    case 'custom':
                        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                        if (endDate) {
                            const endDateTime = new Date(endDate);
                            endDateTime.setHours(23, 59, 59, 999);
                            where.createdAt[Op.lte] = endDateTime;
                        }
                        break;
                }
            } else {
                // Fallback to direct date range
                if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    where.createdAt[Op.lte] = endDateTime;
                }
            }
        }

        if (search) {
            where[Op.or] = [
                { orderNumber: { [Op.like]: `%${search}%` } },
                { '$user.firstName$': { [Op.like]: `%${search}%` } },
                { '$user.lastName$': { [Op.like]: `%${search}%` } },
                { '$user.phone$': { [Op.like]: `%${search}%` } }
            ];
        }

        // Fetch all orders matching criteria
        const orders = await Order.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'phone', 'userName']
                },
                {
                    model: Doctor,
                    as: 'doctor',
                    attributes: ['id', 'licenseNumber', 'hospitalClinic']
                },
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders');

        // Define columns
        worksheet.columns = [
            { header: 'Order Number', key: 'orderNumber', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment Status', key: 'paymentStatus', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 15 },
            { header: 'Items', key: 'items', width: 15 },
            { header: 'Subtotal', key: 'subtotal', width: 12 },
            { header: 'Tax', key: 'tax', width: 12 },
            { header: 'Discount', key: 'discount', width: 12 },
            { header: 'Shipping', key: 'shipping', width: 12 },
            { header: 'Total', key: 'total', width: 12 },
            { header: 'Doctor License', key: 'doctorLicense', width: 20 },
            { header: 'Hospital/Clinic', key: 'hospital', width: 25 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Add data rows
        orders.forEach(order => {
            worksheet.addRow({
                orderNumber: order.orderNumber,
                date: new Date(order.createdAt).toLocaleDateString(),
                customerName: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
                phone: order.user?.phone || '',
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod || '',
                items: order.itemCount || 0,
                subtotal: parseFloat(order.subtotal).toFixed(2),
                tax: parseFloat(order.taxAmount).toFixed(2),
                discount: parseFloat(order.discountAmount).toFixed(2),
                shipping: parseFloat(order.shippingAmount).toFixed(2),
                total: parseFloat(order.total).toFixed(2),
                doctorLicense: order.doctor?.licenseNumber || '',
                hospital: order.doctor?.hospitalClinic || ''
            });
        });

        // Add summary row
        const totalRevenue = orders.reduce((sum, order) => {
            if (!['cancelled', 'refunded'].includes(order.status)) {
                return sum + parseFloat(order.total);
            }
            return sum;
        }, 0);

        worksheet.addRow({});
        const summaryRow = worksheet.addRow({
            orderNumber: 'TOTAL',
            items: orders.length,
            total: totalRevenue.toFixed(2)
        });
        summaryRow.font = { bold: true };

        // Set response headers
        const filename = `orders_${rangeType || 'custom'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel download error:', error);
        next(error);
    }
};
