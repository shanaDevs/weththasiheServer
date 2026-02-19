const express = require('express');
const router = express.Router();
const auditLogController = require('../../controllers/audit/auditLogController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { queryValidators } = require('../../validators');

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get all audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    auditLogController.getAuditLogs
);

/**
 * @swagger
 * /audit-logs/stats:
 *   get:
 *     summary: Get audit statistics
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Audit statistics
 */
router.get('/stats',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.dateRange,
    auditLogController.getAuditStats
);

/**
 * @swagger
 * /audit-logs/logins:
 *   get:
 *     summary: Get login history
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Login history
 */
router.get('/logins',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    auditLogController.getLoginHistory
);

/**
 * @swagger
 * /audit-logs/export:
 *   get:
 *     summary: Export audit logs to CSV
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/export',
    authenticateToken,
    requirePermission('audit_logs', 'export'),
    queryValidators.dateRange,
    auditLogController.exportAuditLogs
);

/**
 * @swagger
 * /audit-logs/user/{userId}:
 *   get:
 *     summary: Get specific user activity
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User activity logs
 */
router.get('/user/:userId',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    auditLogController.getUserActivity
);

/**
 * @swagger
 * /audit-logs/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get history of a specific entity
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Entity history
 */
router.get('/entity/:entityType/:entityId',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    auditLogController.getEntityHistory
);

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Get single audit log detail
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Audit log details
 */
router.get('/:id',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    auditLogController.getAuditLog
);

module.exports = router;
