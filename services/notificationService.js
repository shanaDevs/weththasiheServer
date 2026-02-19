const EmailService = require('./emailService');
const SMSService = require('./smsService');
const { SystemSetting } = require('../models');

/**
 * Notification Service - Unified interface for all notifications
 */
class NotificationService {
    /**
     * Get notification settings
     */
    static async getNotificationSettings() {
        const defaultSettings = {
            emailEnabled: process.env.EMAIL_ENABLED === 'true',
            smsEnabled: process.env.SMS_ENABLED === 'true',
            pushEnabled: process.env.PUSH_ENABLED === 'true'
        };

        try {
            const settings = await SystemSetting.findAll({
                where: { category: 'notifications' }
            });

            const settingsMap = {};
            settings.forEach(s => {
                const value = s.dataType === 'boolean'
                    ? (s.value === 'true' || s.value === true)
                    : s.value;
                settingsMap[s.key] = value;
            });

            return {
                emailEnabled: settingsMap['notifications_email_enabled'] ?? settingsMap['email_enabled'] ?? defaultSettings.emailEnabled,
                smsEnabled: settingsMap['notifications_sms_enabled'] ?? settingsMap['sms_enabled'] ?? defaultSettings.smsEnabled,
                pushEnabled: settingsMap['notifications_push_enabled'] ?? settingsMap['push_enabled'] ?? defaultSettings.pushEnabled,
                adminEmail: (settingsMap['notifications_admin_notification_email'] ?? settingsMap['admin_notification_email']) || process.env.ADMIN_EMAIL,
                stockAlertsEnabled: (settingsMap['notifications_stock_alerts_enabled'] ?? settingsMap['stock_alerts_enabled']) !== false,
                orderAlertsEnabled: (settingsMap['notifications_order_notifications_enabled'] ?? settingsMap['order_notifications_enabled']) !== false,
                verificationAlertsEnabled: (settingsMap['notifications_verification_notifications_enabled'] ?? settingsMap['verification_notifications_enabled']) !== false
            };
        } catch (error) {
            console.error('Failed to get notification settings:', error.message);
            return defaultSettings;
        }
    }

    /**
     * Send notification using all enabled channels
     * @param {Object} options
     * @param {Object} options.user - User or Doctor object
     * @param {string} options.emailTemplate - Email template code
     * @param {string} options.smsTemplate - SMS template code
     * @param {Object} options.placeholders - Placeholder values
     * @param {string} options.referenceType - Reference type
     * @param {number} options.referenceId - Reference ID
     * @param {Array} options.channels - Specific channels to use (optional)
     */
    static async send(options) {
        const {
            user,
            emailTemplate,
            smsTemplate,
            placeholders = {},
            referenceType = null,
            referenceId = null,
            channels = null // null = use all enabled channels
        } = options;

        const settings = await this.getNotificationSettings();
        const results = {
            email: null,
            sms: null
        };

        // Determine which channels to use
        const useEmail = channels ? channels.includes('email') : settings.emailEnabled;
        const useSMS = channels ? channels.includes('sms') : settings.smsEnabled;

        // Check user preferences - handle both User (with doctorProfile) and Doctor objects
        // If it's a doctor object directly, it has emailNotifications property
        // If it's a user object, doctors have it in doctorProfile
        const userEmailEnabled = (user.emailNotifications ?? user.doctorProfile?.emailNotifications) !== false;
        const userSMSEnabled = (user.smsNotifications ?? user.doctorProfile?.smsNotifications) !== false;

        // Send email
        if (useEmail && userEmailEnabled && emailTemplate) {
            // Handle both User and Doctor objects
            const email = user.email || user.doctorProfile?.email;
            const firstName = user.firstName;
            const lastName = user.lastName || '';

            if (email) {
                results.email = await EmailService.sendTemplateEmail({
                    templateCode: emailTemplate,
                    to: email,
                    toName: `${firstName} ${lastName}`.trim(),
                    placeholders,
                    userId: user.id || user.userId,
                    referenceType,
                    referenceId
                });
            }
        }

        // Send SMS
        if (useSMS && userSMSEnabled && smsTemplate) {
            const phone = user.phone || user.doctorProfile?.phone;
            if (phone) {
                const firstName = user.firstName;
                const lastName = user.lastName || '';
                results.sms = await SMSService.sendTemplateSMS({
                    templateCode: smsTemplate,
                    to: phone,
                    toName: `${firstName} ${lastName}`.trim(),
                    placeholders,
                    userId: user.id || user.userId,
                    referenceType,
                    referenceId
                });
            }
        }

        return results;
    }

    /**
     * Send order confirmation notification
     */
    static async sendOrderConfirmation(order, user) {
        const placeholders = {
            customer_name: `${user.firstName} ${user.lastName}`,
            order_number: order.orderNumber,
            order_date: new Date(order.createdAt).toLocaleDateString(),
            order_total: order.total.toFixed(2),
            item_count: order.itemCount,
            payment_status: order.paymentStatus
        };

        return this.send({
            user,
            emailTemplate: 'order_confirmation',
            smsTemplate: 'order_confirmation_sms',
            placeholders,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send order status update notification
     */
    static async sendOrderStatusUpdate(order, user, previousStatus) {
        const placeholders = {
            customer_name: user.firstName,
            order_number: order.orderNumber,
            previous_status: this.formatStatus(previousStatus),
            new_status: this.formatStatus(order.status),
            tracking_number: order.trackingNumber || 'N/A'
        };

        return this.send({
            user,
            emailTemplate: 'order_status_update',
            smsTemplate: 'order_status_sms',
            placeholders,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send order shipped notification
     */
    static async sendOrderShipped(order, user) {
        const placeholders = {
            customer_name: user.firstName,
            order_number: order.orderNumber,
            tracking_number: order.trackingNumber,
            tracking_url: order.trackingUrl || '',
            expected_delivery: order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                : 'N/A'
        };

        return this.send({
            user,
            emailTemplate: 'order_shipped',
            smsTemplate: 'order_shipped_sms',
            placeholders,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send order delivered notification
     */
    static async sendOrderDelivered(order, user) {
        const placeholders = {
            customer_name: user.firstName,
            order_number: order.orderNumber,
            delivery_date: new Date(order.deliveredAt).toLocaleDateString()
        };

        return this.send({
            user,
            emailTemplate: 'order_delivered',
            smsTemplate: 'order_delivered_sms',
            placeholders,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send welcome notification for new doctor registration
     */
    static async sendWelcome(user, doctor) {
        const placeholders = {
            doctor_name: `Dr. ${user.firstName} ${user.lastName}`,
            license_number: doctor.licenseNumber,
            verification_status: doctor.isVerified ? 'Verified' : 'Pending Verification'
        };

        return this.send({
            user,
            emailTemplate: 'welcome_doctor',
            smsTemplate: 'welcome_doctor_sms',
            placeholders,
            referenceType: 'doctor',
            referenceId: doctor.id
        });
    }

    /**
     * Send account verification notification
     */
    static async sendAccountVerified(user, doctor) {
        const placeholders = {
            doctor_name: `Dr. ${user.firstName} ${user.lastName}`
        };

        return this.send({
            user,
            emailTemplate: 'account_verified',
            smsTemplate: 'account_verified_sms',
            placeholders,
            referenceType: 'doctor',
            referenceId: doctor.id
        });
    }

    /**
     * Send payment received notification
     */
    static async sendPaymentReceived(payment, order, user) {
        const placeholders = {
            customer_name: user.firstName,
            order_number: order.orderNumber,
            amount: payment.amount.toFixed(2),
            payment_method: payment.method,
            transaction_id: payment.transactionId || 'N/A'
        };

        return this.send({
            user,
            emailTemplate: 'payment_received',
            smsTemplate: 'payment_received_sms',
            placeholders,
            referenceType: 'payment',
            referenceId: payment.id
        });
    }

    /**
     * Send low stock alert (admin notification)
     */
    static async sendLowStockAlert(product, adminUsers) {
        const placeholders = {
            product_name: product.name,
            product_sku: product.sku,
            current_stock: product.stockQuantity,
            threshold: product.lowStockThreshold
        };

        const results = [];
        for (const user of adminUsers) {
            results.push(await this.send({
                user,
                emailTemplate: 'low_stock_alert',
                smsTemplate: null, // No SMS for admin alerts
                placeholders,
                referenceType: 'product',
                referenceId: product.id
            }));
        }

        return results;
    }

    /**
     * Send credit due reminder
     */
    static async sendCreditDueReminder(order, user, daysUntilDue) {
        const placeholders = {
            customer_name: `Dr. ${user.firstName} ${user.lastName}`,
            order_number: order.orderNumber,
            due_amount: order.dueAmount.toFixed(2),
            due_date: new Date(order.creditDueDate).toLocaleDateString(),
            days_until_due: daysUntilDue
        };

        return this.send({
            user,
            emailTemplate: 'credit_due_reminder',
            smsTemplate: 'credit_due_reminder_sms',
            placeholders,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send alert to admin(s)
     */
    static async sendAdminAlert(options) {
        const {
            emailTemplate,
            placeholders = {},
            referenceType = null,
            referenceId = null
        } = options;

        const settings = await this.getNotificationSettings();
        if (!settings.emailEnabled || !settings.adminEmail) return null;

        const adminEmails = settings.adminEmail.split(',').map(e => e.trim());
        const results = [];

        for (const email of adminEmails) {
            results.push(await EmailService.sendTemplateEmail({
                templateCode: emailTemplate,
                to: email,
                toName: 'Administrator',
                placeholders,
                referenceType,
                referenceId
            }));
        }

        return results;
    }

    /**
     * Send alert to admins for new order
     */
    static async sendNewOrderAlertToAdmins(order, user) {
        const settings = await this.getNotificationSettings();
        if (!settings.orderAlertsEnabled) return null;

        const placeholders = {
            customer_name: `${user.firstName} ${user.lastName || ''}`.trim(),
            order_number: order.orderNumber,
            order_total: order.total.toFixed(2),
            item_count: order.itemCount,
            view_order_url: `${process.env.ADMIN_FRONTEND_URL || 'http://localhost:3000/admin'}/orders/${order.id}`
        };

        return this.sendAdminAlert({
            emailTemplate: 'admin_new_order_alert',
            placeholders,
            referenceType: 'order',
            referenceId: order.id
        });
    }

    /**
     * Send alert to admins for new doctor registration
     */
    static async sendNewRegistrationAlertToAdmins(doctor) {
        const settings = await this.getNotificationSettings();
        if (!settings.verificationAlertsEnabled) return null;

        const placeholders = {
            doctor_name: `${doctor.firstName} ${doctor.lastName || ''}`.trim(),
            license_number: doctor.licenseNumber,
            phone: doctor.phone,
            email: doctor.email,
            hospital_clinic: doctor.hospitalClinic || 'N/A',
            view_doctor_url: `${process.env.ADMIN_FRONTEND_URL || 'http://localhost:3000/admin'}/doctors`
        };

        return this.sendAdminAlert({
            emailTemplate: 'admin_new_doctor_alert',
            placeholders,
            referenceType: 'doctor',
            referenceId: doctor.id
        });
    }

    /**
     * Format status for display
     */
    static formatStatus(status) {
        if (!status) return '';
        return status
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Test all notification channels
     */
    static async testAllChannels() {
        const results = {
            email: await EmailService.testConnection(),
            sms: await SMSService.testConnection()
        };

        return results;
    }
}

module.exports = NotificationService;
