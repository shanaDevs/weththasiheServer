const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PurchaseOrder = sequelize.define('PurchaseOrder', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        poNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'po_number'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_id'
        },
        orderDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'order_date'
        },
        expectedDate: {
            type: DataTypes.DATE,
            field: 'expected_date'
        },
        receivedDate: {
            type: DataTypes.DATE,
            field: 'received_date'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'total_amount'
        },
        status: {
            type: DataTypes.ENUM('draft', 'sent', 'partially_received', 'received', 'cancelled'),
            defaultValue: 'draft'
        },
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'partially_paid', 'paid'),
            defaultValue: 'pending',
            field: 'payment_status'
        },
        notes: {
            type: DataTypes.TEXT
        },
        createdBy: {
            type: DataTypes.INTEGER,
            field: 'created_by'
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            field: 'updated_by'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        }
    }, {
        tableName: 'purchase_orders',
        timestamps: true,
        underscored: true
    });

    return PurchaseOrder;
};
