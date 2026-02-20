const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Product = sequelize.define('Product', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Basic Info
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Product name'
        },
        slug: {
            type: DataTypes.STRING(280),
            allowNull: false,
            unique: true,
            comment: 'URL-friendly identifier'
        },
        sku: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Stock Keeping Unit'
        },
        barcode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            comment: 'Product barcode (UPC, EAN, etc.)'
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

        // Medicine Specific
        genericName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'generic_name',
            comment: 'Generic medicine name'
        },
        brand: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Brand name'
        },
        // manufacturer: {
        //     type: DataTypes.STRING(255),
        //     allowNull: true,
        //     comment: 'Manufacturer/Brand name'
        // },
        dosageForm: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'dosage_form',
            comment: 'e.g., Tablet, Capsule, Syrup, Injection'
        },
        strength: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'e.g., 500mg, 10ml'
        },
        packSize: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'pack_size',
            comment: 'e.g., 10 tablets, 100ml bottle'
        },
        requiresPrescription: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'requires_prescription'
        },

        // Categorization
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'category_id'
        },

        // Pricing
        costPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'cost_price',
            comment: 'Purchase/cost price'
        },
        retailPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'retail_price',
            comment: 'Retail selling price'
        },
        wholesalePrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'wholesale_price',
            comment: 'Wholesale selling price'
        },
        distributorPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'distributor_price',
            comment: 'Distributor selling price'
        },
        sellingPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'selling_price',
            comment: 'Regular/Default selling price'
        },
        mrp: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            comment: 'Maximum Retail Price'
        },

        // Agency/Manufacturer
        agencyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'agency_id',
            comment: 'Reference to Agency (e.g. SPMC, SPC)'
        },
        brandId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'brand_id',
            comment: 'Reference to Brand'
        },

        // Bulk Pricing
        minOrderQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            field: 'min_order_quantity',
            comment: 'Minimum order quantity for bulk'
        },
        bulkPriceEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'bulk_price_enabled'
        },

        // Tax Settings
        taxEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'tax_enabled',
            comment: 'Whether tax applies to this product'
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'tax_percentage',
            comment: 'Tax percentage for this product'
        },
        taxId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'tax_id',
            comment: 'Reference to tax configuration'
        },

        // Inventory
        stockQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'stock_quantity'
        },
        lowStockThreshold: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
            field: 'low_stock_threshold'
        },
        trackInventory: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'track_inventory'
        },
        allowBackorder: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'allow_backorder'
        },

        // Media
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of image URLs'
        },
        thumbnail: {
            type: DataTypes.STRING(500),
            allowNull: true
        },

        // Status
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'draft', 'discontinued'),
            defaultValue: 'draft'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        maxOrderQuantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'max_order_quantity',
            comment: 'Maximum quantity a user can order'
        },
        isMaxOrderRestricted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_max_order_restricted',
            comment: 'Whether to enforce max order limit'
        },
        isFeatured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_featured'
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Display priority'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        },

        // Expiry (Medicine specific)
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expiry_date'
        },
        batchNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'batch_number'
        },

        // Weight & Dimensions (for shipping)
        weight: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: true,
            comment: 'Weight in kg'
        },
        length: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Length in cm'
        },
        width: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Width in cm'
        },
        height: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Height in cm'
        },

        // SEO
        metaTitle: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'meta_title'
        },
        metaDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'meta_description'
        },
        metaKeywords: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'meta_keywords'
        },

        // Tracking
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
        tableName: 'products',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['slug'], unique: true },
            { fields: ['sku'], unique: true },
            { fields: ['barcode'] },
            { fields: ['category_id'] },
            { fields: ['generic_name'] }
        ]
    });

    return Product;
};
