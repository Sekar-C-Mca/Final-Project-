const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validate } = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        validate
    ],
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // Check if user already exists
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }

            // Create user
            user = await User.create({
                name,
                email,
                password
            });

            // Create token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRE
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('❌ Registration error:', error.message);
            console.error('   Stack:', error.stack);
            
            // Specific error handling
            if (error.name === 'MongooseError' || error.message.includes('MongoDB')) {
                return res.status(503).json({
                    success: false,
                    message: 'Database connection error. Please ensure MongoDB is running.',
                    error: 'MONGODB_CONNECTION_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            if (error.code === 11000) {
                // Duplicate key error
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered',
                    error: 'DUPLICATE_EMAIL'
                });
            }
            
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    error: 'VALIDATION_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Server error during registration',
                error: 'INTERNAL_SERVER_ERROR',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required'),
        validate
    ],
    async (req, res) => {
        try {
            const { email, password } = req.body;

            console.log(`🔐 Login attempt for email: ${email}`);

            // Check if MongoDB is connected
            if (!User.collection.conn.readyState) {
                console.error('❌ MongoDB not connected');
                return res.status(503).json({
                    success: false,
                    message: 'Database connection failed. Please check MongoDB connection.',
                    error: 'MONGODB_DISCONNECTED'
                });
            }

            // Check if user exists
            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                console.warn(`⚠️  Login failed: User not found - ${email}`);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            console.log(`✅ User found: ${email}`);

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                console.warn(`⚠️  Login failed: Invalid password - ${email}`);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            console.log(`✅ Password matched for: ${email}`);

            // Create token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRE
            });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('❌ Login error:', error.message);
            console.error('   Stack:', error.stack);
            
            // Specific error handling
            if (error.name === 'MongooseError' || error.message.includes('MongoDB')) {
                return res.status(503).json({
                    success: false,
                    message: 'Database connection error. Please ensure MongoDB is running.',
                    error: 'MONGODB_CONNECTION_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(500).json({
                    success: false,
                    message: 'Token generation failed. Please check JWT_SECRET in environment.',
                    error: 'JWT_ERROR',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Server error during login',
                error: 'INTERNAL_SERVER_ERROR',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
const { protect } = require('../middleware/auth');
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
