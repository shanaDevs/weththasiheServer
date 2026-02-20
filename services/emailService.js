const nodemailer = require('nodemailer');
const { NotificationTemplate, NotificationLog, SystemSetting /* , User */ } = require('../models');
const PdfService = require('./pdfService');

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
            requireTLS: settings.port === 587,
            auth: {
                user: settings.user,
                pass: settings.password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        return this.transporter;
    }

    /**
     * Get email settings from system settings
     */
    static async getEmailSettings() {
        const defaultSettings = {
            enabled: (process.env.EMAIL_ENABLED === 'true') ||
                (!!process.env.EMAIL_USER && !!(process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)),
            host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            user: process.env.EMAIL_USER || process.env.SMTP_USER,
            password: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS,
            fromName: process.env.EMAIL_FROM_NAME || 'MediBulk',
            fromEmail: process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@medibulk.com'
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
            createdBy = null,
            attachments = []
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
                text: textBody,
                attachments
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
            console.log(`📧 Attempting to send email to: ${to} | Subject: ${subject}`);
            const transporter = await this.initTransporter();
            if (!transporter) {
                console.warn('⚠️ Email transporter not available. Tracking settings enabled?');
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
            console.log(`✅ Email sent successfully! MessageID: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('❌ Failed to send email:', error.message);
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
     * Send Purchase Order email to supplier with PDF attachment
     * @param {Object} po - Full PurchaseOrder with supplier + items included
     */
    static async sendPurchaseOrderEmail(po) {
        const supplier = po.supplier || {};
        const supplierEmail = supplier.email;

        if (!supplierEmail) {
            console.warn(`⚠️ Supplier has no email address. PO ${po.poNumber} not sent.`);
            return { success: false, reason: 'Supplier has no email address' };
        }

        const settings = await this.getEmailSettings();
        if (!settings.enabled) {
            console.warn('⚠️ Email service disabled, skipping PO email.');
            return { success: false, reason: 'Email service disabled' };
        }

        try {
            // Generate PDF buffer
            const pdfBuffer = await PdfService.generatePurchaseOrderPdfBuffer(po);

            const subject = `Purchase Order ${po.poNumber} from ${settings.fromName}`;

            const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">Purchase Order</h1>
    <p style="color:#94a3b8;margin:4px 0 0">${settings.fromName}</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
    <p style="font-size:15px">Dear <strong>${supplier.contactPerson || supplier.name || 'Supplier'}</strong>,</p>
    <p>Please find attached the Purchase Order <strong>${po.poNumber}</strong> from <strong>${settings.fromName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px">
      <tr style="background:#e2e8f0">
        <td style="padding:8px 12px;font-weight:bold">PO Number</td>
        <td style="padding:8px 12px">${po.poNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:bold">Order Date</td>
        <td style="padding:8px 12px">${new Date(po.orderDate || po.createdAt).toLocaleDateString()}</td>
      </tr>
      <tr style="background:#e2e8f0">
        <td style="padding:8px 12px;font-weight:bold">Expected Delivery</td>
        <td style="padding:8px 12px">${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'To be confirmed'}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:bold">Total Items</td>
        <td style="padding:8px 12px">${(po.items || []).length} line item(s)</td>
      </tr>
      <tr style="background:#e2e8f0">
        <td style="padding:8px 12px;font-weight:bold">Order Total</td>
        <td style="padding:8px 12px;font-size:16px;color:#0f172a"><strong>${po.totalAmount}</strong></td>
      </tr>
    </table>
    ${po.notes ? `<p style="background:#fff;border-left:3px solid #0f172a;padding:10px 16px;font-size:13px"><strong>Notes:</strong> ${po.notes}</p>` : ''}
    <p style="font-size:13px;color:#475569">Please review the attached PDF, confirm the order, and advise on the delivery schedule.</p>
    <p style="margin-top:24px;font-size:13px">Best regards,<br><strong>${settings.fromName}</strong><br>${settings.fromEmail}</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">This is an automated Purchase Order notification.</p>
</div>
`;

            const result = await this.send({
                to: supplierEmail,
                toName: supplier.contactPerson || supplier.name,
                subject,
                html,
                text: `Purchase Order ${po.poNumber}\nTotal: ${po.totalAmount}\nExpected: ${po.expectedDate || 'TBC'}\nPlease see attached PDF.`,
                attachments: [
                    {
                        filename: `PO_${po.poNumber}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            });

            // Log the notification
            await NotificationLog.create({
                templateCode: 'purchase_order_sent',
                type: 'email',
                recipientEmail: supplierEmail,
                recipientName: supplier.contactPerson || supplier.name,
                subject,
                body: html,
                status: result.success ? 'sent' : 'failed',
                sentAt: result.success ? new Date() : null,
                failedAt: result.success ? null : new Date(),
                provider: 'nodemailer',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                referenceType: 'purchase_order',
                referenceId: po.id,
                metadata: { poNumber: po.poNumber }
            }).catch(e => console.error('Failed to log PO notification:', e.message));

            return result;
        } catch (error) {
            console.error('❌ Failed to send PO email:', error.message);
            return { success: false, error: error.message };
        }
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

    /**
     * Send notification for stock receipt (partial or full)
     */
    static async sendStockReceiptNotification(po, receivedItems) {
        try {
            const settings = await this.getEmailSettings();
            const subject = `Stock Received for PO ${po.poNumber}`;
            const isFull = po.status === 'received';

            const itemsHtml = (receivedItems || []).map(item => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0">${item.productName || `Product #${item.productId}`}</td>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${item.quantity}</td>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${item.batchNumber || '—'}</td>
                </tr>
            `).join('');

            const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
    <div style="background:#059669;padding:24px 32px;border-radius:8px 8px 0 0;color:#fff">
        <h2 style="margin:0">${isFull ? 'Stock Fully Received' : 'Partial Stock Arrival'}</h2>
        <p style="margin:4px 0 0;opacity:0.8">Purchase Order: ${po.poNumber}</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
        <p>The following items have been received and added to inventory:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px">
            <thead style="background:#f8fafc">
                <tr>
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0">Product</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0">Qty Received</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0">Batch</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size:13px;color:#64748b">Current Order Status: <strong style="color:#0f172a">${po.status.replace('_', ' ').toUpperCase()}</strong></p>
        <p style="margin-top:24px;font-size:13px;font-style:italic;text-align:center">This is an internal inventory update notification.</p>
    </div>
</div>
            `;

            await this.send({
                to: settings.fromEmail,
                subject,
                html,
                text: `Stock receipt for PO ${po.poNumber}. Status: ${po.status}`
            });

        } catch (error) {
            console.error('Failed to send stock receipt notification:', error.message);
        }
    }
}

module.exports = EmailService;
