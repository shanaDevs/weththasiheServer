const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrderRequest = sequelize.define('OrderRequest', {
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
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        requestedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'requested_quantity'
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'partially_approved', 'rejected'),
            defaultValue: 'pending'
        },
        releasedQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'released_quantity'
        },
        adminNote: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'admin_note'
        },
        processedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'processed_by'
        },
        processedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'processed_at'
        }
    }, {
        tableName: 'order_requests',
        timestamps: true,
        underscored: true
    });

    return OrderRequest;
};
