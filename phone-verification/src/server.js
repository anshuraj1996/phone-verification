/**
 * Main Server Application
 * Express.js server with phone verification API
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import configurations and routes
const { connectDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
        ];
        
        if (process.env.NODE_ENV === 'production') {
            // Add production domains here
            allowedOrigins.push('https://your-production-domain.com');
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware (custom)
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    
    // Log API requests in development
    if (process.env.NODE_ENV === 'development' && req.path.startsWith('/api/')) {
        console.log(` ${req.method} ${req.path} - ${req.ip} - ${req.requestTime}`);
    }
    
    next();
});

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Phone Verification API Server is running!',
        data: {
            service: 'Phone Verification API',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: req.requestTime,
            endpoints: {
                api: '/api',
                auth: '/api/auth',
                health: '/api/auth/health',
                frontend: '/'
            }
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);

// Serve frontend for non-API routes
app.get('*', (req, res) => {
    // Don't serve frontend for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            error: 'ENDPOINT_NOT_FOUND',
            availableEndpoints: [
                'GET /api/auth/health',
                'POST /api/auth/register',
                'POST /api/auth/login',
                'POST /api/auth/verify-phone/request',
                'POST /api/auth/verify-phone/confirm',
                'GET /api/auth/profile',
                'POST /api/auth/refresh-token',
                'GET /api/auth/dashboard'
            ]
        });
    }
    
    // Serve frontend HTML file
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(' Unhandled Error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        message: isDevelopment ? err.message : 'Internal server error',
        error: 'SERVER_ERROR',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString()
    });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint ${req.method} ${req.path} not found`,
        error: 'ENDPOINT_NOT_FOUND',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    console.log(` Received ${signal}. Graceful shutdown initiated...`);
    
    server.close(() => {
        console.log(' HTTP server closed.');
        
        // Close database connection
        require('mongoose').connection.close(false, () => {
            console.log(' MongoDB connection closed.');
            process.exit(0);
        });
    });
    
    // Force close server after 30 seconds
    setTimeout(() => {
        console.error(' Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

// Connect to database and start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();
        
        // Start the server
        const server = app.listen(PORT, () => {
            console.log(' ===============================================');
            console.log(`  Phone Verification API Server`);
            console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`  Server running on: http://localhost:${PORT}`);
            console.log(`  API Base URL: http://localhost:${PORT}/api`);
            console.log(`  Health Check: http://localhost:${PORT}/api/auth/health`);
            console.log(`  Frontend: http://localhost:${PORT}`);
            console.log(' ===============================================\n');
        });
        
        // Handle graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        return server;
        
    } catch (error) {
        console.error(' Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
let server;
if (require.main === module) {
    startServer().then(s => { server = s; });
}

module.exports = app;
