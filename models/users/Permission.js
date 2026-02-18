module.exports = (sequelize, Sequelize) => {
    const Permission = sequelize.define('Permission', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Permission identifier (e.g., products.create)'
        },
        displayName: {
            type: Sequelize.STRING(255),
            allowNull: false,
            comment: 'Human readable permission name'
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Permission description'
        },
        module: {
            type: Sequelize.STRING(50),
            allowNull: false,
            comment: 'Module name (e.g., products, orders, users)'
        },
        action: {
            type: Sequelize.STRING(50),
            allowNull: false,
            comment: 'Action name (e.g., create, read, update, delete)'
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'permissions',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['module', 'action']
            },
            {
                fields: ['module']
            },
            {
                fields: ['is_active']
            }
        ]
    });

    return Permission;
};
