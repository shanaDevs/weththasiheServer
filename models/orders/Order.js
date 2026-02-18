const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'order_number'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        doctorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'doctor_id'
        },
        // Pricing
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        taxAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'tax_amount'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'discount_amount'
        },
        shippingAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'shipping_amount'
        },
        total: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        // Discount details
        discountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'discount_id'
        },
        couponCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'coupon_code'
        },
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'promotion_id'
        },
        // Item count
        itemCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'item_count'
        },
        totalQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_quantity'
        },
        // Order Status
        status: {
            type: DataTypes.ENUM(
                'pending', 
                'confirmed', 
                'processing', 
                'packed', 
                'shipped', 
                'out_for_delivery',
                'delivered', 
                'cancelled', 
                'returned',
                'refunded',
                'on_hold'
            ),
            defaultValue: 'pending'
        },
        // Payment
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'paid', 'partial', 'failed', 'refunded', 'credit'),
            defaultValue: 'pending',
            field: 'payment_status'
        },
        paymentMethod: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'payment_method'
        },
        paymentReference: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'payment_reference'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'paid_amount'
        },
        dueAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'due_amount'
        },
        // Credit (for doctors)
        isCredit: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_credit'
        },
        creditDueDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'credit_due_date'
        },
        // Addresses (snapshot)
        shippingAddress: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'shipping_address'
        },
        billingAddress: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'billing_address'
        },
        // Shipping
        shippingMethod: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'shipping_method'
        },
        trackingNumber: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'tracking_number'
        },
        trackingUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'tracking_url'
        },
        expectedDeliveryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expected_delivery_date'
        },
        shippedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'shipped_at'
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'delivered_at'
        },
        // Notes
        customerNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'customer_notes'
        },
        internalNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'internal_notes'
        },
        // Cancellation/Return
        cancelReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'cancel_reason'
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'cancelled_at'
        },
        cancelledBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'cancelled_by'
        },
        // Timestamps
        confirmedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'confirmed_at'
        },
        processedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'processed_at'
        },
        // Invoice
        invoiceNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'invoice_number'
        },
        invoiceGeneratedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'invoice_generated_at'
        },
        // Source
        source: {
            type: DataTypes.ENUM('web', 'mobile', 'admin', 'api'),
            defaultValue: 'web'
        },
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
        // Flags
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
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
        tableName: 'orders',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['order_number'], unique: true },
            { fields: ['user_id'] },
            { fields: ['doctor_id'] },
            { fields: ['status'] },
            { fields: ['payment_status'] },
            { fields: ['created_at'] },
            { fields: ['invoice_number'] }
        ]
    });

    return Order;
};
