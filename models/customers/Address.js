const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Address = sequelize.define('Address', {
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
        label: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'e.g., Home, Office, Clinic'
        },
        contactName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'contact_name'
        },
        contactPhone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'contact_phone'
        },
        addressLine1: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'address_line_1'
        },
        addressLine2: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'address_line_2'
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        state: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        country: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'India'
        },
        postalCode: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'postal_code'
        },
        landmark: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_default'
        },
        addressType: {
            type: DataTypes.ENUM('billing', 'shipping', 'both'),
            defaultValue: 'both',
            field: 'address_type'
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
        }
    }, {
        tableName: 'addresses',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['is_default'] },
            { fields: ['address_type'] }
        ]
    });

    return Address;
};
