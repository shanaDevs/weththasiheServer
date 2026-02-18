const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SystemSetting = sequelize.define('SystemSetting', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Setting category (e.g., general, email, sms, tax, notifications)'
        },
        key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Unique setting key'
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Setting value (stored as string, parsed based on dataType)'
        },
        dataType: {
            type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
            defaultValue: 'string',
            field: 'data_type'
        },
        displayName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: 'display_name'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Validation
        defaultValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'default_value'
        },
        validationRules: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'validation_rules',
            comment: 'e.g., {min: 0, max: 100} or {options: ["a", "b", "c"]}'
        },
        // UI
        inputType: {
            type: DataTypes.ENUM('text', 'number', 'email', 'textarea', 'toggle', 'select', 'multiselect', 'color', 'file', 'password'),
            defaultValue: 'text',
            field: 'input_type'
        },
        options: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Options for select/multiselect inputs'
        },
        placeholder: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        helpText: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'help_text'
        },
        // Access
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_public',
            comment: 'Whether this setting is accessible without authentication'
        },
        isEditable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_editable',
            comment: 'Whether this setting can be modified via API'
        },
        requiredPermission: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'required_permission',
            comment: 'Permission required to modify this setting'
        },
        // Order
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'sort_order'
        },
        // Tracking
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'updated_by'
        }
    }, {
        tableName: 'system_settings',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['key'], unique: true },
            { fields: ['category'] },
            { fields: ['is_public'] }
        ]
    });

    return SystemSetting;
};
