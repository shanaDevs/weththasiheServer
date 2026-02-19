const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'order_id'
        },
        doctorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'doctor_id',
            comment: 'For account payments not tied to a specific order upfront'
        },

        transactionId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true,
            field: 'transaction_id'
        },
        // Payment details
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'INR'
        },
        method: {
            type: DataTypes.ENUM(
                'cash',
                'credit_card',
                'debit_card',
                'upi',
                'net_banking',
                'wallet',
                'cheque',
                'bank_transfer',
                'credit', // Doctor credit
                'other'
            ),
            allowNull: false
        },
        // Status
        status: {
            type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund', 'cancelled'),
            defaultValue: 'pending'
        },
        // Provider
        provider: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'e.g., razorpay, stripe, paytm'
        },
        providerTransactionId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'provider_transaction_id'
        },
        providerResponse: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'provider_response'
        },
        // Cheque/Bank specific
        chequeNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'cheque_number'
        },
        bankName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'bank_name'
        },
        bankAccountNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'bank_account_number'
        },
        // Refund
        refundedAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'refunded_amount'
        },
        refundReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'refund_reason'
        },
        refundedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'refunded_at'
        },
        refundedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'refunded_by'
        },
        // Timestamps
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'paid_at'
        },
        failedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'failed_at'
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
        // Notes
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Tracking
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        },
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
        tableName: 'payments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['order_id'] },
            { fields: ['transaction_id'] },
            { fields: ['status'] },
            { fields: ['method'] },
            { fields: ['provider'] },
            { fields: ['created_at'] }
        ]
    });

    return Payment;
};
