const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id',
            comment: 'User who performed the action (null for system actions)'
        },
        userName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'user_name',
            comment: 'Snapshot of username at the time of action'
        },
        action: {
            type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'STATUS_CHANGE', 'OTHER'),
            allowNull: false,
            comment: 'Type of action performed'
        },
        module: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Module where action was performed (e.g., products, orders, users)'
        },
        entityType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'entity_type',
            comment: 'Type of entity affected (e.g., Product, Order, User)'
        },
        entityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'entity_id',
            comment: 'ID of the affected entity'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'Human-readable description of the action'
        },
        previousData: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'previous_data',
            comment: 'State before the change (for updates/deletes)'
        },
        newData: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'new_data',
            comment: 'State after the change (for creates/updates)'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional context (e.g., reason for change, related entities)'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address',
            comment: 'IP address of the user'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent',
            comment: 'Browser/client user agent'
        },
        riskLevel: {
            type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
            defaultValue: 'LOW',
            field: 'risk_level',
            comment: 'Risk level of the action for security monitoring'
        }
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        updatedAt: false, // Audit logs should never be updated
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['action'] },
            { fields: ['module'] },
            { fields: ['entity_type', 'entity_id'] },
            { fields: ['created_at'] },
            { fields: ['risk_level'] }
        ]
    });

    return AuditLog;
};
