const { NotificationTemplate } = require('../models');

const templates = [
    // Order templates
    {
        name: 'Order Confirmation',
        code: 'order_confirmation',
        type: 'email',
        subject: 'Order Confirmed - {{order_number}}',
        body: `Dear {{customer_name}},

Thank you for your order!

Order Number: {{order_number}}
Order Date: {{order_date}}
Total Amount: {{currency}}{{order_total}}

Items:
{{order_items}}

Shipping Address:
{{shipping_address}}

We will notify you once your order is shipped.

Thank you for choosing {{company_name}}!`,
        placeholders: JSON.stringify(['customer_name', 'order_number', 'order_date', 'order_total', 'currency', 'order_items', 'shipping_address', 'company_name']),
        category: 'orders',
        isActive: true
    },
    {
        name: 'Order Confirmation SMS',
        code: 'order_confirmation_sms',
        type: 'sms',
        body: 'Your order {{order_number}} worth {{currency}}{{order_total}} has been placed successfully. Track at {{tracking_url}}',
        placeholders: JSON.stringify(['order_number', 'order_total', 'currency', 'tracking_url']),
        category: 'orders',
        isActive: true
    },
    {
        name: 'Order Shipped',
        code: 'order_shipped',
        type: 'email',
        subject: 'Your Order {{order_number}} has been shipped!',
        body: `Dear {{customer_name}},

Great news! Your order has been shipped.

Order Number: {{order_number}}
Tracking Number: {{tracking_number}}
Expected Delivery: {{expected_delivery}}

Track your order: {{tracking_url}}

Thank you for shopping with {{company_name}}!`,
        placeholders: JSON.stringify(['customer_name', 'order_number', 'tracking_number', 'expected_delivery', 'tracking_url', 'company_name']),
        category: 'orders',
        isActive: true
    },
    {
        name: 'Order Shipped SMS',
        code: 'order_shipped_sms',
        type: 'sms',
        body: 'Your order {{order_number}} has been shipped! Tracking: {{tracking_number}}. Expected delivery: {{expected_delivery}}',
        placeholders: JSON.stringify(['order_number', 'tracking_number', 'expected_delivery']),
        category: 'orders',
        isActive: true
    },
    {
        name: 'Order Delivered',
        code: 'order_delivered',
        type: 'email',
        subject: 'Order {{order_number}} Delivered!',
        body: `Dear {{customer_name}},

Your order has been delivered!

Order Number: {{order_number}}
Delivered On: {{delivery_date}}

We hope you are satisfied with your purchase. If you have any questions, please contact our support team.

Thank you for choosing {{company_name}}!`,
        placeholders: JSON.stringify(['customer_name', 'order_number', 'delivery_date', 'company_name']),
        category: 'orders',
        isActive: true
    },
    {
        name: 'Order Cancelled',
        code: 'order_cancelled',
        type: 'email',
        subject: 'Order {{order_number}} Cancelled',
        body: `Dear {{customer_name}},

Your order has been cancelled.

Order Number: {{order_number}}
Cancellation Reason: {{cancel_reason}}

If you did not request this cancellation, please contact our support team immediately.

Refund (if applicable) will be processed within 5-7 business days.

{{company_name}}`,
        placeholders: JSON.stringify(['customer_name', 'order_number', 'cancel_reason', 'company_name']),
        category: 'orders',
        isActive: true
    },

    // Doctor verification templates
    {
        name: 'Doctor Verification Pending',
        code: 'doctor_verification_pending',
        type: 'email',
        subject: 'Doctor Verification Submitted',
        body: `Dear Dr. {{doctor_name}},

Thank you for registering with {{company_name}}.

Your verification request has been received and is being reviewed. We will notify you once the verification is complete.

License Number: {{license_number}}

This usually takes 1-2 business days.

{{company_name}}`,
        placeholders: JSON.stringify(['doctor_name', 'company_name', 'license_number']),
        category: 'doctors',
        isActive: true
    },
    {
        name: 'Doctor Verification Approved',
        code: 'doctor_verification_approved',
        type: 'email',
        subject: 'Doctor Verification Approved - Welcome!',
        body: `Dear Dr. {{doctor_name}},

Congratulations! Your doctor verification has been approved.

You now have access to:
- Credit purchases up to {{currency}}{{credit_limit}}
- Payment terms of {{payment_terms}} days
- Bulk pricing on all medicines

Start shopping now!

{{company_name}}`,
        placeholders: JSON.stringify(['doctor_name', 'currency', 'credit_limit', 'payment_terms', 'company_name']),
        category: 'doctors',
        isActive: true
    },
    {
        name: 'Doctor Verification Rejected',
        code: 'doctor_verification_rejected',
        type: 'email',
        subject: 'Doctor Verification Update',
        body: `Dear Dr. {{doctor_name}},

We regret to inform you that your verification request could not be approved at this time.

Reason: {{rejection_reason}}

If you believe this is an error, please contact our support team with additional documentation.

{{company_name}}`,
        placeholders: JSON.stringify(['doctor_name', 'rejection_reason', 'company_name']),
        category: 'doctors',
        isActive: true
    },

    // Payment templates
    {
        name: 'Payment Received',
        code: 'payment_received',
        type: 'email',
        subject: 'Payment Received - {{order_number}}',
        body: `Dear {{customer_name}},

We have received your payment.

Order Number: {{order_number}}
Payment Amount: {{currency}}{{payment_amount}}
Payment Method: {{payment_method}}
Transaction ID: {{transaction_id}}

Thank you!

{{company_name}}`,
        placeholders: JSON.stringify(['customer_name', 'order_number', 'currency', 'payment_amount', 'payment_method', 'transaction_id', 'company_name']),
        category: 'payments',
        isActive: true
    },
    {
        name: 'Payment Due Reminder',
        code: 'payment_due_reminder',
        type: 'email',
        subject: 'Payment Reminder - Order {{order_number}}',
        body: `Dear {{customer_name}},

This is a reminder that payment for your order is due.

Order Number: {{order_number}}
Due Amount: {{currency}}{{due_amount}}
Due Date: {{due_date}}

Please make the payment at your earliest convenience.

{{company_name}}`,
        placeholders: JSON.stringify(['customer_name', 'order_number', 'currency', 'due_amount', 'due_date', 'company_name']),
        category: 'payments',
        isActive: true
    },

    // Stock alerts
    {
        name: 'Low Stock Alert',
        code: 'low_stock_alert',
        type: 'email',
        subject: 'Low Stock Alert - {{product_count}} Products',
        body: `Low Stock Alert

The following products are running low on stock:

{{product_list}}

Please review and restock as needed.

{{company_name}} Inventory System`,
        placeholders: JSON.stringify(['product_count', 'product_list', 'company_name']),
        category: 'inventory',
        isActive: true
    },
    {
        name: 'Expiry Alert',
        code: 'expiry_alert',
        type: 'email',
        subject: 'Product Expiry Alert - {{product_count}} Products',
        body: `Expiry Alert

The following products are expiring soon:

{{product_list}}

Please review and take necessary action.

{{company_name}} Inventory System`,
        placeholders: JSON.stringify(['product_count', 'product_list', 'company_name']),
        category: 'inventory',
        isActive: true
    },
    {
        name: 'Account Verification',
        code: 'account_verification',
        type: 'email',
        subject: 'Welcome to {{company_name}} - Verify Your Account',
        body: `Dear {{customer_name}},

Welcome to {{company_name}}! 

An account has been created for you. To get started, please set your password by clicking the link below:

{{verification_link}}

This link will expire in 24 hours.

If you did not expect this, please ignore this email.

Best regards,
The {{company_name}} Team`,
        placeholders: JSON.stringify(['customer_name', 'verification_link', 'company_name']),
        category: 'auth',
        isActive: true
    },
    {
        name: 'New Promotion Alert',
        code: 'new_promotion',
        type: 'email',
        subject: 'New Promotion Alert: {{promotion_name}}',
        body: `Dear {{doctor_name}},

We are excited to announce a new promotion at {{company_name}}!

{{promotion_name}}
{{promotion_description}}

Type: {{promotion_type}}
Benefit: {{discount_value}}
Valid Until: {{expiry_date}}

Check it out here: {{shop_url}}

Happy Shopping!
{{company_name}}`,
        placeholders: JSON.stringify(['doctor_name', 'promotion_name', 'promotion_description', 'promotion_type', 'discount_value', 'expiry_date', 'shop_url', 'company_name']),
        category: 'promotions',
        isActive: true
    },
    {
        name: 'New Promotion SMS',
        code: 'new_promotion_sms',
        type: 'sms',
        body: 'New offer: {{promotion_name}}! {{promotion_description}}. Valid until {{expiry_date}}. Shop now: {{shop_url}}',
        placeholders: JSON.stringify(['promotion_name', 'promotion_description', 'expiry_date', 'shop_url']),
        category: 'promotions',
        isActive: true
    },
    {
        name: 'Admin: New Order Alert',
        code: 'admin_new_order_alert',
        type: 'email',
        subject: 'New Order Received - {{order_number}}',
        body: `Hello Admin,

A new order has been placed on the system.

Order Number: {{order_number}}
Customer: {{customer_name}}
Number of Items: {{item_count}}
Total Amount: {{order_total}}

View Order: {{view_order_url}}

This is an automated notification.`,
        placeholders: JSON.stringify(['order_number', 'customer_name', 'item_count', 'order_total', 'view_order_url']),
        category: 'admin_alerts',
        isActive: true
    },
    {
        name: 'Admin: New Doctor Registration',
        code: 'admin_new_doctor_alert',
        type: 'email',
        subject: 'New Doctor Registration - Dr. {{doctor_name}}',
        body: `Hello Admin,

A new doctor has registered and is awaiting verification.

Doctor Name: Dr. {{doctor_name}}
License Number: {{license_number}}
Phone: {{phone}}
Email: {{email}}
Hospital/Clinic: {{hospital_clinic}}

View Doctor Details: {{view_doctor_url}}

This is an automated notification.`,
        placeholders: JSON.stringify(['doctor_name', 'license_number', 'phone', 'email', 'hospital_clinic', 'view_doctor_url']),
        category: 'admin_alerts',
        isActive: true
    },
    {
        name: 'Two Factor Authentication Code',
        code: 'two_factor_code',
        type: 'email',
        subject: 'Your 2FA Verification Code - {{company_name}}',
        body: `Dear {{customer_name}},

Your verification code for two-factor authentication is:

{{verification_code}}

This code will expire in {{expiry_time}}. If you did not request this code, please ignore this email and ensure your account is secure.

Best regards,
The {{company_name}} Team`,
        placeholders: JSON.stringify(['customer_name', 'verification_code', 'expiry_time', 'company_name']),
        category: 'auth',
        isActive: true
    }
];

async function seedNotificationTemplates() {
    console.log('Seeding notification templates...');

    try {
        for (const template of templates) {
            const templateData = {
                name: template.name,
                code: template.code,
                type: template.type,
                isActive: template.isActive,
                isSystem: true
            };

            if (template.type === 'email') {
                templateData.emailSubject = template.subject;
                templateData.emailBody = template.body;
            } else if (template.type === 'sms') {
                templateData.smsBody = template.body;
            }

            if (template.placeholders) {
                templateData.availablePlaceholders = JSON.parse(template.placeholders);
            }

            await NotificationTemplate.findOrCreate({
                where: { code: template.code, type: template.type },
                defaults: templateData
            });
        }

        console.log(`Seeded ${templates.length} notification templates`);
    } catch (error) {
        console.error('Error seeding notification templates:', error);
        throw error;
    }
}

module.exports = seedNotificationTemplates;
