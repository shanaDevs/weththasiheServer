const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CartItem = sequelize.define('CartItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        cartId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'cart_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        // Quantity
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        // Pricing at time of adding
        unitPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'unit_price',
            comment: 'Price per unit at time of adding'
        },
        originalPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'original_price',
            comment: 'Original price before bulk discount'
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
        // Item level discount
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
            defaultValue: 0,
            comment: 'quantity * unitPrice'
        },
        total: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            comment: 'subtotal + tax - discount'
        },
        // Product snapshot
        productName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'product_name'
        },
        productSku: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'product_sku'
        },
        productImage: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'product_image'
        },
        // Meta
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Promotions applied
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'promotion_id'
        },
        appliedBulkPriceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'applied_bulk_price_id'
        }
    }, {
        tableName: 'cart_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['cart_id'] },
            { fields: ['product_id'] },
            { fields: ['cart_id', 'product_id'], unique: true }
        ]
    });

    return CartItem;
};
