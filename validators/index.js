const { body, param, query } = require('express-validator');

/**
 * Product Validators
 */
exports.productValidators = {
    create: [
        body('name')
            .notEmpty().withMessage('Product name is required')
            .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
        body('sku')
            .notEmpty().withMessage('SKU is required')
            .isLength({ max: 100 }).withMessage('SKU must be max 100 characters'),
        body('categoryId')
            .notEmpty().withMessage('Category is required')
            .isInt().withMessage('Invalid category ID'),
        body('sellingPrice')
            .notEmpty().withMessage('Selling price is required')
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('mrp')
            .optional()
            .isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
        body('costPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
        body('stockQuantity')
            .optional()
            .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
        body('lowStockThreshold')
            .optional()
            .isInt({ min: 0 }).withMessage('Threshold must be a non-negative integer'),
        body('taxEnabled')
            .optional()
            .isBoolean().withMessage('Tax enabled must be boolean'),
        body('taxPercentage')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Tax must be 0-100'),
        body('genericName')
            .optional()
            .isLength({ max: 255 }).withMessage('Generic name max 255 characters'),
        body('manufacturer')
            .optional()
            .isLength({ max: 255 }).withMessage('Manufacturer max 255 characters'),
        body('expiryDate')
            .optional()
            .isISO8601().withMessage('Invalid expiry date format'),
        body('minOrderQuantity')
            .optional()
            .isInt({ min: 1 }).withMessage('Min order quantity must be at least 1'),
        body('maxOrderQuantity')
            .optional()
            .isInt({ min: 1 }).withMessage('Max order quantity must be at least 1'),
        body('bulkPrices')
            .optional()
            .isArray().withMessage('Bulk prices must be an array'),
        body('bulkPrices.*.minQuantity')
            .optional()
            .isInt({ min: 1 }).withMessage('Min quantity must be at least 1'),
        body('bulkPrices.*.price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be positive'),
        body('priority')
            .optional()
            .isInt({ min: 0 }).withMessage('Priority must be non-negative'),
        body('isFeatured')
            .optional()
            .isBoolean().withMessage('isFeatured must be a boolean')
    ],

    update: [
        param('id').isInt().withMessage('Invalid product ID'),
        body('name')
            .optional()
            .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
        body('sellingPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('stockQuantity')
            .optional()
            .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
        body('priority')
            .optional()
            .isInt({ min: 0 }).withMessage('Priority must be non-negative'),
        body('isFeatured')
            .optional()
            .isBoolean().withMessage('isFeatured must be a boolean')
    ],

    updateStock: [
        param('id').isInt().withMessage('Invalid product ID'),
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt().withMessage('Quantity must be an integer'),
        body('type')
            .notEmpty().withMessage('Type is required')
            .isIn(['add', 'subtract', 'set']).withMessage('Type must be add, subtract, or set'),
        body('reason')
            .optional()
            .isLength({ max: 255 }).withMessage('Reason max 255 characters')
    ]
};

/**
 * Category Validators
 */
exports.categoryValidators = {
    create: [
        body('name')
            .notEmpty().withMessage('Category name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('parentId')
            .optional()
            .isInt().withMessage('Invalid parent category ID'),
        body('description')
            .optional()
            .isLength({ max: 500 }).withMessage('Description max 500 characters'),
        body('sortOrder')
            .optional()
            .isInt({ min: 0 }).withMessage('Sort order must be non-negative'),
        body('image')
            .optional()
            .isString().isLength({ max: 500 }).withMessage('Image URL max 500 characters'),
        body('icon')
            .optional()
            .isString().isLength({ max: 20 }).withMessage('Icon max 20 characters')
    ],

    update: [
        param('id').isInt().withMessage('Invalid category ID'),
        body('name')
            .optional()
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('image')
            .optional()
            .isString().isLength({ max: 500 }).withMessage('Image URL max 500 characters'),
        body('icon')
            .optional()
            .isString().isLength({ max: 20 }).withMessage('Icon max 20 characters')
    ]
};

/**
 * Order Validators
 */
exports.orderValidators = {
    create: [
        body('paymentMethod')
            .notEmpty().withMessage('Payment method is required')
            .isIn(['cash', 'card', 'upi', 'net_banking', 'credit', 'cod', 'payhere'])
            .withMessage('Invalid payment method'),
        body('shippingAddressId')
            .optional()
            .isInt().withMessage('Invalid shipping address ID'),
        body('billingAddressId')
            .optional()
            .isInt().withMessage('Invalid billing address ID'),
        body('useCredit')
            .optional()
            .isBoolean().withMessage('Use credit must be boolean'),
        body('customerNotes')
            .optional()
            .isLength({ max: 1000 }).withMessage('Notes max 1000 characters'),
        body('note')
            .optional()
            .isLength({ max: 1000 }).withMessage('Notes max 1000 characters')
    ],

    updateStatus: [
        param('id').isInt().withMessage('Invalid order ID'),
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'])
            .withMessage('Invalid status'),
        body('notes')
            .optional()
            .isLength({ max: 500 }).withMessage('Notes max 500 characters'),
        body('trackingNumber')
            .optional()
            .isLength({ max: 100 }).withMessage('Tracking number max 100 characters')
    ]
};

/**
 * Cart Validators
 */
exports.cartValidators = {
    addItem: [
        body('productId')
            .notEmpty().withMessage('Product ID is required')
            .isInt().withMessage('Invalid product ID'),
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
    ],

    updateItem: [
        param('itemId').isInt().withMessage('Invalid cart item ID'),
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 0 }).withMessage('Quantity must be non-negative')
    ],

    applyCoupon: [
        body('couponCode')
            .notEmpty().withMessage('Coupon code is required')
            .isLength({ min: 3, max: 50 }).withMessage('Invalid coupon code')
    ]
};

/**
 * Doctor Validators
 */
exports.doctorValidators = {
    register: [
        body('licenseNumber')
            .notEmpty().withMessage('License number is required')
            .isLength({ min: 3, max: 50 }).withMessage('License number must be 3-50 characters'),
        body('specialization')
            .optional()
            .isLength({ max: 100 }).withMessage('Specialization max 100 characters'),
        body('qualification')
            .optional()
            .isLength({ max: 255 }).withMessage('Qualification max 255 characters'),
        body('hospitalClinic')
            .optional()
            .isLength({ max: 255 }).withMessage('Hospital/clinic max 255 characters'),
        body('clinicAddress')
            .optional()
            .isLength({ max: 500 }).withMessage('Clinic address max 500 characters'),
        body('clinicPhone')
            .optional()
            .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone format'),
        body('taxId')
            .optional()
            .isLength({ max: 50 }).withMessage('Tax ID max 50 characters'),
        body('gstNumber')
            .optional()
            .matches(/^[0-9A-Z]{15}$/).withMessage('Invalid GST number format')
    ],

    verify: [
        param('id').isInt().withMessage('Invalid doctor ID'),
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
        body('creditLimit')
            .optional()
            .isFloat({ min: 0 }).withMessage('Credit limit must be positive'),
        body('paymentTerms')
            .optional()
            .isInt({ min: 1, max: 90 }).withMessage('Payment terms must be 1-90 days')
    ]
};

/**
 * Address Validators
 */
exports.addressValidators = {
    create: [
        body('addressType')
            .optional()
            .isIn(['shipping', 'billing', 'both']).withMessage('Invalid address type'),
        body('contactName')
            .notEmpty().withMessage('Contact name is required')
            .isLength({ max: 100 }).withMessage('Name max 100 characters'),
        body('contactPhone')
            .notEmpty().withMessage('Contact phone is required')
            .matches(/^[0-9+\-\s()]{10,20}$/).withMessage('Invalid phone format'),
        body('addressLine1')
            .notEmpty().withMessage('Address line 1 is required')
            .isLength({ max: 255 }).withMessage('Address max 255 characters'),
        body('addressLine2')
            .optional()
            .isLength({ max: 255 }).withMessage('Address max 255 characters'),
        body('city')
            .notEmpty().withMessage('City is required')
            .isLength({ max: 100 }).withMessage('City max 100 characters'),
        body('state')
            .notEmpty().withMessage('State is required')
            .isLength({ max: 100 }).withMessage('State max 100 characters'),
        body('postalCode')
            .notEmpty().withMessage('Postal code is required')
            .matches(/^[0-9]{5,6}$/).withMessage('Postal code must be 5-6 digits'),
        body('country')
            .optional()
            .isLength({ max: 100 }).withMessage('Country max 100 characters'),
        body('isDefault')
            .optional()
            .isBoolean().withMessage('Is default must be boolean')
    ],

    update: [
        param('id').isInt().withMessage('Invalid address ID'),
        body('contactPhone')
            .optional()
            .matches(/^[0-9+\-\s()]{10,20}$/).withMessage('Invalid phone format'),
        body('postalCode')
            .optional()
            .matches(/^[0-9]{5,6}$/).withMessage('Postal code must be 5-6 digits')
    ]
};

/**
 * Tax Validators
 */
exports.taxValidators = {
    create: [
        body('name')
            .notEmpty().withMessage('Tax name is required')
            .isLength({ max: 100 }).withMessage('Name max 100 characters'),
        body('code')
            .notEmpty().withMessage('Tax code is required')
            .isLength({ max: 20 }).withMessage('Code max 20 characters')
            .matches(/^[A-Z0-9_]+$/).withMessage('Code must be uppercase alphanumeric'),
        body('percentage')
            .notEmpty().withMessage('Percentage is required')
            .isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
        body('type')
            .optional()
            .isIn(['percentage', 'fixed']).withMessage('Type must be percentage or fixed'),
        body('isInclusive')
            .optional()
            .isBoolean().withMessage('Is inclusive must be boolean'),
        body('isDefault')
            .optional()
            .isBoolean().withMessage('Is default must be boolean')
    ],

    update: [
        param('id').isInt().withMessage('Invalid tax ID'),
        body('percentage')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100')
    ]
};

/**
 * Discount Validators
 */
exports.discountValidators = {
    create: [
        body('name')
            .notEmpty().withMessage('Discount name is required')
            .isLength({ max: 100 }).withMessage('Name max 100 characters'),
        body('code')
            .optional()
            .isLength({ min: 3, max: 50 }).withMessage('Code must be 3-50 characters')
            .matches(/^[A-Z0-9]+$/).withMessage('Code must be uppercase alphanumeric'),
        body('type')
            .notEmpty().withMessage('Type is required')
            .isIn(['percentage', 'fixed', 'free_shipping']).withMessage('Invalid discount type'),
        body('value')
            .notEmpty().withMessage('Value is required')
            .isFloat({ min: 0 }).withMessage('Value must be positive'),
        body('minOrderValue')
            .optional()
            .isFloat({ min: 0 }).withMessage('Min order value must be positive'),
        body('maxDiscountAmount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Max discount must be positive'),
        body('usageLimit')
            .optional()
            .isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
        body('usageLimitPerUser')
            .optional()
            .isInt({ min: 1 }).withMessage('User limit must be at least 1'),
        body('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date'),
        body('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date')
    ],

    update: [
        param('id').isInt().withMessage('Invalid discount ID')
    ]
};

/**
 * Promotion Validators
 */
exports.promotionValidators = {
    create: [
        body('name')
            .notEmpty().withMessage('Promotion name is required')
            .isLength({ max: 100 }).withMessage('Name max 100 characters'),
        body('type')
            .notEmpty().withMessage('Type is required')
            .isIn(['flash_sale', 'bundle', 'bogo', 'percentage_off', 'fixed_off', 'bulk_discount'])
            .withMessage('Invalid promotion type'),
        body('startDate')
            .notEmpty().withMessage('Start date is required')
            .isISO8601().withMessage('Invalid start date'),
        body('endDate')
            .notEmpty().withMessage('End date is required')
            .isISO8601().withMessage('Invalid end date'),
        body('discountType')
            .optional()
            .isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
        body('discountValue')
            .optional()
            .isFloat({ min: 0 }).withMessage('Discount value must be positive'),
        body('priority')
            .optional()
            .isInt({ min: 0 }).withMessage('Priority must be non-negative')
    ],

    update: [
        param('id').isInt().withMessage('Invalid promotion ID'),
        body('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date'),
        body('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date')
    ]
};

/**
 * Payment Validators
 */
exports.paymentValidators = {
    addPayment: [
        param('orderId').isInt().withMessage('Invalid order ID'),
        body('amount')
            .notEmpty().withMessage('Amount is required')
            .isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
        body('method')
            .notEmpty().withMessage('Payment method is required')
            .isIn(['cash', 'card', 'upi', 'net_banking', 'cheque', 'dd'])
            .withMessage('Invalid payment method'),
        body('transactionId')
            .optional()
            .isLength({ max: 100 }).withMessage('Transaction ID max 100 characters')
    ],

    refund: [
        param('id').isInt().withMessage('Invalid payment ID'),
        body('amount')
            .optional()
            .isFloat({ min: 0.01 }).withMessage('Refund amount must be positive'),
        body('reason')
            .optional()
            .isLength({ max: 500 }).withMessage('Reason max 500 characters')
    ]
};

/**
 * Settings Validators
 */
exports.settingsValidators = {
    update: [
        param('key')
            .notEmpty().withMessage('Setting key is required')
            .isLength({ max: 100 }).withMessage('Key max 100 characters'),
        body('value')
            .exists().withMessage('Value is required')
    ],

    create: [
        body('key')
            .notEmpty().withMessage('Key is required')
            .matches(/^[a-z_]+$/).withMessage('Key must be lowercase with underscores'),
        body('value')
            .exists().withMessage('Value is required'),
        body('dataType')
            .optional()
            .isIn(['string', 'number', 'boolean', 'json']).withMessage('Invalid data type'),
        body('category')
            .optional()
            .isLength({ max: 50 }).withMessage('Category max 50 characters'),
        body('displayName')
            .optional()
            .isLength({ max: 100 }).withMessage('Display name max 100 characters')
    ]
};

/**
 * User Validators
 */
exports.userValidators = {
    login: [
        body('userName')
            .notEmpty().withMessage('Username/phone is required'),
        body('password')
            .notEmpty().withMessage('Password is required')
    ],

    register: [
        body('firstName')
            .notEmpty().withMessage('First name is required')
            .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
        body('lastName')
            .optional()
            .isLength({ max: 50 }).withMessage('Last name max 50 characters'),
        body('phone')
            .notEmpty().withMessage('Phone is required')
            .isLength({ min: 9, max: 11 }).withMessage('Phone must be 9-11 digits')
            .matches(/^\d+$/).withMessage('Phone must contain only digits'),
        body('userName')
            .notEmpty().withMessage('Username is required')
            .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username alphanumeric and underscore only'),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ],

    updateProfile: [
        body('firstName')
            .optional()
            .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
        body('lastName')
            .optional()
            .isLength({ max: 50 }).withMessage('Last name max 50 characters'),
        body('email')
            .optional()
            .isEmail().withMessage('Invalid email format')
    ],

    changePassword: [
        body('currentPassword')
            .notEmpty().withMessage('Current password is required'),
        body('newPassword')
            .notEmpty().withMessage('New password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ]
};

/**
 * Common Query Validators
 */
exports.queryValidators = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
    ],

    dateRange: [
        query('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date'),
        query('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date')
    ],

    search: [
        query('search')
            .optional()
            .isLength({ max: 100 }).withMessage('Search max 100 characters')
    ]
};
