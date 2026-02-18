const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Inventory = sequelize.define('Inventory', {
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
        // Stock
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        reservedQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'reserved_quantity',
            comment: 'Quantity reserved for pending orders'
        },
        availableQuantity: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('quantity') - this.getDataValue('reservedQuantity');
            }
        },
        // Batch details
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
        manufacturingDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'manufacturing_date'
        },
        // Cost
        costPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'cost_price'
        },
        // Location
        warehouseLocation: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'warehouse_location'
        },
        shelfLocation: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'shelf_location'
        },
        // Thresholds
        reorderLevel: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
            field: 'reorder_level'
        },
        reorderQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 50,
            field: 'reorder_quantity'
        },
        maxStockLevel: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'max_stock_level'
        },
        // Status
        status: {
            type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued', 'expired'),
            defaultValue: 'in_stock'
        },
        // Tracking
        lastRestockedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_restocked_at'
        },
        lastSoldAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_sold_at'
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
        tableName: 'inventory',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['batch_number'] },
            { fields: ['status'] },
            { fields: ['expiry_date'] },
            { fields: ['quantity'] }
        ]
    });

    return Inventory;
};
