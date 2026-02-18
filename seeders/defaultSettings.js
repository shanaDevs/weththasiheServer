const { SystemSetting } = require('../models');

const settings = [
    // General
    { key: 'site_name', value: 'MediPharm B2B', label: 'Site Name', category: 'general', type: 'string', isPublic: true },
    { key: 'site_tagline', value: 'Bulk Medicine Supplier for Doctors', label: 'Site Tagline', category: 'general', type: 'string', isPublic: true },
    { key: 'company_name', value: 'MediPharm Pvt Ltd', label: 'Company Name', category: 'general', type: 'string', isPublic: true },
    { key: 'company_address', value: '', label: 'Company Address', category: 'general', type: 'string', isPublic: true },
    { key: 'company_phone', value: '', label: 'Company Phone', category: 'general', type: 'string', isPublic: true },
    { key: 'company_email', value: '', label: 'Company Email', category: 'general', type: 'string', isPublic: true },
    { key: 'gst_number', value: '', label: 'GST Number', category: 'general', type: 'string', isPublic: true },
    { key: 'default_currency', value: 'INR', label: 'Default Currency', category: 'general', type: 'string', isPublic: true },
    { key: 'currency_symbol', value: '₹', label: 'Currency Symbol', category: 'general', type: 'string', isPublic: true },

    // Notifications
    { key: 'email_enabled', value: 'true', label: 'Enable Email Notifications', category: 'notifications', type: 'boolean', sortOrder: 1 },
    { key: 'sms_enabled', value: 'true', label: 'Enable SMS Notifications', category: 'notifications', type: 'boolean', sortOrder: 2 },
    { key: 'order_notifications_enabled', value: 'true', label: 'Order Notifications', category: 'notifications', type: 'boolean', sortOrder: 3 },
    { key: 'stock_alerts_enabled', value: 'true', label: 'Low Stock Alerts', category: 'notifications', type: 'boolean', sortOrder: 4 },
    { key: 'verification_notifications_enabled', value: 'true', label: 'Doctor Verification Notifications', category: 'notifications', type: 'boolean', sortOrder: 5 },

    // Email Settings
    { key: 'smtp_host', value: '', label: 'SMTP Host', category: 'email', type: 'string', sortOrder: 1 },
    { key: 'smtp_port', value: '587', label: 'SMTP Port', category: 'email', type: 'number', sortOrder: 2 },
    { key: 'smtp_user', value: '', label: 'SMTP Username', category: 'email', type: 'string', sortOrder: 3 },
    { key: 'smtp_password', value: '', label: 'SMTP Password', category: 'email', type: 'string', sortOrder: 4 },
    { key: 'smtp_from_email', value: '', label: 'From Email', category: 'email', type: 'string', sortOrder: 5 },
    { key: 'smtp_from_name', value: 'MediPharm', label: 'From Name', category: 'email', type: 'string', sortOrder: 6 },

    // SMS Settings
    { key: 'sms_provider', value: 'twilio', label: 'SMS Provider', category: 'sms', type: 'string', sortOrder: 1, validationRules: JSON.stringify({ options: ['twilio', 'msg91', 'textlocal'] }) },
    { key: 'sms_api_key', value: '', label: 'SMS API Key', category: 'sms', type: 'string', sortOrder: 2 },
    { key: 'sms_api_secret', value: '', label: 'SMS API Secret', category: 'sms', type: 'string', sortOrder: 3 },
    { key: 'sms_sender_id', value: '', label: 'SMS Sender ID', category: 'sms', type: 'string', sortOrder: 4 },

    // Order Settings
    { key: 'min_order_value', value: '500', label: 'Minimum Order Value', category: 'orders', type: 'number', sortOrder: 1 },
    { key: 'free_shipping_threshold', value: '5000', label: 'Free Shipping Threshold', category: 'orders', type: 'number', sortOrder: 2 },
    { key: 'default_shipping_charge', value: '100', label: 'Default Shipping Charge', category: 'orders', type: 'number', sortOrder: 3 },
    { key: 'order_cancellation_hours', value: '24', label: 'Order Cancellation Window (hours)', category: 'orders', type: 'number', sortOrder: 4 },
    { key: 'require_doctor_verification', value: 'true', label: 'Require Doctor Verification for Orders', category: 'orders', type: 'boolean', sortOrder: 5 },
    { key: 'delivery_ranges', value: '[]', label: 'Delivery Charge Ranges', category: 'orders', type: 'json', sortOrder: 10 },


    // Inventory Settings
    { key: 'default_low_stock_threshold', value: '10', label: 'Default Low Stock Threshold', category: 'inventory', type: 'number', sortOrder: 1 },
    { key: 'enable_stock_reservation', value: 'true', label: 'Enable Stock Reservation', category: 'inventory', type: 'boolean', sortOrder: 2 },
    { key: 'reservation_timeout_minutes', value: '30', label: 'Reservation Timeout (minutes)', category: 'inventory', type: 'number', sortOrder: 3 },
    { key: 'track_batch_numbers', value: 'true', label: 'Track Batch Numbers', category: 'inventory', type: 'boolean', sortOrder: 4 },
    { key: 'expiry_alert_days', value: '90', label: 'Expiry Alert Days', category: 'inventory', type: 'number', sortOrder: 5 },

    // Doctor Credit Settings
    { key: 'default_credit_limit', value: '50000', label: 'Default Credit Limit', category: 'credit', type: 'number', sortOrder: 1 },
    { key: 'default_payment_terms', value: '30', label: 'Default Payment Terms (days)', category: 'credit', type: 'number', sortOrder: 2 },
    { key: 'enable_credit_orders', value: 'true', label: 'Enable Credit Orders', category: 'credit', type: 'boolean', sortOrder: 3 },

    // Tax Settings
    { key: 'default_tax_enabled', value: 'true', label: 'Enable Tax by Default', category: 'tax', type: 'boolean', sortOrder: 1 },
    { key: 'default_tax_percentage', value: '18', label: 'Default Tax Percentage', category: 'tax', type: 'number', sortOrder: 2, validationRules: JSON.stringify({ min: 0, max: 100 }) },
    { key: 'tax_inclusive_pricing', value: 'false', label: 'Tax Inclusive Pricing', category: 'tax', type: 'boolean', sortOrder: 3 },
];

async function seedSettings() {
    console.log('Seeding system settings...');

    try {
        for (const setting of settings) {
            await SystemSetting.findOrCreate({
                where: { key: setting.key },
                defaults: {
                    ...setting,
                    displayName: setting.label,
                    dataType: setting.type,
                    isEditable: true
                }
            });
        }

        console.log(`Seeded ${settings.length} settings`);
    } catch (error) {
        console.error('Error seeding settings:', error);
        throw error;
    }
}

module.exports = seedSettings;
