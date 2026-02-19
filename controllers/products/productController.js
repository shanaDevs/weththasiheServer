const { Product, Category, Agency, Brand, Tax, ProductBulkPrice, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService, InventoryService, PricingService } = require('../../services');

/**
 * Get all products (Shopping - excludes out of stock)
 */
exports.getProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            categoryId,
            categorySlug,
            manufacturer,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            featured
        } = req.query;

        const where = {
            isDeleted: false
            // Temporarily relaxed for development - showing all products
            // In production, you may want to filter by:
            // isActive: true,
            // status: 'active',
            // and stock availability
        };

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { genericName: { [Op.like]: `%${search}%` } },
                { '$agency.name$': { [Op.like]: `%${search}%` } },
                { brand: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
                { '$category.name$': { [Op.like]: `%${search}%` } }
            ];
        }

        if (categoryId) where.categoryId = categoryId;
        if (categorySlug) where['$category.slug$'] = categorySlug;
        if (manufacturer) where.manufacturer = manufacturer;
        if (featured === 'true') where.isFeatured = true;
        if (minPrice) where.sellingPrice = { ...where.sellingPrice, [Op.gte]: parseFloat(minPrice) };
        if (maxPrice) where.sellingPrice = { ...where.sellingPrice, [Op.lte]: parseFloat(maxPrice) };

        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug']
                },
                {
                    model: require('../../models').Agency, // Or access if imported
                    as: 'agency',
                    attributes: ['id', 'name']
                },
                {
                    model: ProductBulkPrice,
                    as: 'bulkPrices',
                    where: { isActive: true },
                    required: false
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            subQuery: false,
            distinct: true
        });

        // Get active promotions for these products
        const productIds = rows.map(p => p.id);
        const promotions = await PricingService.getActivePromotions(productIds);

        // Apply promotion pricing
        const products = rows.map(product => {
            const productJson = product.toJSON();
            const applicablePromo = promotions.find(p =>
                p.applicableTo === 'all' ||
                (p.productIds && p.productIds.includes(product.id))
            );

            if (applicablePromo) {
                const promoPrice = PricingService.applyPromotionToProduct(product, applicablePromo);
                productJson.promotion = promoPrice;
            }

            return productJson;
        });

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all products (Admin - includes out of stock)
 */
exports.getProductsAdmin = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            categoryId,
            categorySlug,
            status,
            stockStatus,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = { isDeleted: false };

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { genericName: { [Op.like]: `%${search}%` } },
                { manufacturer: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
                { barcode: { [Op.like]: `%${search}%` } },
                { '$category.name$': { [Op.like]: `%${search}%` } }
            ];
        }

        if (categoryId) where.categoryId = categoryId;
        if (categorySlug) where['$category.slug$'] = categorySlug;
        if (status) where.status = status;

        // Stock status filter
        if (stockStatus === 'out_of_stock') {
            where.stockQuantity = { [Op.lte]: 0 };
        } else if (stockStatus === 'low_stock') {
            where.stockQuantity = {
                [Op.gt]: 0,
                [Op.lte]: sequelize.col('low_stock_threshold')
            };
        } else if (stockStatus === 'in_stock') {
            where.stockQuantity = { [Op.gt]: sequelize.col('low_stock_threshold') };
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug']
                },
                {
                    model: Tax,
                    as: 'tax',
                    attributes: ['id', 'name', 'percentage']
                }
            ],
            order: [
                ['priority', 'DESC'],
                [sortBy, sortOrder]
            ],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            subQuery: false,
            distinct: true
        });

        res.json({
            success: true,
            data: {
                products: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single product by ID or slug
 */
exports.getProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isSlug = isNaN(id);

        const where = isSlug ? { slug: id } : { id };
        where.isDeleted = false;

        const product = await Product.findOne({
            where,
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug', 'description']
                },
                {
                    model: Tax,
                    as: 'tax',
                    attributes: ['id', 'name', 'percentage', 'type']
                },
                {
                    model: ProductBulkPrice,
                    as: 'bulkPrices',
                    where: { isActive: true },
                    required: false,
                    order: [['minQuantity', 'ASC']]
                }
            ]
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get active promotions
        const promotions = await PricingService.getActivePromotions([product.id]);
        const productJson = product.toJSON();

        if (promotions.length > 0) {
            const promoPrice = PricingService.applyPromotionToProduct(product, promotions[0]);
            productJson.promotion = promoPrice;
        }

        res.json({
            success: true,
            data: productJson
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create product
 */
exports.createProduct = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            name,
            sku,
            barcode,
            description,
            shortDescription,
            genericName,
            manufacturer,
            brand,
            dosageForm,
            strength,
            packSize,
            requiresPrescription,
            categoryId,
            costPrice,
            retailPrice,
            wholesalePrice,
            distributorPrice,
            sellingPrice,
            mrp,
            agencyId,
            minOrderQuantity,
            bulkPriceEnabled,
            bulkPrices,
            taxEnabled,
            taxPercentage,
            taxId,
            stockQuantity,
            lowStockThreshold,
            trackInventory,
            allowBackorder,
            images,
            thumbnail,
            status,
            isFeatured,
            expiryDate,
            batchNumber,
            weight,
            length,
            width,
            height,
            metaTitle,
            metaDescription,
            metaKeywords,
            priority
        } = req.body;

        // Generate slug
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + Date.now();

        // Resolve or create Brand
        let resolvedBrandId = null;
        if (req.body.brand) {
            try {
                const [brandRecord] = await Brand.findOrCreate({
                    where: { name: req.body.brand },
                    defaults: {
                        slug: req.body.brand.toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '') + '-' + Date.now(),
                        isActive: true,
                        createdBy: req.user.id
                    },
                    transaction
                });
                resolvedBrandId = brandRecord.id;
            } catch (err) {
                console.warn('Brand resolution failed:', err);
            }
        }

        const product = await Product.create({
            name,
            slug,
            sku,
            barcode,
            description,
            shortDescription,
            genericName,
            manufacturer,
            brand,
            brandId: resolvedBrandId,
            dosageForm,
            strength,
            packSize,
            requiresPrescription: requiresPrescription || false,
            categoryId,
            costPrice: costPrice || 0,
            retailPrice: retailPrice || 0,
            wholesalePrice: wholesalePrice || 0,
            distributorPrice: distributorPrice || 0,
            sellingPrice,
            mrp,
            agencyId,
            minOrderQuantity: minOrderQuantity || 1,
            bulkPriceEnabled: bulkPriceEnabled || false,
            taxEnabled: taxEnabled !== false,
            taxPercentage: taxPercentage || 0,
            taxId,
            stockQuantity: stockQuantity || 0,
            lowStockThreshold: lowStockThreshold || 10,
            trackInventory: trackInventory !== false,
            allowBackorder: allowBackorder || false,
            images,
            thumbnail,
            status: status || 'draft',
            isActive: status === 'active',
            isFeatured: isFeatured || false,
            expiryDate,
            batchNumber,
            weight,
            length,
            width,
            height,
            metaTitle,
            metaDescription,
            metaKeywords,
            priority: priority || 0,
            createdBy: req.user.id
        }, { transaction });

        // Create bulk prices if provided
        if (bulkPriceEnabled && bulkPrices && bulkPrices.length > 0) {
            await ProductBulkPrice.bulkCreate(
                bulkPrices.map(bp => ({
                    productId: product.id,
                    minQuantity: bp.minQuantity,
                    maxQuantity: bp.maxQuantity,
                    price: bp.price,
                    discountPercentage: bp.discountPercentage,
                    isActive: true
                })),
                { transaction }
            );
        }

        await transaction.commit();

        try {
            // Audit log
            await AuditLogService.logCreate(req, 'products', 'Product', product.id, product.toJSON());
        } catch (postCommitError) {
            console.error('Post-commit error (audit log):', postCommitError);
        }

        // Fetch complete product
        const createdProduct = await Product.findByPk(product.id, {
            include: [
                { model: Category, as: 'category' },
                { model: ProductBulkPrice, as: 'bulkPrices' }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: createdProduct
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(error);
    }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const product = await Product.findByPk(id, { transaction });

        if (!product || product.isDeleted) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Resolve Brand ID if brand name is updated
        if (req.body.brand && req.body.brand !== product.brand) {
            try {
                const [brandRecord] = await Brand.findOrCreate({
                    where: { name: req.body.brand },
                    defaults: {
                        slug: req.body.brand.toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '') + '-' + Date.now(),
                        isActive: true,
                        createdBy: req.user.id
                    },
                    transaction
                });
                req.body.brandId = brandRecord.id;
            } catch (err) {
                console.warn('Brand resolution failed in update:', err);
            }
        }

        const previousData = product.toJSON();

        // Update fields
        const updateFields = [
            'name', 'description', 'shortDescription', 'genericName',
            'manufacturer', 'brand', 'brandId', 'dosageForm', 'strength', 'packSize',
            'requiresPrescription', 'categoryId', 'costPrice',
            'retailPrice', 'wholesalePrice', 'distributorPrice',
            'sellingPrice', 'mrp', 'agencyId', 'minOrderQuantity',
            'bulkPriceEnabled', 'taxEnabled', 'taxPercentage', 'taxId',
            'stockQuantity', 'lowStockThreshold', 'trackInventory',
            'allowBackorder', 'images', 'thumbnail', 'status', 'isFeatured',
            'expiryDate', 'batchNumber', 'weight', 'length', 'width', 'height',
            'metaTitle', 'metaDescription', 'metaKeywords', 'priority'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }
        });

        // Update slug if name changed
        if (req.body.name && req.body.name !== previousData.name) {
            product.slug = req.body.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') + '-' + product.id;
        }

        product.isActive = product.status === 'active';
        product.updatedBy = req.user.id;

        await product.save({ transaction });

        // Update bulk prices if provided
        if (req.body.bulkPrices !== undefined) {
            await ProductBulkPrice.destroy({
                where: { productId: id },
                transaction
            });

            if (req.body.bulkPrices && req.body.bulkPrices.length > 0) {
                await ProductBulkPrice.bulkCreate(
                    req.body.bulkPrices.map(bp => ({
                        productId: id,
                        minQuantity: bp.minQuantity,
                        maxQuantity: bp.maxQuantity,
                        price: bp.price,
                        discountPercentage: bp.discountPercentage,
                        isActive: true
                    })),
                    { transaction }
                );
            }
        }

        await transaction.commit();

        try {
            // Audit log
            await AuditLogService.logUpdate(req, 'products', 'Product', id, previousData, product.toJSON());
        } catch (postCommitError) {
            console.error('Post-commit error (audit log):', postCommitError);
        }

        const updatedProduct = await Product.findByPk(id, {
            include: [
                { model: Category, as: 'category' },
                { model: ProductBulkPrice, as: 'bulkPrices' }
            ]
        });

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(error);
    }
};

/**
 * Delete product (soft delete)
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if (!product || product.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const previousData = product.toJSON();

        product.isDeleted = true;
        product.isActive = false;
        product.status = 'discontinued';
        product.updatedBy = req.user.id;
        await product.save();

        await AuditLogService.logDelete(req, 'products', 'Product', id, previousData);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update product stock
 */
exports.updateStock = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { quantity, reason } = req.body;

        const result = await InventoryService.adjustStock(id, quantity, reason, req);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Failed to update stock'
            });
        }

        res.json({
            success: true,
            message: 'Stock updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get low stock products
 */
exports.getLowStockProducts = async (req, res, next) => {
    try {
        const products = await InventoryService.getLowStockProducts();

        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get out of stock products
 */
exports.getOutOfStockProducts = async (req, res, next) => {
    try {
        const products = await InventoryService.getOutOfStockProducts();

        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get expiring products
 */
exports.getExpiringProducts = async (req, res, next) => {
    try {
        const { days = 30 } = req.query;
        const products = await InventoryService.getExpiringProducts(parseInt(days));

        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get inventory movements for a product
 */
exports.getInventoryMovements = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type, startDate, endDate, page, limit } = req.query;

        const result = await InventoryService.getMovements(id, {
            type,
            startDate,
            endDate,
            page,
            limit
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk update products
 */
exports.bulkUpdate = async (req, res, next) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({
                success: false,
                message: 'Products array is required'
            });
        }

        const results = [];

        for (const update of products) {
            try {
                const product = await Product.findByPk(update.id);
                if (product && !product.isDeleted) {
                    const previousData = product.toJSON();

                    Object.keys(update).forEach(key => {
                        if (key !== 'id' && product[key] !== undefined) {
                            product[key] = update[key];
                        }
                    });

                    product.updatedBy = req.user.id;
                    await product.save();

                    await AuditLogService.logUpdate(req, 'products', 'Product', update.id, previousData, product.toJSON());

                    results.push({ id: update.id, success: true });
                } else {
                    results.push({ id: update.id, success: false, message: 'Product not found' });
                }
            } catch (error) {
                results.push({ id: update.id, success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            message: 'Bulk update completed',
            data: results
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get distinct manufacturers (brands)
 */
exports.getManufacturers = async (req, res, next) => {
    try {
        const brands = await Brand.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']],
            attributes: ['name']
        });

        res.json({
            success: true,
            data: brands.map(b => b.name)
        });
    } catch (error) {
        next(error);
    }
};
