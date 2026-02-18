const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const NotificationTemplate = sequelize.define('NotificationTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Template name'
        },
        code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Unique template code (e.g., order_confirmation, password_reset)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Type
        type: {
            type: DataTypes.ENUM('email', 'sms', 'push', 'in_app'),
            allowNull: false
        },
        // Email specific
        emailSubject: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'email_subject'
        },
        emailBody: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            field: 'email_body',
            comment: 'HTML email body with placeholders'
        },
        emailBodyPlain: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'email_body_plain',
            comment: 'Plain text version'
        },
        // SMS specific
        smsBody: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'sms_body',
            comment: 'SMS content with placeholders'
        },
        // Push notification specific
        pushTitle: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'push_title'
        },
        pushBody: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'push_body'
        },
        pushData: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'push_data'
        },
        // Placeholders
        availablePlaceholders: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'available_placeholders',
            comment: 'List of available placeholders like {{customer_name}}, {{order_number}}'
        },
        // Trigger
        triggerEvent: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'trigger_event',
            comment: 'Event that triggers this notification (e.g., order.created, user.registered)'
        },
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        isSystem: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_system',
            comment: 'System templates cannot be deleted'
        },
        // Tracking
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by'
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'updated_by'
        }
    }, {
        tableName: 'notification_templates',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['code'], unique: true },
            { fields: ['type'] },
            { fields: ['trigger_event'] },
            { fields: ['is_active'] }
        ]
    });

    return NotificationTemplate;
};
