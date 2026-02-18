const { Category, Product, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService } = require('../../services');

/**
 * Get all categories
 */
exports.getCategories = async (req, res, next) => {
    try {
        const { includeInactive, flat } = req.query;

        const where = { isDeleted: false };
        if (!includeInactive) {
            where.isActive = true;
        }

        const categories = await Category.findAll({
            where,
            include: flat ? [] : [{
                model: Category,
                as: 'children',
                where: { isDeleted: false, isActive: true },
                required: false,
                include: [{
                    model: Category,
                    as: 'children',
                    where: { isDeleted: false, isActive: true },
                    required: false
                }]
            }],
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
        });

        // For hierarchical view, return only root categories
        const result = flat === 'true'
            ? categories
            : categories.filter(c => c.parentId === null);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single category
 */
exports.getCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isSlug = isNaN(id);

        const where = isSlug ? { slug: id } : { id };
        where.isDeleted = false;

        const category = await Category.findOne({
            where,
            include: [
                {
                    model: Category,
                    as: 'parent',
                    attributes: ['id', 'name', 'slug']
                },
                {
                    model: Category,
                    as: 'children',
                    where: { isDeleted: false, isActive: true },
                    required: false
                }
            ]
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Get product count
        const productCount = await Product.count({
            where: { categoryId: category.id, isDeleted: false, isActive: true }
        });

        res.json({
            success: true,
            data: {
                ...category.toJSON(),
                productCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create category
 */
exports.createCategory = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, description, parentId, image, icon, sortOrder, isActive } = req.body;

        // Generate slug
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + Date.now();

        // Validate parent exists if provided
        if (parentId) {
            const parent = await Category.findByPk(parentId);
            if (!parent || parent.isDeleted) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent category not found'
                });
            }
        }

        const category = await Category.create({
            name,
            slug,
            description,
            parentId,
            image,
            icon,
            sortOrder: sortOrder || 0,
            isActive: isActive !== false,
            createdBy: req.user.id
        });

        await AuditLogService.logCreate(req, 'categories', 'Category', category.id, category.toJSON());

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update category
 */
exports.updateCategory = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const category = await Category.findByPk(id);

        if (!category || category.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const previousData = category.toJSON();

        const { name, description, parentId, image, icon, sortOrder, isActive } = req.body;

        // Prevent category from being its own parent
        if (parentId && parseInt(parentId) === parseInt(id)) {
            return res.status(400).json({
                success: false,
                message: 'Category cannot be its own parent'
            });
        }

        // Update fields
        if (name !== undefined) {
            category.name = name;
            category.slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') + '-' + id;
        }
        if (description !== undefined) category.description = description;
        if (parentId !== undefined) category.parentId = parentId;
        if (image !== undefined) category.image = image;
        if (icon !== undefined) category.icon = icon;
        if (sortOrder !== undefined) category.sortOrder = sortOrder;
        if (isActive !== undefined) category.isActive = isActive;

        category.updatedBy = req.user.id;
        await category.save();

        await AuditLogService.logUpdate(req, 'categories', 'Category', id, previousData, category.toJSON());

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete category
 */
exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);

        if (!category || category.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has products
        const productCount = await Product.count({
            where: { categoryId: id, isDeleted: false }
        });

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${productCount} products. Move products first.`
            });
        }

        // Check if category has children
        const childCount = await Category.count({
            where: { parentId: id, isDeleted: false }
        });

        if (childCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${childCount} subcategories. Delete them first.`
            });
        }

        const previousData = category.toJSON();

        category.isDeleted = true;
        category.isActive = false;
        category.updatedBy = req.user.id;
        await category.save();

        await AuditLogService.logDelete(req, 'categories', 'Category', id, previousData);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get products by category
 */
exports.getCategoryProducts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const category = await Category.findByPk(id);
        if (!category || category.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Get products including from child categories
        const childCategoryIds = await Category.findAll({
            where: { parentId: id, isDeleted: false },
            attributes: ['id']
        }).then(cats => cats.map(c => c.id));

        const categoryIds = [parseInt(id), ...childCategoryIds];

        const { count, rows } = await Product.findAndCountAll({
            where: {
                categoryId: { [Op.in]: categoryIds },
                isActive: true,
                isDeleted: false,
                status: 'active',
                [Op.or]: [
                    { trackInventory: false },
                    { stockQuantity: { [Op.gt]: 0 } },
                    { allowBackorder: true }
                ]
            },
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                category,
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
 * Reorder categories
 */
exports.reorderCategories = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { categories } = req.body;

        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                message: 'Categories array is required'
            });
        }

        for (const item of categories) {
            await Category.update(
                { sortOrder: item.sortOrder },
                { where: { id: item.id }, transaction }
            );
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Categories reordered successfully'
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(error);
    }
};
