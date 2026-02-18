const nodemailer = require('nodemailer');
const { NotificationTemplate, NotificationLog, SystemSetting /* , User */ } = require('../models');

/**
 * Email Service - Handles all email notifications
 */
class EmailService {
    static transporter = null;

    /**
     * Initialize email transporter
     */
    static async initTransporter() {
        if (this.transporter) return this.transporter;

        const settings = await this.getEmailSettings();

        if (!settings.enabled) {
            console.log('Email service is disabled');
            return null;
        }

        this.transporter = nodemailer.createTransport({
            host: settings.host,
            port: settings.port,
            secure: settings.secure,
            auth: {
                user: settings.user,
                pass: settings.password
            }
        });

        return this.transporter;
    }

    /**
     * Get email settings from system settings
     */
    static async getEmailSettings() {
        const defaultSettings = {
            enabled: process.env.EMAIL_ENABLED === 'true',
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD,
            fromName: process.env.EMAIL_FROM_NAME || 'MediBulk',
            fromEmail: process.env.EMAIL_FROM_EMAIL || 'noreply@medibulk.com'
        };

        try {
            const settings = await SystemSetting.findAll({
                where: {
                    category: 'email'
                }
            });

            const settingsMap = {};
            settings.forEach(s => {
                settingsMap[s.key] = this.parseSettingValue(s.value, s.dataType);
            });

            return {
                enabled: settingsMap['email_enabled'] ?? defaultSettings.enabled,
                host: settingsMap['email_host'] ?? defaultSettings.host,
                port: settingsMap['email_port'] ?? defaultSettings.port,
                secure: settingsMap['email_secure'] ?? defaultSettings.secure,
                user: settingsMap['email_user'] ?? defaultSettings.user,
                password: settingsMap['email_password'] ?? defaultSettings.password,
                fromName: settingsMap['email_from_name'] ?? defaultSettings.fromName,
                fromEmail: settingsMap['email_from_email'] ?? defaultSettings.fromEmail
            };
        } catch (error) {
            console.error('Failed to get email settings:', error.message);
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
     * Send email using a template
     * @param {Object} options - Email options
     * @param {string} options.templateCode - Template code to use
     * @param {string} options.to - Recipient email
     * @param {string} options.toName - Recipient name
     * @param {Object} options.placeholders - Placeholder values
     * @param {number} options.userId - User ID (for logging)
     * @param {string} options.referenceType - Reference type (order, user, etc.)
     * @param {number} options.referenceId - Reference ID
     */
    static async sendTemplateEmail(options) {
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
            // Check if email is enabled
            const settings = await this.getEmailSettings();
            if (!settings.enabled) {
                console.log('Email service disabled, skipping send');
                return { success: false, reason: 'Email service disabled' };
            }

            // Get template
            const template = await NotificationTemplate.findOne({
                where: { code: templateCode, type: 'email', isActive: true }
            });

            if (!template) {
                throw new Error(`Email template not found: ${templateCode}`);
            }

            // Replace placeholders
            const subject = this.replacePlaceholders(template.emailSubject, placeholders);
            const htmlBody = this.replacePlaceholders(template.emailBody, placeholders);
            const textBody = template.emailBodyPlain 
                ? this.replacePlaceholders(template.emailBodyPlain, placeholders) 
                : this.stripHtml(htmlBody);

            // Send email
            const result = await this.send({
                to,
                toName,
                subject,
                html: htmlBody,
                text: textBody
            });

            // Log the notification
            await NotificationLog.create({
                templateId: template.id,
                templateCode: template.code,
                type: 'email',
                userId,
                recipientEmail: to,
                recipientName: toName,
                subject,
                body: htmlBody,
                status: result.success ? 'sent' : 'failed',
                sentAt: result.success ? new Date() : null,
                failedAt: result.success ? null : new Date(),
                provider: 'nodemailer',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                referenceType,
                referenceId,
                metadata: { placeholders },
                createdBy
            });

            return result;
        } catch (error) {
            console.error('Failed to send template email:', error.message);

            // Log failed attempt
            await NotificationLog.create({
                templateCode,
                type: 'email',
                userId,
                recipientEmail: to,
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
     * Send raw email
     */
    static async send(options) {
        const { to, toName, subject, html, text, attachments = [] } = options;

        try {
            const transporter = await this.initTransporter();
            if (!transporter) {
                return { success: false, reason: 'Email transporter not available' };
            }

            const settings = await this.getEmailSettings();

            const mailOptions = {
                from: `"${settings.fromName}" <${settings.fromEmail}>`,
                to: toName ? `"${toName}" <${to}>` : to,
                subject,
                html,
                text,
                attachments
            };

            const info = await transporter.sendMail(mailOptions);

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('Failed to send email:', error.message);
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
     * Strip HTML tags for plain text version
     */
    static stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Send order confirmation email
     */
    static async sendOrderConfirmation(order, user) {
        return this.sendTemplateEmail({
            templateCode: 'order_confirmation',
            to: user.email || user.doctorProfile?.email,
            toName: `${user.firstName} ${user.lastName}`,
            placeholders: {
                customer_name: `${user.firstName} ${user.lastName}`,
                order_number: order.orderNumber,
                order_date: new Date(order.createdAt).toLocaleDateString(),
                order_total: order.total,
                order_items: order.itemCount,
                payment_status: order.paymentStatus,
                shipping_address: this.formatAddress(order.shippingAddress)
            },
            userId: user.id,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send order status update email
     */
    static async sendOrderStatusUpdate(order, user, previousStatus) {
        return this.sendTemplateEmail({
            templateCode: 'order_status_update',
            to: user.email || user.doctorProfile?.email,
            toName: `${user.firstName} ${user.lastName}`,
            placeholders: {
                customer_name: `${user.firstName} ${user.lastName}`,
                order_number: order.orderNumber,
                previous_status: previousStatus,
                new_status: order.status,
                tracking_number: order.trackingNumber || 'N/A'
            },
            userId: user.id,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send password reset email
     */
    static async sendPasswordReset(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        return this.sendTemplateEmail({
            templateCode: 'password_reset',
            to: user.email,
            toName: `${user.firstName} ${user.lastName}`,
            placeholders: {
                customer_name: `${user.firstName} ${user.lastName}`,
                reset_link: resetUrl,
                expiry_time: '1 hour'
            },
            userId: user.id,
            referenceType: 'user',
            referenceId: user.id
        });
    }

    /**
     * Send welcome email for new doctors
     */
    static async sendWelcomeEmail(user, doctor) {
        return this.sendTemplateEmail({
            templateCode: 'welcome_doctor',
            to: doctor.email || user.email,
            toName: `Dr. ${user.firstName} ${user.lastName}`,
            placeholders: {
                doctor_name: `Dr. ${user.firstName} ${user.lastName}`,
                license_number: doctor.licenseNumber,
                verification_status: doctor.isVerified ? 'Verified' : 'Pending Verification'
            },
            userId: user.id,
            referenceType: 'doctor',
            referenceId: doctor.id
        });
    }

    /**
     * Format address object for email
     */
    static formatAddress(address) {
        if (!address) return 'N/A';
        if (typeof address === 'string') return address;

        const parts = [
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ].filter(Boolean);

        return parts.join(', ');
    }

    /**
     * Test email configuration
     */
    static async testConnection() {
        try {
            const transporter = await this.initTransporter();
            if (!transporter) {
                return { success: false, message: 'Email service is disabled' };
            }

            await transporter.verify();
            return { success: true, message: 'Email configuration is valid' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = EmailService;
