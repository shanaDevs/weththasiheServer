const express = require('express');
const router = express.Router();
const { Brand } = require('../../models');
const { verifyToken, requireAdminOrAbove } = require('../../middleware/auth');

/**
 * GET /api/brands
 * Returns all active brands (public, used for dropdowns)
 */
router.get('/', async (req, res, next) => {
    try {
        const brands = await Brand.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']],
            attributes: ['id', 'name', 'slug', 'logo', 'description']
        });
        res.json({ success: true, data: brands });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/brands
 * Create a new brand (admin only)
 */
router.post('/', requireAdminOrAbove, async (req, res, next) => {
    try {
        const { name, description, logo } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Brand name is required' });

        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + Date.now();

        const brand = await Brand.create({
            name,
            slug,
            description,
            logo,
            isActive: true,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, data: brand });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, message: 'Brand with this name already exists' });
        }
        next(error);
    }
});

/**
 * PUT /api/brands/:id
 * Update a brand (admin only)
 */
router.put('/:id', requireAdminOrAbove, async (req, res, next) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

        const { name, description, logo, isActive } = req.body;
        if (name) brand.name = name;
        if (description !== undefined) brand.description = description;
        if (logo !== undefined) brand.logo = logo;
        if (isActive !== undefined) brand.isActive = isActive;
        brand.updatedBy = req.user.id;

        await brand.save();
        res.json({ success: true, data: brand });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/brands/:id
 * Delete a brand (admin only)
 */
router.delete('/:id', requireAdminOrAbove, async (req, res, next) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

        await brand.destroy();
        res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
