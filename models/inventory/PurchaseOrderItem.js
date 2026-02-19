const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        purchaseOrderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'purchase_order_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1
            }
        },
        receivedQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'received_quantity'
        },
        unitPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'unit_price'
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'tax_percentage'
        },
        taxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'tax_amount'
        },
        total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        }
    }, {
        tableName: 'purchase_order_items',
        timestamps: true,
        underscored: true
    });

    return PurchaseOrderItem;
};
