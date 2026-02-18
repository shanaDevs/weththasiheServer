const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProductBulkPrice = sequelize.define('ProductBulkPrice', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        minQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'min_quantity',
            comment: 'Minimum quantity for this price tier'
        },
        maxQuantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'max_quantity',
            comment: 'Maximum quantity for this price tier (null = unlimited)'
        },
        price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Price per unit at this tier'
        },
        discountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'discount_percentage',
            comment: 'Alternative: discount percentage from base price'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'product_bulk_prices',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['min_quantity'] }
        ]
    });

    return ProductBulkPrice;
};
