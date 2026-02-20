const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { sequelize } = require('./config/database');

const app = express();

// Set trust proxy before other middleware - critical for Vercel
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
        // On Vercel, origin might be missing for some internal calls, but browser calls always have it
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Log CORS issues for debugging
            console.warn(`CORS Warning: Origin ${origin} not in allowed list: ${allowedOrigins}`);
            callback(null, true); // Fallback to allow during connection fixes
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

// Root route - handy check to see if API is alive
app.get('/', (req, res) => {
    res.json({
        name: 'Medipharm API',
        environment: process.env.NODE_ENV || 'development',
        db_configured: !!process.env.DB_HOST,
        timestamp: new Date().toISOString()
    });
});

// Swagger Setup - CDN Method (Vercel-Safe)
let swaggerSpec;
try {
    swaggerSpec = require('./swagger-output.json');
} catch (e) {
    console.error('❌ Swagger spec missing. Run npm run swagger.');
    swaggerSpec = { openapi: '3.0.0', info: { title: 'Missing API Docs', version: '1.0.0' }, paths: {} };
}

const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
const JS_BUNDLE = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js";
const JS_PRESET = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js";

// Serve Swagger with CDN links to avoid local asset fetching 500s/rewrites
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', (req, res) => {
    res.send(swaggerUi.generateHTML(swaggerSpec, {
        customCss: `
            .swagger-ui { background-color: #0f172a; color: #e2e8f0; }
            .swagger-ui .topbar { display: none; }
        `,
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

    // Ensure CORS headers on error responses
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        diagnostics: {
            host: process.env.DB_HOST,
            path: req.path,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        }
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 3000;

// Async Database Init (don't block the main thread for Vercel)
const initDb = async () => {
    try {
        const isVercel = process.env.VERCEL === '1';
        if (!isVercel) {
            await sequelize.authenticate();
            console.log('✅ Local Database Connected.');
        } else {
            // Lazy check
            sequelize.authenticate()
                .then(() => console.log('✅ Vercel Database Connected.'))
                .catch(err => console.error('⚠️ Vercel Database Connection Failed:', err.message));
        }
    } catch (err) {
        console.error('❌ Database Initialization Error:', err.message);
    }
};

initDb();

if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
