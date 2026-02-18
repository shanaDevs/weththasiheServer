const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProductBatch = sequelize.define('ProductBatch', {
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
        batchNumber: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'batch_number'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'supplier_id'
        },
        mfgDate: {
            type: DataTypes.DATEONLY,
            field: 'mfg_date'
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'expiry_date'
        },
        costPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'cost_price'
        },
        sellingPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'selling_price'
        },
        mrp: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        stockQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'stock_quantity'
        },
        status: {
            type: DataTypes.ENUM('active', 'expired', 'out_of_stock', 'quarantined'),
            defaultValue: 'active'
        }
    }, {
        tableName: 'product_batches',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['batch_number'] },
            { fields: ['expiry_date'] }
        ]
    });

    return ProductBatch;
};
