const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InventoryMovement = sequelize.define('InventoryMovement', {
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
        inventoryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'inventory_id'
        },
        // Movement
        type: {
            type: DataTypes.ENUM(
                'purchase',      // Stock received from supplier
                'sale',          // Stock sold
                'return',        // Customer return
                'adjustment',    // Manual adjustment
                'transfer',      // Transfer between locations
                'damage',        // Damaged stock
                'expired',       // Expired stock
                'reserved',      // Reserved for order
                'unreserved'     // Released from reservation
            ),
            allowNull: false
        },
        quantityBefore: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'quantity_before'
        },
        quantityChange: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'quantity_change',
            comment: 'Positive for increase, negative for decrease'
        },
        quantityAfter: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'quantity_after'
        },
        // Reference
        referenceType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'reference_type',
            comment: 'e.g., order, purchase_order, adjustment'
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_id'
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'reference_number'
        },
        // Batch
        batchNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'batch_number'
        },
        // Cost tracking
        unitCost: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'unit_cost'
        },
        totalCost: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'total_cost'
        },
        // Notes
        reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Tracking
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by'
        },
        createdByName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'created_by_name'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        }
    }, {
        tableName: 'inventory_movements',
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['inventory_id'] },
            { fields: ['type'] },
            { fields: ['reference_type', 'reference_id'] },
            { fields: ['created_at'] }
        ]
    });

    return InventoryMovement;
};
