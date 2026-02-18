const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RolePermission = sequelize.define('RolePermission', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'role_id',
            references: {
                model: 'roles',
                key: 'id'
            }
        },
        permissionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'permission_id',
            references: {
                model: 'permissions',
                key: 'id'
            }
        }
    }, {
        tableName: 'role_permissions',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['role_id', 'permission_id'], unique: true }
        ]
    });

    return RolePermission;
};
