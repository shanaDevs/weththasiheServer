const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Role = sequelize.define('Role', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Role name (user, super_admin, admin, manager, super_cashier, cashier)'
        },
        displayName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'display_name',
            comment: 'Human-readable role name'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Description of role responsibilities'
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            comment: 'Hierarchy level (higher = more permissions)'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: 'is_active'
        }
    }, {
        tableName: 'roles',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['name'], unique: true },
            { fields: ['is_active'] }
        ]
    });

    return Role;
};
