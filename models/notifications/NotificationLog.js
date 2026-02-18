const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const NotificationLog = sequelize.define('NotificationLog', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        templateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'template_id'
        },
        templateCode: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'template_code'
        },
        // Type & Channel
        type: {
            type: DataTypes.ENUM('email', 'sms', 'push', 'in_app'),
            allowNull: false
        },
        // Recipient
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id'
        },
        recipientEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'recipient_email'
        },
        recipientPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'recipient_phone'
        },
        recipientName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'recipient_name'
        },
        // Content
        subject: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        body: {
            type: DataTypes.TEXT('long'),
            allowNull: true
        },
        // Status
        status: {
            type: DataTypes.ENUM('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'),
            defaultValue: 'pending'
        },
        // Timestamps
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'sent_at'
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'delivered_at'
        },
        openedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'opened_at'
        },
        clickedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'clicked_at'
        },
        failedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'failed_at'
        },
        // Provider Info
        provider: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'e.g., sendgrid, twilio, firebase'
        },
        providerMessageId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'provider_message_id'
        },
        providerResponse: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'provider_response'
        },
        // Error
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'error_message'
        },
        errorCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'error_code'
        },
        // Retry
        retryCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'retry_count'
        },
        maxRetries: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
            field: 'max_retries'
        },
        nextRetryAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'next_retry_at'
        },
        // Reference
        referenceType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'reference_type',
            comment: 'e.g., order, user, promotion'
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_id'
        },
        // Meta
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional data like placeholders used, tracking info'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        // Tracking
        cost: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: true,
            comment: 'Cost of sending this notification'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by'
        }
    }, {
        tableName: 'notification_logs',
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            { fields: ['template_id'] },
            { fields: ['user_id'] },
            { fields: ['type'] },
            { fields: ['status'] },
            { fields: ['created_at'] },
            { fields: ['reference_type', 'reference_id'] }
        ]
    });

    return NotificationLog;
};
