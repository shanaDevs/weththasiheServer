const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        userName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'role_id',
            comment: 'Foreign key to roles table'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        isDisabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            field: 'is_verified'
        },
        verificationToken: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'verification_token'
        }
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true
    });

    return User;
};