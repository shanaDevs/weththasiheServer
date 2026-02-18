const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Cart = sequelize.define('Cart', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        sessionId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'session_id',
            comment: 'For guest carts'
        },
        // Totals
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            comment: 'Sum of item prices before tax/discount'
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
            defaultValue: 0
        },
        // Discount/Coupon
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
        // Meta
        itemCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'item_count'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Selected addresses
        shippingAddressId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'shipping_address_id'
        },
        billingAddressId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'billing_address_id'
        },
        // Status
        status: {
            type: DataTypes.ENUM('active', 'abandoned', 'converted', 'merged'),
            defaultValue: 'active'
        },
        lastActivityAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_activity_at'
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at'
        }
    }, {
        tableName: 'carts',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['session_id'] },
            { fields: ['status'] },
            { fields: ['last_activity_at'] }
        ]
    });

    return Cart;
};
