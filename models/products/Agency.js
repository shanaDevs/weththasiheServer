const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Agency = sequelize.define('Agency', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            comment: 'Agency name (e.g., SPMC, SPC)'
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            comment: 'Unique agency code'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        contactPerson: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'contact_person'
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: { isEmail: true }
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
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
        tableName: 'agencies',
        timestamps: true,
        underscored: true
    });

    return Agency;
};
