const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Supplier = sequelize.define('Supplier', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true
        },
        contactPerson: {
            type: DataTypes.STRING(100),
            field: 'contact_person'
        },
        email: {
            type: DataTypes.STRING(150),
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: DataTypes.STRING(20)
        },
        address: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        }
    }, {
        tableName: 'suppliers',
        timestamps: true,
        underscored: true
    });

    return Supplier;
};
