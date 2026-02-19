const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Promotion = sequelize.define('Promotion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            comment: 'Promotion name'
        },
        slug: {
            type: DataTypes.STRING(180),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        shortDescription: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'short_description'
        },
        // Type
        type: {
            type: DataTypes.ENUM(
                'flash_sale',
                'seasonal',
                'clearance',
                'bundle',
                'bogo', // Buy One Get One
                'volume_discount',
                'new_customer',
                'loyalty',
                'banner_only'
            ),
            allowNull: false,
            defaultValue: 'flash_sale'
        },
        // Display
        bannerImage: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'banner_image'
        },
        thumbnailImage: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'thumbnail_image'
        },
        displayOnHomepage: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'display_on_homepage'
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'display_order'
        },
        // Discount Configuration
        discountType: {
            type: DataTypes.ENUM('percentage', 'fixed_amount', 'special_price'),
            allowNull: true,
            field: 'discount_type'
        },
        discountValue: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'discount_value'
        },
        // Applicability
        applicableTo: {
            type: DataTypes.ENUM('all', 'categories', 'products'),
            defaultValue: 'products',
            field: 'applicable_to'
        },
        productIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'product_ids',
            comment: 'Array of product IDs included in promotion'
        },
        categoryIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'category_ids',
            comment: 'Array of category IDs included in promotion'
        },
        agencyIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'agency_ids',
            comment: 'Array of agency IDs included in promotion'
        },
        brandIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'brand_ids',
            comment: 'Array of brand IDs included in promotion'
        },
        manufacturers: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of manufacturer/brand names included'
        },
        batchIds: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of batch IDs included'
        },
        // Conditions
        minPurchaseAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'min_purchase_amount'
        },
        maxUsageLimit: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'max_usage_limit'
        },
        usedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'used_count'
        },
        // Validity
        startDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'start_date'
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'end_date'
        },
        // Bundle specific (for bundle promotions)
        bundleProducts: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'bundle_products',
            comment: 'Array of {productId, quantity} for bundle deals'
        },
        bundlePrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            field: 'bundle_price'
        },
        // Status
        status: {
            type: DataTypes.ENUM('draft', 'scheduled', 'active', 'paused', 'ended', 'cancelled'),
            defaultValue: 'draft'
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
        // Meta
        termsAndConditions: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'terms_and_conditions'
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
        tableName: 'promotions',
        timestamps: true,
        underscored: true,
        hooks: {
            beforeValidate: (promotion) => {
                if (promotion.name && !promotion.slug) {
                    promotion.slug = promotion.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '') + '-' + Date.now();
                }
            }
        },
        indexes: [
            { fields: ['slug'], unique: true },
            { fields: ['type'] },
            { fields: ['status'] },
            { fields: ['start_date', 'end_date'] },
            { fields: ['is_active'] },
            { fields: ['display_on_homepage'] }
        ]
    });

    return Promotion;
};
