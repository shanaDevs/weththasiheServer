const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrderItem = sequelize.define('OrderItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'order_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        // Product snapshot at time of order
        productName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'product_name'
        },
        productSku: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'product_sku'
        },
        productImage: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'product_image'
        },
        genericName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'generic_name'
        },
        manufacturer: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        batchNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'batch_number'
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expiry_date'
        },
        // Quantity
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        // Pricing
        unitPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'unit_price'
        },
        originalPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'original_price'
        },
        costPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'cost_price',
            comment: 'For profit calculation'
        },
        // Tax
        taxEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'tax_enabled'
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'tax_percentage'
        },
        taxAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'tax_amount'
        },
        // Discount
        discountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'discount_percentage'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'discount_amount'
        },
        // Totals
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        total: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        // Promotion
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'promotion_id'
        },
        appliedBulkPriceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'applied_bulk_price_id'
        },
        // Fulfillment
        fulfilledQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'fulfilled_quantity'
        },
        returnedQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'returned_quantity'
        },
        status: {
            type: DataTypes.ENUM('pending', 'fulfilled', 'partial', 'cancelled', 'returned'),
            defaultValue: 'pending'
        },
        // Notes
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'order_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['order_id'] },
            { fields: ['product_id'] },
            { fields: ['status'] }
        ]
    });

    return OrderItem;
};
