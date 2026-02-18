const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const { sequelize } = require('./config/database');
const { seedDefaultRoles } = require('./seeders/defaultRoles');
const { seedDefaultSuperAdmin } = require('./seeders/defaultUser');

const app = express();

// CORS Configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*', // Allow all origins or specify in .env
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-Commerce Medicine API',
            version: '1.0.0',
            description: 'B2B E-Commerce API for selling medicines in bulk to doctors. Features include role-based access control, audit logging, tax management, promotions, and notifications.',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}/api`,
                description: 'Development server',
            },
        ],
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management' },
            { name: 'Products', description: 'Product management' },
            { name: 'Categories', description: 'Category management' },
            { name: 'Cart', description: 'Shopping cart operations' },
            { name: 'Orders', description: 'Order management' },
            { name: 'Doctors', description: 'Doctor registration and management' },
            { name: 'Taxes', description: 'Tax configuration' },
            { name: 'Discounts', description: 'Discount and coupon management' },
            { name: 'Promotions', description: 'Promotional campaigns' },
            { name: 'Payments', description: 'Payment processing' },
            { name: 'Settings', description: 'System settings' },
            { name: 'Audit Logs', description: 'Audit trail and activity logs' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter JWT token obtained from login'
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: { type: 'array', items: { type: 'object' } }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        currentPage: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        totalItems: { type: 'integer' },
                        itemsPerPage: { type: 'integer' },
                        hasNextPage: { type: 'boolean' },
                        hasPrevPage: { type: 'boolean' }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        sku: { type: 'string' },
                        description: { type: 'string' },
                        shortDescription: { type: 'string' },
                        price: { type: 'number' },
                        costPrice: { type: 'number' },
                        quantity: { type: 'integer' },
                        minOrderQuantity: { type: 'integer' },
                        maxOrderQuantity: { type: 'integer' },
                        taxEnabled: { type: 'boolean' },
                        taxPercentage: { type: 'number' },
                        manufacturer: { type: 'string' },
                        requiresPrescription: { type: 'boolean' },
                        isActive: { type: 'boolean' }
                    }
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        description: { type: 'string' },
                        parentId: { type: 'integer', nullable: true },
                        isActive: { type: 'boolean' }
                    }
                },
                Order: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        orderNumber: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] },
                        subtotal: { type: 'number' },
                        taxAmount: { type: 'number' },
                        discountAmount: { type: 'number' },
                        shippingAmount: { type: 'number' },
                        totalAmount: { type: 'number' },
                        paymentStatus: { type: 'string', enum: ['pending', 'partial', 'paid', 'refunded'] }
                    }
                },
                CartItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        productId: { type: 'integer' },
                        quantity: { type: 'integer' },
                        unitPrice: { type: 'number' },
                        taxAmount: { type: 'number' },
                        totalPrice: { type: 'number' }
                    }
                },
                Doctor: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        licenseNumber: { type: 'string' },
                        specialization: { type: 'string' },
                        clinicName: { type: 'string' },
                        clinicAddress: { type: 'string' },
                        isVerified: { type: 'boolean' },
                        creditLimit: { type: 'number' },
                        currentCredit: { type: 'number' }
                    }
                },
                Tax: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        percentage: { type: 'number' },
                        description: { type: 'string' },
                        isActive: { type: 'boolean' }
                    }
                },
                Discount: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['percentage', 'fixed'] },
                        value: { type: 'number' },
                        minOrderAmount: { type: 'number' },
                        maxDiscountAmount: { type: 'number' },
                        usageLimit: { type: 'integer' },
                        usedCount: { type: 'integer' },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        isActive: { type: 'boolean' }
                    }
                },
                Promotion: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['buy_x_get_y', 'bundle', 'flash_sale', 'bulk_discount'] },
                        discountType: { type: 'string', enum: ['percentage', 'fixed'] },
                        discountValue: { type: 'number' },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        isActive: { type: 'boolean' }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        orderId: { type: 'integer' },
                        amount: { type: 'number' },
                        method: { type: 'string', enum: ['cash', 'card', 'upi', 'bank_transfer', 'credit'] },
                        status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
                        transactionId: { type: 'string' }
                    }
                },
                Setting: {
                    type: 'object',
                    properties: {
                        key: { type: 'string' },
                        value: { type: 'string' },
                        type: { type: 'string', enum: ['string', 'number', 'boolean', 'json'] },
                        category: { type: 'string' },
                        isPublic: { type: 'boolean' }
                    }
                },
                AuditLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        userName: { type: 'string' },
                        action: { type: 'string' },
                        module: { type: 'string' },
                        entityType: { type: 'string' },
                        entityId: { type: 'integer' },
                        description: { type: 'string' },
                        oldValues: { type: 'object' },
                        newValues: { type: 'object' },
                        ipAddress: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./routes/**/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger Documentation
const swaggerStyles = `
    .swagger-ui {
        background-color: #0f172a;
        color: #e2e8f0;
    }
    .swagger-ui .info .title {
        color: #38bdf8;
        font-family: 'Outfit', sans-serif;
    }
    .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table {
        color: #94a3b8;
    }
    .swagger-ui .scheme-container {
        background-color: #1e293b;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        padding: 20px 0;
    }
    .swagger-ui .opblock.opblock-post {
        background: rgba(16, 185, 129, 0.1);
        border-color: #10b981;
    }
    .swagger-ui .opblock.opblock-get {
        background: rgba(59, 130, 246, 0.1);
        border-color: #3b82f6;
    }
    .swagger-ui .opblock.opblock-put {
        background: rgba(245, 158, 11, 0.1);
        border-color: #f59e0b;
    }
    .swagger-ui .opblock.opblock-delete {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
    }
    .swagger-ui .opblock.opblock-patch {
        background: rgba(139, 92, 246, 0.1);
        border-color: #8b5cf6;
    }
    .swagger-ui .opblock .opblock-summary-method {
        border-radius: 6px;
        text-shadow: none;
    }
    .swagger-ui .topbar { 
        display: none; 
    }
    .swagger-ui .btn.authorize {
        border-color: #38bdf8;
        color: #38bdf8;
        background: transparent;
    }
    .swagger-ui .btn.authorize svg {
        fill: #38bdf8;
    }
    .swagger-ui section.models {
        border: 1px solid #334155;
        border-radius: 8px;
        margin: 20px;
    }
    .swagger-ui section.models.is-open h4 {
        border-bottom: 1px solid #334155;
    }
    .swagger-ui .model-container {
        background: #1e293b;
        margin: 0;
    }
    .swagger-ui .model-box {
        background: #1e293b;
    }
    .swagger-ui .opblock-description-wrapper p, 
    .swagger-ui .opblock-external-docs-wrapper p, 
    .swagger-ui .opblock-title_normal p {
        color: #94a3b8;
    }
    .swagger-ui .response-col_status,
    .swagger-ui .response-col_links {
        color: #e2e8f0;
    }
    .swagger-ui body {
        margin: 0;
        background: #0f172a;
    }
    ::-webkit-scrollbar {
        width: 10px;
    }
    ::-webkit-scrollbar-track {
        background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #475569;
    }
`;

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: swaggerStyles,
    customSiteTitle: 'E-Commerce Medicine API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        defaultModelsExpandDepth: 1
    }
}));

// Routes
/**
 * @swagger
 * /:
 *   get:
 *     summary: API root endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.get('/', (req, res) => {
    res.json({ message: 'User Login API is running' });
});

// API Routes
app.use('/api', require('./routes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync database (set to false in production)
        if (process.env.NODE_ENV !== 'production') {
            // Reverted alter: true due to "Too many keys" error in products table.
            // Using manual ALTER for specific changes instead.
            await sequelize.sync({ alter: false });

            // Manually add missing column to carts and orders tables
            const amountTables = ['carts', 'orders'];
            for (const table of amountTables) {
                try {
                    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN shipping_amount DECIMAL(12, 2) DEFAULT 0 AFTER discount_amount;`);
                    console.log(`✅ Manually added shipping_amount to ${table} table.`);
                } catch (err) {
                    if (!err.message.includes('Duplicate column name')) {
                        console.warn(`⚠️ Could not add shipping_amount to ${table}:`, err.message);
                    }
                }
            }

            // Manually add priority column to products table
            try {
                await sequelize.query(`ALTER TABLE products ADD COLUMN priority INTEGER DEFAULT 0 AFTER is_featured;`);
                console.log('✅ Manually added priority to products table.');
            } catch (err) {
                if (!err.message.includes('Duplicate column name')) {
                    console.warn('⚠️ Could not add priority to products:', err.message);
                }
            }

            // Manually add image and icon columns to categories table
            const categoryColumns = [
                { name: 'image', type: 'VARCHAR(500)', after: 'parent_id' },
                { name: 'icon', type: 'VARCHAR(100)', after: 'image' }
            ];
            for (const col of categoryColumns) {
                try {
                    await sequelize.query(`ALTER TABLE categories ADD COLUMN ${col.name} ${col.type} AFTER ${col.after};`);
                    console.log(`✅ Manually added ${col.name} to categories table.`);
                } catch (err) {
                    if (!err.message.includes('Duplicate column name')) {
                        console.warn(`⚠️ Could not add ${col.name} to categories:`, err.message);
                    }
                }
            }

            // Manually add columns to users table
            const userColumns = [
                { name: 'is_verified', type: 'BOOLEAN DEFAULT FALSE', after: 'is_deleted' },
                { name: 'verification_token', type: 'VARCHAR(255)', after: 'is_verified' }
            ];
            for (const col of userColumns) {
                try {
                    await sequelize.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type} AFTER ${col.after};`);
                    console.log(`✅ Manually added ${col.name} to users table.`);
                } catch (err) {
                    if (!err.message.includes('Duplicate column name')) {
                        console.warn(`⚠️ Could not add ${col.name} to users:`, err.message);
                    }
                }
            }

            // Manually add columns to doctors table
            try {
                await sequelize.query(`ALTER TABLE doctors ADD COLUMN license_photo VARCHAR(500) AFTER default_discount_percentage;`);
                console.log('✅ Manually added license_photo to doctors table.');
            } catch (err) {
                if (!err.message.includes('Duplicate column name')) {
                    console.warn('⚠️ Could not add license_photo to doctors:', err.message);
                }
            }

            // Manually add columns to products table
            const productExtraColumns = [
                { name: 'max_order_quantity', type: 'INTEGER', after: 'is_active' },
                { name: 'is_max_order_restricted', type: 'BOOLEAN DEFAULT FALSE', after: 'max_order_quantity' }
            ];
            for (const col of productExtraColumns) {
                try {
                    await sequelize.query(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type} AFTER ${col.after};`);
                    console.log(`✅ Manually added ${col.name} to products table.`);
                } catch (err) {
                    if (!err.message.includes('Duplicate column name')) {
                        console.warn(`⚠️ Could not add ${col.name} to products:`, err.message);
                    }
                }
            }

            console.log('✅ Database models synchronized.');

            // Seed default roles first
            await seedDefaultRoles();

            // Then seed default super admin user
            await seedDefaultSuperAdmin();

            // Seed system settings
            await seedSystemSettings();
        }

        // ... existing seed functions ...

        async function seedSystemSettings() {
            const { SystemSetting } = require('./models');

            const settings = [
                {
                    category: 'general',
                    key: 'delivery_ranges',
                    value: JSON.stringify([
                        { min: 0, max: 500, charge: 100 },
                        { min: 501, max: 2000, charge: 50 },
                        { min: 2001, max: null, charge: 0 }
                    ]),
                    dataType: 'json',
                    displayName: 'Delivery Charge Ranges',
                    isPublic: true
                }
            ];

            for (const s of settings) {
                await SystemSetting.findOrCreate({
                    where: { key: s.key },
                    defaults: s
                });
            }
            console.log('✅ System settings seeded.');
        }

        app.listen(PORT, () => {
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║          User Login API - Server Started                ║');
            console.log('╚══════════════════════════════════════════════════════════╝');
            console.log(`🚀 Server running on port: ${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log('══════════════════════════════════════════════════════════');
        });
    } catch (error) {
        console.error('❌ Unable to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;

