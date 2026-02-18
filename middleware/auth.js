const jwt = require('jsonwebtoken');
const { User, Permission, Role, RolePermission } = require('../models');
const AuditLogService = require('../services/auditLogService');

// Verify JWT token
exports.verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Fetch user with role to get role details
        const user = await User.findByPk(decoded.id, {
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'displayName', 'level']
            }]
        });

        if (!user || !user.role) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user or role not found'
            });
        }

        req.user = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            userName: user.userName,
            roleId: user.roleId,
            roleName: user.role.name,
            roleLevel: user.role.level
        };
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Alias for verifyToken
exports.authenticateToken = exports.verifyToken;

// Optional authentication - doesn't fail if no token, just sets user if available
exports.optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const user = await User.findByPk(decoded.id, {
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'displayName', 'level']
            }]
        });

        if (user && user.role) {
            req.user = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                userName: user.userName,
                roleId: user.roleId,
                roleName: user.role.name,
                roleLevel: user.role.level
            };
        }

        next();
    } catch (error) {
        // Token invalid but we don't fail - just continue without user
        next();
    }
};

// Check if user has minimum required role level
exports.requireLevel = (minLevel) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.roleLevel < minLevel) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
                required: `Level ${minLevel} or above`,
                current: `Level ${req.user.roleLevel}`
            });
        }

        next();
    };
};

// Check if user has required role by name
exports.requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.roleName)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Middleware combinations using role levels
// super_admin: 100, admin: 80, manager: 60, super_cashier: 40, cashier: 20, user: 10
exports.requireSuperAdmin = [exports.verifyToken, exports.requireLevel(100)];
exports.requireAdminOrAbove = [exports.verifyToken, exports.requireLevel(80)];
exports.requireManagerOrAbove = [exports.verifyToken, exports.requireLevel(60)];
exports.requireSuperCashierOrAbove = [exports.verifyToken, exports.requireLevel(40)];
exports.requireCashierOrAbove = [exports.verifyToken, exports.requireLevel(20)];


// Check if user has specific permission (module, action)
exports.requirePermission = (module, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Super admin (level 100) has all permissions
            if (req.user.roleLevel >= 100) {
                return next();
            }

            // Get role permissions from RolePermission junction table
            const rolePermissions = await RolePermission.findAll({
                where: { roleId: req.user.roleId },
                include: [{
                    model: Permission,
                    as: 'permission',
                    where: {
                        module: module,
                        action: action,
                        isActive: true
                    },
                    required: true
                }]
            });

            if (rolePermissions.length > 0) {
                return next();
            }

            // Log unauthorized access attempt
            await AuditLogService.log({
                userId: req.user.id,
                userName: req.user.userName,
                action: 'OTHER',
                module: 'auth',
                entityType: 'Permission',
                description: `Unauthorized access attempt. Required: ${module}.${action}`,
                riskLevel: 'MEDIUM',
                ipAddress: AuditLogService.getIpAddress(req),
                userAgent: req.headers['user-agent']
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied. Required permission not granted.',
                required: `${module}.${action}`
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions',
                error: error.message
            });
        }
    };
};

// Combine verifyToken with permission check
exports.checkPermission = (module, action) => {
    return [exports.verifyToken, exports.requirePermission(module, action)];
};
