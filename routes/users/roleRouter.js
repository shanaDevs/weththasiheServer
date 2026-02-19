const express = require('express');
const router = express.Router();
const roleController = require('../../controllers/users/roleController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Roles & Permissions
 *   description: Role-based access control management
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of roles }
 */
router.get('/', authenticateToken, requirePermission('roles', 'read'), roleController.getRoles);

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of permissions }
 */
router.get('/permissions', authenticateToken, requirePermission('roles', 'read'), roleController.getPermissions);

/**
 * @swagger
 * /roles/{roleId}/permissions:
 *   put:
 *     summary: Update role permissions
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissionIds: { type: array, items: { type: integer } }
 *     responses:
 *       200: { description: Permissions updated }
 */
router.put('/:roleId/permissions', authenticateToken, requirePermission('roles', 'update'), roleController.updateRolePermissions);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create new role
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, displayName]
 *             properties:
 *               name: { type: string }
 *               displayName: { type: string }
 *               description: { type: string }
 *               level: { type: integer }
 *     responses:
 *       201: { description: Role created }
 */
router.post('/', authenticateToken, requirePermission('roles', 'create'), roleController.createRole);

module.exports = router;
