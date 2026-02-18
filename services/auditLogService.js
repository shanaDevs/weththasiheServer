const { AuditLog, User } = require('../models');

/**
 * Audit Log Service - Tracks all important actions in the system
 */
class AuditLogService {
    /**
     * Create an audit log entry
     * @param {Object} options - Audit log options
     * @param {number} options.userId - User who performed the action
     * @param {string} options.userName - Username (snapshot)
     * @param {string} options.action - Action type (CREATE, UPDATE, DELETE, etc.)
     * @param {string} options.module - Module name (products, orders, users, etc.)
     * @param {string} options.entityType - Entity type (Product, Order, User, etc.)
     * @param {number} options.entityId - Entity ID
     * @param {string} options.description - Human-readable description
     * @param {Object} options.previousData - Data before change
     * @param {Object} options.newData - Data after change
     * @param {Object} options.metadata - Additional context
     * @param {string} options.ipAddress - User's IP address
     * @param {string} options.userAgent - User's browser/client
     * @param {string} options.riskLevel - Risk level (LOW, MEDIUM, HIGH, CRITICAL)
     */
    static async log(options) {
        try {
            const {
                userId,
                userName,
                action,
                module,
                entityType,
                entityId = null,
                description,
                previousData = null,
                newData = null,
                metadata = null,
                ipAddress = null,
                userAgent = null,
                riskLevel = 'LOW'
            } = options;

            const auditLog = await AuditLog.create({
                userId,
                userName,
                action,
                module,
                entityType,
                entityId,
                description,
                previousData,
                newData,
                metadata,
                ipAddress,
                userAgent,
                riskLevel
            });

            return auditLog;
        } catch (error) {
            // Log error but don't throw - audit logging should not break the main flow
            console.error('Failed to create audit log:', error.message);
            return null;
        }
    }

    /**
     * Log a CREATE action
     */
    static async logCreate(req, module, entityType, entityId, entityData, description = null) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'CREATE',
            module,
            entityType,
            entityId,
            description: description || `Created ${entityType} with ID ${entityId}`,
            newData: this.sanitizeData(entityData),
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log an UPDATE action
     */
    static async logUpdate(req, module, entityType, entityId, previousData, newData, description = null, changedFields = null) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'UPDATE',
            module,
            entityType,
            entityId,
            description: description || `Updated ${entityType} with ID ${entityId}`,
            previousData: this.sanitizeData(previousData),
            newData: this.sanitizeData(newData),
            metadata: changedFields ? { changedFields } : null,
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log a DELETE action
     */
    static async logDelete(req, module, entityType, entityId, entityData, description = null) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'DELETE',
            module,
            entityType,
            entityId,
            description: description || `Deleted ${entityType} with ID ${entityId}`,
            previousData: this.sanitizeData(entityData),
            riskLevel: 'MEDIUM',
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log a VIEW action (for sensitive data access)
     */
    static async logView(req, module, entityType, entityId = null, description = null, metadata = null) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'VIEW',
            module,
            entityType,
            entityId,
            description: description || `Viewed ${entityType}${entityId ? ` with ID ${entityId}` : ''}`,
            metadata,
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log a LOGIN action
     */
    static async logLogin(req, userId, userName, success = true, metadata = null) {
        return this.log({
            userId,
            userName,
            action: 'LOGIN',
            module: 'auth',
            entityType: 'User',
            entityId: userId,
            description: success ? `User ${userName} logged in successfully` : `Failed login attempt for ${userName}`,
            metadata,
            riskLevel: success ? 'LOW' : 'MEDIUM',
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log a LOGOUT action
     */
    static async logLogout(req) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'LOGOUT',
            module: 'auth',
            entityType: 'User',
            entityId: req.user?.id,
            description: `User ${req.user?.userName} logged out`,
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log a STATUS_CHANGE action
     */
    static async logStatusChange(req, module, entityType, entityId, previousStatus, newStatus, reason = null) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'STATUS_CHANGE',
            module,
            entityType,
            entityId,
            description: `Changed ${entityType} status from ${previousStatus} to ${newStatus}`,
            previousData: { status: previousStatus },
            newData: { status: newStatus },
            metadata: reason ? { reason } : null,
            riskLevel: this.getStatusChangeRiskLevel(entityType, newStatus),
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log an EXPORT action
     */
    static async logExport(req, module, entityType, recordCount, format = 'csv', filters = null) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'EXPORT',
            module,
            entityType,
            description: `Exported ${recordCount} ${entityType} records as ${format}`,
            metadata: { recordCount, format, filters },
            riskLevel: 'MEDIUM',
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log an IMPORT action
     */
    static async logImport(req, module, entityType, recordCount, successCount, failCount) {
        return this.log({
            userId: req.user?.id,
            userName: req.user?.userName,
            action: 'IMPORT',
            module,
            entityType,
            description: `Imported ${entityType}: ${successCount} success, ${failCount} failed out of ${recordCount}`,
            metadata: { recordCount, successCount, failCount },
            riskLevel: 'MEDIUM',
            ipAddress: this.getIpAddress(req),
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Get audit logs with filtering
     */
    static async getLogs(options = {}) {
        const {
            userId,
            action,
            module,
            entityType,
            entityId,
            riskLevel,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = options;

        const where = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (module) where.module = module;
        if (entityType) where.entityType = entityType;
        if (entityId) where.entityId = entityId;
        if (riskLevel) where.riskLevel = riskLevel;

        if (startDate || endDate) {
            const { Op } = require('sequelize');
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'userName']
            }],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        return {
            logs: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get logs for a specific entity
     */
    static async getEntityLogs(entityType, entityId, limit = 50) {
        return AuditLog.findAll({
            where: { entityType, entityId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'userName']
            }],
            order: [['createdAt', 'DESC']],
            limit
        });
    }

    /**
     * Sanitize data to remove sensitive fields
     */
    static sanitizeData(data) {
        if (!data) return null;

        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken'];

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Get IP address from request
     */
    static getIpAddress(req) {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               null;
    }

    /**
     * Determine risk level based on status change
     */
    static getStatusChangeRiskLevel(entityType, newStatus) {
        const highRiskStatuses = {
            User: ['deleted', 'disabled', 'blocked'],
            Order: ['cancelled', 'refunded'],
            Product: ['discontinued', 'deleted']
        };

        if (highRiskStatuses[entityType]?.includes(newStatus)) {
            return 'HIGH';
        }

        return 'LOW';
    }
}

module.exports = AuditLogService;
