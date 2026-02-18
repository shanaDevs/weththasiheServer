const { NotificationTemplate, NotificationLog, SystemSetting } = require('../models');

/**
 * SMS Service - Handles all SMS notifications
 * Supports multiple providers: Twilio, MSG91, TextLocal, etc.
 */
class SMSService {
    static client = null;
    static provider = null;

    /**
     * Initialize SMS client based on configured provider
     */
    static async initClient() {
        const settings = await this.getSMSSettings();

        if (!settings.enabled) {
            console.log('SMS service is disabled');
            return null;
        }

        this.provider = settings.provider;

        // Initialize based on provider
        switch (settings.provider) {
            case 'twilio':
                return this.initTwilio(settings);
            case 'msg91':
                return this.initMSG91(settings);
            case 'textlocal':
                return this.initTextLocal(settings);
            default:
                console.log(`Unknown SMS provider: ${settings.provider}`);
                return null;
        }
    }

    /**
     * Initialize Twilio client
     */
    static async initTwilio(settings) {
        try {
            // Dynamic import for Twilio
            const twilio = require('twilio');
            this.client = twilio(settings.accountSid, settings.authToken);
            return this.client;
        } catch (error) {
            console.error('Failed to initialize Twilio:', error.message);
            return null;
        }
    }

    /**
     * Initialize MSG91 client
     */
    static async initMSG91(settings) {
        // MSG91 uses HTTP API, no client needed
        this.client = {
            provider: 'msg91',
            authKey: settings.authKey,
            senderId: settings.senderId
        };
        return this.client;
    }

    /**
     * Initialize TextLocal client
     */
    static async initTextLocal(settings) {
        this.client = {
            provider: 'textlocal',
            apiKey: settings.apiKey,
            sender: settings.sender
        };
        return this.client;
    }

    /**
     * Get SMS settings from system settings
     */
    static async getSMSSettings() {
        const defaultSettings = {
            enabled: process.env.SMS_ENABLED === 'true',
            provider: process.env.SMS_PROVIDER || 'twilio',
            // Twilio
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
            // MSG91
            authKey: process.env.MSG91_AUTH_KEY,
            senderId: process.env.MSG91_SENDER_ID,
            // TextLocal
            apiKey: process.env.TEXTLOCAL_API_KEY,
            sender: process.env.TEXTLOCAL_SENDER
        };

        try {
            const settings = await SystemSetting.findAll({
                where: { category: 'sms' }
            });

            const settingsMap = {};
            settings.forEach(s => {
                settingsMap[s.key] = this.parseSettingValue(s.value, s.dataType);
            });

            return {
                enabled: settingsMap['sms_enabled'] ?? defaultSettings.enabled,
                provider: settingsMap['sms_provider'] ?? defaultSettings.provider,
                accountSid: settingsMap['sms_twilio_account_sid'] ?? defaultSettings.accountSid,
                authToken: settingsMap['sms_twilio_auth_token'] ?? defaultSettings.authToken,
                fromNumber: settingsMap['sms_twilio_from_number'] ?? defaultSettings.fromNumber,
                authKey: settingsMap['sms_msg91_auth_key'] ?? defaultSettings.authKey,
                senderId: settingsMap['sms_msg91_sender_id'] ?? defaultSettings.senderId,
                apiKey: settingsMap['sms_textlocal_api_key'] ?? defaultSettings.apiKey,
                sender: settingsMap['sms_textlocal_sender'] ?? defaultSettings.sender
            };
        } catch (error) {
            console.error('Failed to get SMS settings:', error.message);
            return defaultSettings;
        }
    }

    /**
     * Parse setting value based on data type
     */
    static parseSettingValue(value, dataType) {
        if (value === null || value === undefined) return null;

        switch (dataType) {
            case 'boolean':
                return value === 'true' || value === true;
            case 'number':
                return parseFloat(value);
            case 'json':
            case 'array':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    /**
     * Send SMS using a template
     */
    static async sendTemplateSMS(options) {
        const {
            templateCode,
            to,
            toName = '',
            placeholders = {},
            userId = null,
            referenceType = null,
            referenceId = null,
            createdBy = null
        } = options;

        try {
            // Check if SMS is enabled
            const settings = await this.getSMSSettings();
            if (!settings.enabled) {
                console.log('SMS service disabled, skipping send');
                return { success: false, reason: 'SMS service disabled' };
            }

            // Get template
            const template = await NotificationTemplate.findOne({
                where: { code: templateCode, type: 'sms', isActive: true }
            });

            if (!template) {
                throw new Error(`SMS template not found: ${templateCode}`);
            }

            // Replace placeholders
            const message = this.replacePlaceholders(template.smsBody, placeholders);

            // Send SMS
            const result = await this.send({
                to,
                message
            });

            // Log the notification
            await NotificationLog.create({
                templateId: template.id,
                templateCode: template.code,
                type: 'sms',
                userId,
                recipientPhone: to,
                recipientName: toName,
                body: message,
                status: result.success ? 'sent' : 'failed',
                sentAt: result.success ? new Date() : null,
                failedAt: result.success ? null : new Date(),
                provider: this.provider,
                providerMessageId: result.messageId,
                providerResponse: result.response,
                errorMessage: result.error,
                referenceType,
                referenceId,
                metadata: { placeholders },
                createdBy
            });

            return result;
        } catch (error) {
            console.error('Failed to send template SMS:', error.message);

            // Log failed attempt
            await NotificationLog.create({
                templateCode,
                type: 'sms',
                userId,
                recipientPhone: to,
                recipientName: toName,
                status: 'failed',
                failedAt: new Date(),
                errorMessage: error.message,
                referenceType,
                referenceId,
                createdBy
            });

            return { success: false, error: error.message };
        }
    }

    /**
     * Send raw SMS
     */
    static async send(options) {
        const { to, message } = options;

        const settings = await this.getSMSSettings();
        if (!settings.enabled) {
            return { success: false, reason: 'SMS service disabled' };
        }

        await this.initClient();

        if (!this.client) {
            return { success: false, error: 'SMS client not initialized' };
        }

        switch (this.provider) {
            case 'twilio':
                return this.sendViaTwilio(to, message, settings);
            case 'msg91':
                return this.sendViaMSG91(to, message, settings);
            case 'textlocal':
                return this.sendViaTextLocal(to, message, settings);
            default:
                return { success: false, error: `Unknown provider: ${this.provider}` };
        }
    }

    /**
     * Send SMS via Twilio
     */
    static async sendViaTwilio(to, message, settings) {
        try {
            const result = await this.client.messages.create({
                body: message,
                from: settings.fromNumber,
                to: this.formatPhoneNumber(to)
            });

            return {
                success: true,
                messageId: result.sid,
                response: result
            };
        } catch (error) {
            console.error('Twilio SMS failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send SMS via MSG91
     */
    static async sendViaMSG91(to, message, settings) {
        try {
            const axios = require('axios');
            
            const response = await axios.get('https://api.msg91.com/api/sendhttp.php', {
                params: {
                    authkey: settings.authKey,
                    mobiles: this.formatPhoneNumber(to, false),
                    message: message,
                    sender: settings.senderId,
                    route: 4, // Transactional route
                    country: 91 // India
                }
            });

            return {
                success: true,
                messageId: response.data,
                response: response.data
            };
        } catch (error) {
            console.error('MSG91 SMS failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send SMS via TextLocal
     */
    static async sendViaTextLocal(to, message, settings) {
        try {
            const axios = require('axios');
            
            const response = await axios.post('https://api.textlocal.in/send/', null, {
                params: {
                    apikey: settings.apiKey,
                    numbers: this.formatPhoneNumber(to, false),
                    message: message,
                    sender: settings.sender
                }
            });

            return {
                success: response.data.status === 'success',
                messageId: response.data.message_id,
                response: response.data
            };
        } catch (error) {
            console.error('TextLocal SMS failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Replace placeholders in template
     */
    static replacePlaceholders(template, placeholders) {
        if (!template) return '';

        let result = template;
        for (const [key, value] of Object.entries(placeholders)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, value ?? '');
        }
        return result;
    }

    /**
     * Format phone number for SMS
     */
    static formatPhoneNumber(phone, includePrefix = true) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // Add country code if not present (default to India)
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        return includePrefix ? '+' + cleaned : cleaned;
    }

    /**
     * Send order confirmation SMS
     */
    static async sendOrderConfirmation(order, user) {
        return this.sendTemplateSMS({
            templateCode: 'order_confirmation_sms',
            to: user.phone,
            toName: `${user.firstName} ${user.lastName}`,
            placeholders: {
                customer_name: user.firstName,
                order_number: order.orderNumber,
                order_total: order.total
            },
            userId: user.id,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send OTP SMS
     */
    static async sendOTP(phone, otp, purpose = 'verification') {
        return this.sendTemplateSMS({
            templateCode: 'otp_sms',
            to: phone,
            placeholders: {
                otp_code: otp,
                purpose: purpose,
                expiry_minutes: 10
            }
        });
    }

    /**
     * Send order status update SMS
     */
    static async sendOrderStatusUpdate(order, user, newStatus) {
        return this.sendTemplateSMS({
            templateCode: 'order_status_sms',
            to: user.phone,
            toName: `${user.firstName} ${user.lastName}`,
            placeholders: {
                customer_name: user.firstName,
                order_number: order.orderNumber,
                status: newStatus,
                tracking_number: order.trackingNumber || ''
            },
            userId: user.id,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Test SMS configuration
     */
    static async testConnection() {
        try {
            const settings = await this.getSMSSettings();
            
            if (!settings.enabled) {
                return { success: false, message: 'SMS service is disabled' };
            }

            await this.initClient();

            if (!this.client) {
                return { success: false, message: 'Failed to initialize SMS client' };
            }

            return { success: true, message: `SMS configuration is valid (Provider: ${this.provider})` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = SMSService;
