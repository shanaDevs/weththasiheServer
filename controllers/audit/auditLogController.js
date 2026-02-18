const { AuditLog, User, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Get audit logs
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            tableName,
            userId,
            entityType,
            entityId,
            riskLevel,
            startDate,
            endDate,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};

        if (action) where.action = action;
        if (tableName) where.tableName = tableName;
        if (userId) where.userId = userId;
        if (entityType) where.entityType = entityType;
        if (entityId) where.entityId = entityId;
        if (riskLevel) where.riskLevel = riskLevel;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        if (search) {
            where[Op.or] = [
                { action: { [Op.like]: `%${search}%` } },
                { tableName: { [Op.like]: `%${search}%` } },
                { entityType: { [Op.like]: `%${search}%` } },
                { ipAddress: { [Op.like]: `%${search}%` } },
                { '$user.userName$': { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                logs: rows,
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
 * Get single audit log
 */
exports.getAuditLog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const log = await AuditLog.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName', 'phone']
                }
            ]
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }

        res.json({
            success: true,
            data: log
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get entity history
 */
exports.getEntityHistory = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const { count, rows } = await AuditLog.findAndCountAll({
            where: {
                entityType,
                entityId: parseInt(entityId)
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                logs: rows,
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
 * Get user activity
 */
exports.getUserActivity = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20, startDate, endDate } = req.query;

        const where = { userId: parseInt(userId) };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                logs: rows,
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
 * Get audit stats
 */
exports.getAuditStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter[Op.gte] = new Date(startDate);
            if (endDate) dateFilter[Op.lte] = new Date(endDate);
        }

        const where = {};
        if (Object.keys(dateFilter).length > 0) {
            where.createdAt = dateFilter;
        }

        // Actions count
        const actionCounts = await AuditLog.findAll({
            where,
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['action']
        });

        // Entity counts
        const entityCounts = await AuditLog.findAll({
            where,
            attributes: [
                'entityType',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['entityType'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        // Risk level counts
        const riskCounts = await AuditLog.findAll({
            where,
            attributes: [
                'riskLevel',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['riskLevel']
        });

        // Most active users
        const activeUsers = await AuditLog.findAll({
            where,
            attributes: [
                'userId',
                [sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'count']
            ],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            group: ['userId'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        // Recent high-risk actions
        const highRiskActions = await AuditLog.findAll({
            where: { ...where, riskLevel: 'high' },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'userName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        // Daily activity for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyActivity = await AuditLog.findAll({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
        });

        res.json({
            success: true,
            data: {
                actions: actionCounts.reduce((acc, item) => {
                    acc[item.action] = parseInt(item.get('count'));
                    return acc;
                }, {}),
                entities: entityCounts.map(item => ({
                    entity: item.entityType,
                    count: parseInt(item.get('count'))
                })),
                riskLevels: riskCounts.reduce((acc, item) => {
                    acc[item.riskLevel] = parseInt(item.get('count'));
                    return acc;
                }, {}),
                activeUsers: activeUsers.map(item => ({
                    user: item.user,
                    count: parseInt(item.get('count'))
                })),
                highRiskActions,
                dailyActivity: dailyActivity.map(item => ({
                    date: item.get('date'),
                    count: parseInt(item.get('count'))
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export audit logs
 */
exports.exportAuditLogs = async (req, res, next) => {
    try {
        const { format = 'json', startDate, endDate, action, tableName } = req.query;

        const where = {};
        if (action) where.action = action;
        if (tableName) where.tableName = tableName;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const logs = await AuditLog.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'userName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10000
        });

        if (format === 'csv') {
            const headers = ['ID', 'Date', 'Action', 'Table', 'Entity Type', 'Entity ID', 'User', 'IP Address', 'Risk Level'];
            const rows = logs.map(log => [
                log.id,
                log.createdAt.toISOString(),
                log.action,
                log.tableName,
                log.entityType,
                log.entityId,
                log.user?.userName || 'System',
                log.ipAddress,
                log.riskLevel
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
            res.send(csv);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.json`);
            res.json(logs);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get login history
 */
exports.getLoginHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, success, startDate, endDate } = req.query;

        const where = {
            action: { [Op.in]: ['login', 'login_failed', 'logout'] }
        };

        if (success !== undefined) {
            where.action = success === 'true' ? 'login' : 'login_failed';
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName', 'phone']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                logs: rows,
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
