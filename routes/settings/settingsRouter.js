const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/settings/settingsController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { settingsValidators } = require('../../validators');

/**
 * @swagger
 * /settings/public:
 *   get:
 *     summary: Get all public configuration settings
 *     tags: [Settings]
 *     security: []
 *     responses:
 *       200:
 *         description: Object containing public settings
 */
router.get('/public', settingsController.getPublicSettings);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get all system settings (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all settings
 */
router.get('/',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getAllSettings
);

/**
 * @swagger
 * /settings/notifications:
 *   get:
 *     summary: Get notification gateway settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification configuration
 */
router.get('/notifications',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getNotificationSettings
);

/**
 * @swagger
 * /settings/notifications:
 *   put:
 *     summary: Update notification gateway settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.put('/notifications',
    authenticateToken,
    requirePermission('settings', 'update'),
    settingsController.updateNotificationSettings
);

/**
 * @swagger
 * /settings/email:
 *   get:
 *     summary: Get SMTP/Email relay settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email configuration
 */
router.get('/email',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getEmailSettings
);

/**
 * @swagger
 * /settings/sms:
 *   get:
 *     summary: Get SMS gateway settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMS configuration
 */
router.get('/sms',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getSmsSettings
);

/**
 * @swagger
 * /settings/{key}:
 *   get:
 *     summary: Get a specific setting by unique key
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Setting value
 */
router.get('/:key',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getSetting
);

/**
 * @swagger
 * /settings/{key}:
 *   put:
 *     summary: Update a specific system setting
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Setting updated
 */
router.put('/:key',
    authenticateToken,
    requirePermission('settings', 'update'),
    settingsValidators.update,
    settingsController.updateSetting
);

/**
 * @swagger
 * /settings/bulk:
 *   post:
 *     summary: Bulk update multiple settings at once
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.post('/bulk',
    authenticateToken,
    requirePermission('settings', 'update'),
    settingsController.bulkUpdateSettings
);

/**
 * @swagger
 * /settings:
 *   post:
 *     summary: Create a new system setting (Super Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Setting created
 */
router.post('/',
    authenticateToken,
    requirePermission('settings', 'create'),
    settingsValidators.create,
    settingsController.createSetting
);

/**
 * @swagger
 * /settings/{key}:
 *   delete:
 *     summary: Permanent deletion of a setting key
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Setting deleted
 */
router.delete('/:key',
    authenticateToken,
    requirePermission('settings', 'delete'),
    settingsController.deleteSetting
);

module.exports = router;
