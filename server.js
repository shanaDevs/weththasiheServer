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
    origin: (origin, callback) => {
        // If origin is null (like mobile apps/curl), or process.env.CORS_ORIGIN is '*', allow it
        // Note: returning true reflects the request's origin back to Access-Control-Allow-Origin
        const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];

        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin ${origin} is not allowed by CORS_ORIGIN setting: ${process.env.CORS_ORIGIN}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-Api-Version',
        'Cache-Control',
        'Pragma',
        'Expires'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 hours
};


// Middleware
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Set Referrer-Policy to address the user's error message
app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
let swaggerSpec;
try {
    // Attempt to load auto-generated swagger file
    swaggerSpec = require('./swagger-output.json');
    console.log('✅ Loaded auto-generated Swagger documentation.');
} catch (error) {
    // Fallback to swagger-jsdoc if output file doesn't exist
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'E-Commerce Medicine API',
                version: '2.0.0',
                description: 'A comprehensive B2B RESTful API for Bulk Medicine Sales. Features include Role-Based Access Control (RBAC), multi-tier audit logging, dynamic tax management, promotional engine, and integrated customer/doctor credit systems.',
                contact: {
                    name: 'API Support',
                    email: 'support@example.com'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            servers: [{ url: `http://localhost:${process.env.PORT || 3000}/api`, description: 'Development server' }],
            tags: [
                { name: 'Auth', description: 'Authentication and identity management' },
                { name: 'Users', description: 'User account and profile administration' },
                { name: 'Doctors', description: 'Specialized healthcare provider management and verification' },
                { name: 'Products', description: 'Medical catalog and inventory tracking' },
                { name: 'Categories', description: 'Classification and hierarchy of medical products' },
                { name: 'Cart', description: 'Real-time shopping cart and checkout preparation' },
                { name: 'Orders', description: 'Order lifecycle and fulfillment tracking' },
                { name: 'Payments', description: 'Financial transaction and invoice management' },
                { name: 'Taxes', description: 'Regional and category-based tax configuration' },
                { name: 'Discounts', description: 'Coupon and bulk discount logic' },
                { name: 'Promotions', description: 'Campaign and promotional offer management' },
                { name: 'Settings', description: 'Global system configuration and features' },
                { name: 'Audit Logs', description: 'System-wide activity and security audit trail' },
                { name: 'Health', description: 'System accessibility and performance monitoring' }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter your JWT token obtained from the Auth login endpoint'
                    }
                }
            }
        },
        apis: ['./routes/**/*.js', './server.js'],
    };
    swaggerSpec = swaggerJsdoc(swaggerOptions);
    console.log('ℹ️ Using JSDoc for Swagger documentation.');
}

// Swagger Documentation
const swaggerStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
    
    .swagger-ui {
        background-color: #0f172a;
        color: #e2e8f0;
        font-family: 'Outfit', sans-serif;
    }
    
    .swagger-ui .info {
        margin: 50px 0;
        padding: 40px;
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .swagger-ui .info .title {
        color: #38bdf8;
        font-size: 2.5em;
        font-weight: 700;
        letter-spacing: -0.02em;
        text-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
    }
    
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {
        color: #94a3b8;
        font-size: 1.1em;
        line-height: 1.6;
    }
    
    .swagger-ui .scheme-container {
        background: rgba(30, 41, 59, 0.8);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding: 30px 0;
        margin-bottom: 30px;
    }
    
    .swagger-ui .opblock {
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 15px;
    }
    
    .swagger-ui .opblock:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
    }
    
    .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.08); border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { background: rgba(59, 130, 246, 0.08); border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.08); border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.08); border-color: #ef4444; }
    .swagger-ui .opblock.opblock-patch { background: rgba(139, 92, 246, 0.08); border-color: #8b5cf6; }
    
    .swagger-ui .opblock .opblock-summary-method {
        border-radius: 8px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 8px 16px;
    }
    
    .swagger-ui .btn.authorize {
        border: 2px solid #38bdf8;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.2s;
    }
    
    .swagger-ui .btn.authorize:hover {
        background: #38bdf8;
        color: #0f172a;
    }
    
    .swagger-ui .topbar { display: none; }
    
    .swagger-ui section.models {
        background: rgba(30, 41, 59, 0.5);
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin: 40px 20px;
    }
    
    .swagger-ui section.models h4 {
        color: #38bdf8;
        font-weight: 600;
    }
    
    .swagger-ui .model-container {
        background: transparent;
    }
    
    .swagger-ui .model-box {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 10px;
        padding: 15px;
    }
    
    .swagger-ui table thead tr th {
        color: #e2e8f0;
        border-bottom: 2px solid #38bdf8;
    }
    
    .swagger-ui .parameter__name, .swagger-ui .parameter__type {
        color: #38bdf8;
    }
    
    .swagger-ui .parameter__in {
        color: #94a3b8;
        font-style: italic;
    }
    
    .swagger-ui .opblock-tag-section {
        background: rgba(30, 41, 59, 0.3);
        border-radius: 15px;
        padding: 10px;
        margin-bottom: 20px;
    }

    .swagger-ui .opblock-tag {
        font-family: 'Outfit', sans-serif;
        color: #f8fafc !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        padding: 15px 20px !important;
        transition: all 0.3s;
        cursor: pointer !important;
    }

    .swagger-ui .opblock-tag:hover {
        background: rgba(56, 189, 248, 0.1) !important;
    }

    .swagger-ui .opblock-tag small {
        color: #94a3b8 !important;
        font-weight: 300;
    }

    .swagger-ui .opblock-summary-path {
        color: #e2e8f0 !important;
        font-weight: 500 !important;
    }

    .swagger-ui .opblock-summary-description {
        color: #94a3b8 !important;
    }
    
    ::-webkit-scrollbar { width: 12px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(#38bdf8, #8b5cf6);
        border-radius: 10px;
        border: 3px solid #0f172a;
    }
`;

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: swaggerStyles,
    customSiteTitle: 'E-Commerce Medicine API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
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
                { name: 'verification_token', type: 'VARCHAR(255)', after: 'is_verified' },
                { name: 'two_factor_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'verification_token' },
                { name: 'two_factor_code', type: 'VARCHAR(255)', after: 'two_factor_enabled' },
                { name: 'two_factor_expires_at', type: 'DATETIME', after: 'two_factor_code' }
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
            try {
                await sequelize.query(`ALTER TABLE products ADD COLUMN brand VARCHAR(255) AFTER generic_name;`);
                console.log('✅ Manually added brand to products table.');
            } catch (err) {
                if (!err.message.includes('Duplicate column name')) {
                    console.warn('⚠️ Could not add brand to products:', err.message);
                }
            }

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

            // Manually add filter columns to discounts and promotions
            const filterColumns = [
                { name: 'agency_ids', type: 'JSON' },
                { name: 'manufacturers', type: 'JSON' },
                { name: 'batch_ids', type: 'JSON' }
            ];
            const filterTables = ['discounts', 'promotions'];

            for (const table of filterTables) {
                for (const col of filterColumns) {
                    try {
                        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type} DEFAULT NULL;`);
                        console.log(`✅ Manually added ${col.name} to ${table} table.`);
                    } catch (err) {
                        if (!err.message.includes('Duplicate column name')) {
                            console.warn(`⚠️ Could not add ${col.name} to ${table}:`, err.message);
                        }
                    }
                }
            }

            // Manually add doctor_id to payments table if missing
            try {
                const [results] = await sequelize.query("SHOW COLUMNS FROM payments LIKE 'doctor_id'");
                if (results.length === 0) {
                    await sequelize.query("ALTER TABLE payments ADD COLUMN doctor_id INTEGER DEFAULT NULL AFTER order_id;");
                    console.log('✅ Manually added doctor_id to payments table.');
                }
            } catch (err) {
                console.warn('⚠️ Could not update payments table:', err.message);
            }


            console.log('✅ Database models synchronized.');

            // Manually add brand_id to products and migrate data
            try {
                const [results] = await sequelize.query("SHOW COLUMNS FROM products LIKE 'brand_id'");
                if (results.length === 0) {
                    await sequelize.query("ALTER TABLE products ADD COLUMN brand_id INTEGER DEFAULT NULL AFTER brand;");
                    console.log('✅ Manually added brand_id to products table.');

                    // Migrate brands
                    const [products] = await sequelize.query("SELECT id, brand FROM products WHERE brand IS NOT NULL AND brand != ''");
                    if (products.length > 0) {
                        const uniqueBrands = [...new Set(products.map(p => p.brand))];
                        console.log(`Found ${uniqueBrands.length} unique brands to migrate.`);

                        for (const brandName of uniqueBrands) {
                            if (!brandName) continue;
                            const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

                            let brandId;
                            const [existing] = await sequelize.query("SELECT id FROM brands WHERE name = ?", { replacements: [brandName] });

                            if (existing.length > 0) {
                                brandId = existing[0].id;
                            } else {
                                const [res] = await sequelize.query(
                                    "INSERT INTO brands (name, slug, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
                                    { replacements: [brandName, slug + '-' + Date.now()] }
                                );
                                brandId = res;
                            }

                            await sequelize.query("UPDATE products SET brand_id = ? WHERE brand = ?", { replacements: [brandId, brandName] });
                        }
                        console.log('✅ Migrated brands to new table.');
                    }
                }
            } catch (err) {
                console.warn('⚠️ Brand migration warning:', err.message);
            }

            // Manually add brand_ids to promotions if missing
            try {
                const [results] = await sequelize.query("SHOW COLUMNS FROM promotions LIKE 'brand_ids'");
                if (results.length === 0) {
                    await sequelize.query("ALTER TABLE promotions ADD COLUMN brand_ids JSON DEFAULT NULL AFTER agency_ids;");
                    console.log('✅ Manually added brand_ids to promotions table.');
                }
            } catch (err) {
                console.warn('⚠️ Promotions update warning:', err.message);
            }

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

