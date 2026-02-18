const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Discount = sequelize.define('Discount', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Discount name'
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            comment: 'Discount/Coupon code (null for automatic discounts)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'),
            allowNull: false,
            defaultValue: 'percentage'
        },
        value: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Discount value (percentage or fixed amount)'
        },
        // Conditions
        minOrderAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'min_order_amount',
            comment: 'Minimum order amount to apply discount'
        },
        minQuantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'min_quantity',
            comment: 'Minimum quantity of items'
        },
        maxDiscountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'max_discount_amount',
            comment: 'Maximum discount cap for percentage discounts'
        },
        // Applicability
        applicableTo: {
            type: DataTypes.ENUM('all', 'categories', 'products', 'users'),
            defaultValue: 'all',
            field: 'applicable_to'
        },
        applicableIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'applicable_ids',
            comment: 'Array of category/product/user IDs this discount applies to'
        },
        excludedIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'excluded_ids',
            comment: 'Array of IDs to exclude from this discount'
        },
        // Usage Limits
        usageLimit: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'usage_limit',
            comment: 'Total number of times discount can be used'
        },
        usageLimitPerUser: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'usage_limit_per_user',
            comment: 'Number of times per user'
        },
        usedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'used_count'
        },
        // Validity
        startDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'start_date'
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'end_date'
        },
        // Status
        isAutomatic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_automatic',
            comment: 'Automatically apply without code'
        },
        isStackable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_stackable',
            comment: 'Can be combined with other discounts'
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Higher priority discounts applied first'
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
        tableName: 'discounts',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['code'], unique: true },
            { fields: ['type'] },
            { fields: ['is_active'] },
            { fields: ['start_date', 'end_date'] },
            { fields: ['is_automatic'] }
        ]
    });

    return Discount;
};
