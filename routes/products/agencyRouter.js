const express = require('express');
const router = express.Router();
const agencyController = require('../../controllers/products/agencyController');
const { agencyValidators } = require('../../validators');
const { verifyToken, requireAdminOrAbove } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Agencies
 *   description: Agency management for manufacturers (SPMC, SPC, etc.)
 */

// Public routes (or doctor authenticated)
router.get('/', verifyToken, agencyController.getAgencies);
router.get('/:id', verifyToken, agencyController.getAgencyById);

// Admin only routes
router.post('/', requireAdminOrAbove, agencyValidators.create, agencyController.createAgency);
router.put('/:id', requireAdminOrAbove, agencyValidators.update, agencyController.updateAgency);
router.delete('/:id', requireAdminOrAbove, agencyController.deleteAgency);

module.exports = router;
