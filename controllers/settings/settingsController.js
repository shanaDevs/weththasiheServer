const { SystemSetting, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService } = require('../../services');

// Cache for settings
let settingsCache = null;
let cacheExpiry = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all settings (Admin)
 */
exports.getAllSettings = async (req, res, next) => {
    try {
        const { category, search } = req.query;

        const where = {};
        if (category) where.category = category;
        if (search) {
            where[Op.or] = [
                { key: { [Op.like]: `%${search}%` } },
                { displayName: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const settings = await SystemSetting.findAll({
            where,
            order: [['category', 'ASC'], ['sortOrder', 'ASC'], ['key', 'ASC']]
        });

        // Group by category
        const grouped = settings.reduce((acc, setting) => {
            const cat = setting.category || 'general';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(setting);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                settings,
                grouped
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get public settings
 */
exports.getPublicSettings = async (req, res, next) => {
    try {
        const settings = await SystemSetting.findAll({
            where: { isPublic: true },
            attributes: ['key', 'value', 'dataType']
        });

        const result = {};
        settings.forEach(s => {
            result[s.key] = this.parseValue(s.value, s.dataType);
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
 * Get setting by key
 */
exports.getSetting = async (req, res, next) => {
    try {
        const { key } = req.params;

        const setting = await SystemSetting.findOne({ where: { key } });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update setting
 */
exports.updateSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const setting = await SystemSetting.findOne({ where: { key } });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        if (!setting.isEditable) {
            return res.status(403).json({
                success: false,
                message: 'This setting is not editable'
            });
        }

        const oldValue = setting.value;

        // Validate value based on type
        const validationError = this.validateValue(value, setting);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        setting.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
        setting.updatedBy = req.user.id;
        await setting.save();

        // Clear cache
        this.clearCache();

        await AuditLogService.logUpdate(
            req, 'system_settings', 'SystemSetting', setting.id,
            { key, value: oldValue },
            { key, value: setting.value }
        );

        res.json({
            success: true,
            message: 'Setting updated successfully',
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk update settings
 */
exports.bulkUpdateSettings = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { settings } = req.body;

        if (!Array.isArray(settings) || settings.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Settings array is required'
            });
        }

        const results = [];
        const errors = [];

        for (const { key, value } of settings) {
            const setting = await SystemSetting.findOne({
                where: { key },
                transaction
            });

            if (!setting) {
                errors.push({ key, error: 'Setting not found' });
                continue;
            }

            if (!setting.isEditable) {
                errors.push({ key, error: 'Setting is not editable' });
                continue;
            }

            const validationError = this.validateValue(value, setting);
            if (validationError) {
                errors.push({ key, error: validationError });
                continue;
            }

            const oldValue = setting.value;
            setting.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
            setting.updatedBy = req.user.id;
            await setting.save({ transaction });

            results.push({ key, success: true });

            await AuditLogService.logUpdate(
                req, 'system_settings', 'SystemSetting', setting.id,
                { key, value: oldValue },
                { key, value: setting.value }
            );
        }

        await transaction.commit();

        // Clear cache
        this.clearCache();

        res.json({
            success: true,
            message: `${results.length} settings updated`,
            data: { results, errors }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Create setting (Admin)
 */
exports.createSetting = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { key } = req.body;

        // Check unique key
        const existing = await SystemSetting.findOne({ where: { key } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Setting key already exists'
            });
        }

        const setting = await SystemSetting.create({
            ...req.body,
            value: typeof req.body.value === 'object'
                ? JSON.stringify(req.body.value)
                : String(req.body.value),
            createdBy: req.user.id
        });

        this.clearCache();

        res.status(201).json({
            success: true,
            message: 'Setting created',
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete setting (Admin)
 */
exports.deleteSetting = async (req, res, next) => {
    try {
        const { key } = req.params;

        const setting = await SystemSetting.findOne({ where: { key } });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        // Optional: Add logic to prevent deletion of critical settings if needed

        await setting.destroy();
        this.clearCache();

        res.json({
            success: true,
            message: 'Setting deleted'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get notification settings
 */
exports.getNotificationSettings = async (req, res, next) => {
    try {
        const settings = await SystemSetting.findAll({
            where: {
                category: 'notifications'
            },
            order: [['sortOrder', 'ASC']]
        });

        const result = {};
        settings.forEach(s => {
            result[s.key] = this.parseValue(s.value, s.dataType);
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
 * Update notification settings
 */
exports.updateNotificationSettings = async (req, res, next) => {
    try {
        const { emailEnabled, smsEnabled, orderNotifications, stockAlerts } = req.body;

        const updates = [];

        if (emailEnabled !== undefined) {
            updates.push({ key: 'email_enabled', value: emailEnabled });
        }
        if (smsEnabled !== undefined) {
            updates.push({ key: 'sms_enabled', value: smsEnabled });
        }
        if (orderNotifications !== undefined) {
            updates.push({ key: 'order_notifications_enabled', value: orderNotifications });
        }
        if (stockAlerts !== undefined) {
            updates.push({ key: 'stock_alerts_enabled', value: stockAlerts });
        }

        req.body.settings = updates;
        return this.bulkUpdateSettings(req, res, next);
    } catch (error) {
        next(error);
    }
};

/**
 * Get email settings
 */
exports.getEmailSettings = async (req, res, next) => {
    try {
        const settings = await SystemSetting.findAll({
            where: {
                category: 'email'
            },
            order: [['sortOrder', 'ASC']]
        });

        const result = {};
        settings.forEach(s => {
            // Hide sensitive data
            if (s.key.includes('password') || s.key.includes('secret')) {
                result[s.key] = s.value ? '********' : '';
            } else {
                result[s.key] = this.parseValue(s.value, s.dataType);
            }
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
 * Get SMS settings
 */
exports.getSmsSettings = async (req, res, next) => {
    try {
        const settings = await SystemSetting.findAll({
            where: {
                category: 'sms'
            },
            order: [['sortOrder', 'ASC']]
        });

        const result = {};
        settings.forEach(s => {
            // Hide sensitive data
            if (s.key.includes('token') || s.key.includes('secret') || s.key.includes('key')) {
                result[s.key] = s.value ? '********' : '';
            } else {
                result[s.key] = this.parseValue(s.value, s.dataType);
            }
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
 * Helper: Get setting value with caching
 */
exports.getValue = async function (key, defaultValue = null) {
    // Check cache
    if (settingsCache && cacheExpiry > Date.now()) {
        return settingsCache[key] !== undefined ? settingsCache[key] : defaultValue;
    }

    // Refresh cache
    const settings = await SystemSetting.findAll();
    settingsCache = {};
    settings.forEach(s => {
        settingsCache[s.key] = this.parseValue(s.value, s.dataType);
    });
    cacheExpiry = Date.now() + CACHE_TTL;

    return settingsCache[key] !== undefined ? settingsCache[key] : defaultValue;
};

/**
 * Helper: Parse value by type
 */
exports.parseValue = function (value, dataType) {
    switch (dataType) {
        case 'number':
            return parseFloat(value);
        case 'boolean':
            return value === 'true' || value === '1' || value === true;
        case 'json':
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        default:
            return value;
    }
};

/**
 * Helper: Validate value
 */
exports.validateValue = function (value, setting) {
    if (setting.validationRules) {
        const rules = typeof setting.validationRules === 'string'
            ? JSON.parse(setting.validationRules)
            : setting.validationRules;

        if (rules.required && (value === null || value === undefined || value === '')) {
            return 'Value is required';
        }

        if (rules.min !== undefined && parseFloat(value) < rules.min) {
            return `Value must be at least ${rules.min}`;
        }

        if (rules.max !== undefined && parseFloat(value) > rules.max) {
            return `Value must be at most ${rules.max}`;
        }

        if (rules.options && !rules.options.includes(value)) {
            return `Value must be one of: ${rules.options.join(', ')}`;
        }
    }

    return null;
};

/**
 * Helper: Clear cache
 */
exports.clearCache = function () {
    settingsCache = null;
    cacheExpiry = null;
};
