const { OrderRequest, Product, User, Sequelize } = require('../../models');
const { validationResult } = require('express-validator');

/**
 * Order Request Controller
 */
exports.submitOrderRequest = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { productId, requestedQuantity, note } = req.body;
        const userId = req.user.id;

        // Verify product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const request = await OrderRequest.create({
            userId,
            productId,
            requestedQuantity,
            note,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Order request submitted successfully. Admin will review it.',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

exports.getOrderRequests = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const { count, rows } = await OrderRequest.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: {
                requests: rows,
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

exports.processOrderRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, releasedQuantity, adminNote } = req.body;

        const request = await OrderRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = status;
        request.releasedQuantity = releasedQuantity || request.requestedQuantity;
        request.adminNote = adminNote;
        request.processedBy = req.user.id;
        request.processedAt = new Date();

        await request.save();

        // TODO: Trigger notification to user

        res.json({
            success: true,
            message: `Order request ${status} successfully`,
            data: request
        });
    } catch (error) {
        next(error);
    }
};
