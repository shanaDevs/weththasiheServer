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

// Set trust proxy before other middleware - important for Vercel
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];

        // If origin is null (like mobile apps/curl), or process.env.CORS_ORIGIN is '*', allow it
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin ${origin} is not allowed by CORS_ORIGIN setting: ${process.env.CORS_ORIGIN}`);
            callback(null, true); // Fallback to allowing in case of config issues during debugging
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

// Apply CORS early
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Set Referrer-Policy to address the user's error message
app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Welcome Route
app.get('/', (req, res) => {
    res.json({
        message: 'Medipharm API is running',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Swagger configuration
let swaggerSpec;
try {
    let rawSpec;
    try {
        rawSpec = require('./swagger-output.json');
        console.log('✅ Loaded auto-generated Swagger documentation.');
    } catch (e) {
        console.log('ℹ️ No swagger-output.json found, using swagger-jsdoc.');
    }

    if (rawSpec) {
        swaggerSpec = rawSpec;
    } else {
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'E-Commerce Medicine API',
                    version: '2.0.0',
                    description: 'Medipharm B2B RESTful API',
                },
                servers: [
                    { url: '/api', description: 'API Server' }
                ],
            },
            apis: ['./routes/**/*.js', './server.js'],
        };
        swaggerSpec = swaggerJsdoc(swaggerOptions);
    }
} catch (error) {
    console.error('❌ Failed to initialize Swagger spec:', error.message);
    swaggerSpec = { openapi: '3.0.0', info: { title: 'Error', version: '1.0.0' }, paths: {} };
}

// Swagger Documentation - Manual serving to avoid index.html/static asset issues on Vercel
const swaggerStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
    .swagger-ui { background-color: #0f172a; color: #e2e8f0; font-family: 'Outfit', sans-serif; }
    .swagger-ui .info { padding: 40px; background: rgba(30, 41, 59, 0.7); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); }
    .swagger-ui .topbar { display: none; }
`;

const swaggerOptions = {
    customCss: swaggerStyles,
    customSiteTitle: 'Medipharm API Docs',
    swaggerOptions: {
        persistAuthorization: true,
    }
};

app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', (req, res) => {
    res.send(swaggerUi.generateHTML(swaggerSpec, swaggerOptions));
});

// API Routes
app.use('/api', require('./routes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err.stack);

    // Ensure CORS headers are present even on errors
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on the server',
        diagnostics: {
            path: req.path,
            method: req.method,
            db_host: process.env.DB_HOST === 'localhost' ? 'localhost (Warning: Check Vercel Env Vars)' : 'configured'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
    try {
        console.log(`📡 Initialization: Checking database at ${process.env.DB_HOST}...`);

        // Sync database (only in non-production)
        const isVercel = process.env.VERCEL === '1';
        const isProduction = process.env.NODE_ENV === 'production' || isVercel;

        if (!isProduction) {
            await sequelize.authenticate();
            console.log('✅ Local Database connected.');

            console.log('🔄 Running database synchronization...');
            await sequelize.sync({ alter: false });

            // Re-importing seeders to ensure they are available
            const { seedDefaultRoles } = require('./seeders/defaultRoles');
            const { seedDefaultSuperAdmin } = require('./seeders/defaultUser');

            await seedDefaultRoles();
            await seedDefaultSuperAdmin();
            console.log('✅ Seeders completed.');
        } else {
            // On Vercel, we just check connection and move on
            sequelize.authenticate()
                .then(() => console.log('✅ Cloud Database connected.'))
                .catch(err => console.error('⚠️ Cloud Database connection failed during startup. Requests requiring database will fail.', err.message));
        }

        if (!isVercel) {
            app.listen(PORT, () => {
                console.log(`🚀 Server running on port: ${PORT}`);
                console.log(`📚 Documentation: http://localhost:${PORT}/api-docs`);
            });
        }
    } catch (error) {
        console.error('❌ Startup Error:', error);
        if (process.env.VERCEL !== '1') {
            process.exit(1);
        }
    }
};

// Start initialization
startServer();

module.exports = app;
