const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Tax = sequelize.define('Tax', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Tax name (e.g., GST, VAT, Sales Tax)'
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Tax code for reference'
        },
        percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            comment: 'Tax percentage'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('inclusive', 'exclusive'),
            defaultValue: 'exclusive',
            comment: 'Inclusive: included in price, Exclusive: added on top'
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_default',
            comment: 'Default tax for new products'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
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
        tableName: 'taxes',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['code'], unique: true },
            { fields: ['is_active'] },
            { fields: ['is_default'] }
        ]
    });

    return Tax;
};
