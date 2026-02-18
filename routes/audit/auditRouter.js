const express = require('express');
const router = express.Router();
const auditLogController = require('../../controllers/audit/auditLogController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { queryValidators } = require('../../validators');

/**
 * @route   GET /api/audit-logs
 * @desc    Get audit logs
 * @access  Admin
 */
router.get('/',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    auditLogController.getAuditLogs
);

/**
 * @route   GET /api/audit-logs/stats
 * @desc    Get audit statistics
 * @access  Admin
 */
router.get('/stats',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.dateRange,
    auditLogController.getAuditStats
);

/**
 * @route   GET /api/audit-logs/logins
 * @desc    Get login history
 * @access  Admin
 */
router.get('/logins',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    queryValidators.dateRange,
    auditLogController.getLoginHistory
);

/**
 * @route   GET /api/audit-logs/export
 * @desc    Export audit logs
 * @access  Admin
 */
router.get('/export',
    authenticateToken,
    requirePermission('audit_logs', 'export'),
    queryValidators.dateRange,
    auditLogController.exportAuditLogs
);

/**
 * @route   GET /api/audit-logs/user/:userId
 * @desc    Get user activity
 * @access  Admin
 */
router.get('/user/:userId',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    auditLogController.getUserActivity
);

/**
 * @route   GET /api/audit-logs/entity/:entityType/:entityId
 * @desc    Get entity history
 * @access  Admin
 */
router.get('/entity/:entityType/:entityId',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    queryValidators.pagination,
    auditLogController.getEntityHistory
);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get single audit log
 * @access  Admin
 */
router.get('/:id',
    authenticateToken,
    requirePermission('audit_logs', 'read'),
    auditLogController.getAuditLog
);

module.exports = router;
