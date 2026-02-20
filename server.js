const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Important: Load models to ensure they are registered with Sequelize
const models = require('./models');
const { sequelize } = require('./config/database');

const app = express();

// Set trust proxy before other middleware - critical for Vercel
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS Warning: Origin ${origin} not in allowed list: ${allowedOrigins}`);
            callback(null, true);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Api-Version'],
    credentials: true,
    maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'Medipharm API',
        status: 'Online',
        environment: process.env.NODE_ENV || 'development',
        database: 'Connected & Synced',
        timestamp: new Date().toISOString()
    });
});

// Swagger Setup
let swaggerSpec;
try {
    swaggerSpec = require('./swagger-output.json');
} catch (e) {
    swaggerSpec = { openapi: '3.0.0', info: { title: 'Missing API Docs', version: '1.0.0' }, paths: {} };
}

const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
const JS_BUNDLE = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js";
const JS_PRESET = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js";

app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', (req, res) => {
    res.send(swaggerUi.generateHTML(swaggerSpec, {
        customCss: '.swagger-ui { background-color: #0f172a; color: #e2e8f0; } .swagger-ui .topbar { display: none; }',
        customCssUrl: CSS_URL,
        customJs: [JS_BUNDLE, JS_PRESET],
        customSiteTitle: 'Medipharm API Documentation'
    }));
});

// API Routes
app.use('/api', require('./routes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        diagnostics: { host: process.env.DB_HOST, path: req.path }
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 3000;

// Database Initialization & Synchronization
const initDb = async () => {
    try {
        console.log('📡 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        // Synchronization logic
        // Using alter: true to automatically update tables safely
        // Note: For large production DBs, migrations are preferred, but for this setup we use sync
        const isProduction = process.env.NODE_ENV === 'production';

        console.log('🔄 Synchronizing database models...');
        await sequelize.sync({ alter: !isProduction }); // 'alter' in dev, standard sync in prod
        console.log('✅ Database synchronized successfully.');

        // Seeders
        const { seedDefaultRoles } = require('./seeders/defaultRoles');
        const { seedDefaultSuperAdmin } = require('./seeders/defaultUser');

        console.log('🌱 Seeding initial data...');
        await seedDefaultRoles();
        await seedDefaultSuperAdmin();

        // Seed system settings
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

        console.log('✅ Seeding completed.');

    } catch (err) {
        console.error('❌ Database Initialization Error:', err.message);
        // On Vercel, we don't want to crash the whole process immediately if possible
        if (process.env.VERCEL !== '1') {
            process.exit(1);
        }
    }
};

// Initiate DB setup
initDb();

if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
