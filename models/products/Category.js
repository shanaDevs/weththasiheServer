const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Category name'
        },
        slug: {
            type: DataTypes.STRING(120),
            allowNull: false,
            unique: true,
            comment: 'URL-friendly identifier'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'parent_id',
            comment: 'Parent category ID for hierarchical structure'
        },
        image: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Category image URL'
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'sort_order'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: 'is_active'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
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
        tableName: 'categories',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['slug'], unique: true },
            { fields: ['parent_id'] },
            { fields: ['is_active'] },
            { fields: ['sort_order'] }
        ]
    });

    return Category;
};
