const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);

if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn(`    Please ensure backend/.env file is properly configured`);
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Request logging middleware (for debugging)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/deploy', require('./routes/deploy'));
app.use('/api/history', require('./routes/history'));

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Risk Evaluation Dashboard API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            projects: '/api/projects',
            deploy: '/api/deploy'
        }
    });
});

// Health check with MongoDB status
app.get('/health', (req, res) => {
    const { isMongoDBConnected } = require('./config/db');
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: isMongoDBConnected() ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 Express Server Running`);
    console.log('='.repeat(60));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 ML Backend: ${process.env.ML_API_URL || 'http://localhost:8000/api'}`);
    console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Not configured'}`);
    console.log('='.repeat(60));
    console.log(`📝 Health Check: GET /health`);
    console.log(`📚 API Docs: Swagger available at /api/docs (if configured)`);
    console.log('='.repeat(60));
});

module.exports = app;
