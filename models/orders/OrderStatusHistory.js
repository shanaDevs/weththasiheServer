const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
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
        previousStatus: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'previous_status'
        },
        newStatus: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'new_status'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        changedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'changed_by'
        },
        changedByName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'changed_by_name'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: 'order_status_history',
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            { fields: ['order_id'] },
            { fields: ['new_status'] },
            { fields: ['created_at'] }
        ]
    });

    return OrderStatusHistory;
};
