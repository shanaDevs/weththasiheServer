const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/settings/settingsController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { settingsValidators } = require('../../validators');

/**
 * @route   GET /api/settings/public
 * @desc    Get public settings
 * @access  Public
 */
router.get('/public', settingsController.getPublicSettings);

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Admin
 */
router.get('/',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getAllSettings
);

/**
 * @route   GET /api/settings/notifications
 * @desc    Get notification settings
 * @access  Admin
 */
router.get('/notifications',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getNotificationSettings
);

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification settings
 * @access  Admin
 */
router.put('/notifications',
    authenticateToken,
    requirePermission('settings', 'update'),
    settingsController.updateNotificationSettings
);

/**
 * @route   GET /api/settings/email
 * @desc    Get email settings
 * @access  Admin
 */
router.get('/email',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getEmailSettings
);

/**
 * @route   GET /api/settings/sms
 * @desc    Get SMS settings
 * @access  Admin
 */
router.get('/sms',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getSmsSettings
);

/**
 * @route   GET /api/settings/:key
 * @desc    Get setting by key
 * @access  Admin
 */
router.get('/:key',
    authenticateToken,
    requirePermission('settings', 'read'),
    settingsController.getSetting
);

/**
 * @route   PUT /api/settings/:key
 * @desc    Update setting
 * @access  Admin
 */
router.put('/:key',
    authenticateToken,
    requirePermission('settings', 'update'),
    settingsValidators.update,
    settingsController.updateSetting
);

/**
 * @route   POST /api/settings/bulk
 * @desc    Bulk update settings
 * @access  Admin
 */
router.post('/bulk',
    authenticateToken,
    requirePermission('settings', 'update'),
    settingsController.bulkUpdateSettings
);

/**
 * @route   POST /api/settings
 * @desc    Create setting
 * @access  Super Admin
 */
router.post('/',
    authenticateToken,
    requirePermission('settings', 'create'),
    settingsValidators.create,
    settingsController.createSetting
);

/**
 * @route   DELETE /api/settings/:key
 * @desc    Delete setting
 * @access  Super Admin
 */
router.delete('/:key',
    authenticateToken,
    requirePermission('settings', 'delete'),
    settingsController.deleteSetting
);

module.exports = router;
