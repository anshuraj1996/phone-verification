/**
 * Authentication Routes
 * Defines all authentication-related API endpoints
 */

const express = require('express');
// const rateLimit = require('express-rate-limit');
const {
    registerUser,
    loginUser,
    requestPhoneVerification,
    confirmPhoneVerification,
    getUserProfile,
    refreshToken
} = require('../controllers/authController');

const { authenticateToken, requirePhoneVerification } = require('../middleware/auth');
const {
    handleValidationErrors,
    validateUserRegistration,
    validateUserLogin,
    validatePhoneVerificationRequest,
    validatePhoneVerificationConfirm,
    sanitizeRequest
} = require('../utils/validation');

const router = express.Router();

// Rate limiting configurations (temporarily disabled for Node 14 compatibility)
// const authRateLimit = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 10, // Limit each IP to 10 requests per windowMs for auth routes
//     message: {
//         success: false,
//         message: 'Too many authentication attempts. Please try again later.',
//         error: 'RATE_LIMIT_EXCEEDED'
//     },
//     standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//     legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

// const verificationRateLimit = rateLimit({
//     windowMs: 5 * 60 * 1000, // 5 minutes
//     max: 3, // Limit each IP to 3 verification requests per 5 minutes
//     message: {
//         success: false,
//         message: 'Too many verification requests. Please try again in 5 minutes.',
//         error: 'VERIFICATION_RATE_LIMIT_EXCEEDED'
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// });

// Public Routes (No authentication required)

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with phone number
 * @access  Public
 * @body    { phoneNumber, password? }
 */
router.post('/register',
    // authRateLimit, // temporarily disabled
    sanitizeRequest,
    validateUserRegistration,
    handleValidationErrors,
    registerUser
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with phone number and optional password
 * @access  Public
 * @body    { phoneNumber, password? }
 */
router.post('/login',
    // authRateLimit, // temporarily disabled
    sanitizeRequest,
    validateUserLogin,
    handleValidationErrors,
    loginUser
);

/**
 * @route   POST /api/auth/verify-phone/request
 * @desc    Request phone verification code via SMS
 * @access  Public
 * @body    { phoneNumber }
 */
router.post('/verify-phone/request',
    // verificationRateLimit, // temporarily disabled
    sanitizeRequest,
    validatePhoneVerificationRequest,
    handleValidationErrors,
    requestPhoneVerification
);

/**
 * @route   POST /api/auth/verify-phone/confirm
 * @desc    Confirm phone verification with code
 * @access  Public
 * @body    { phoneNumber, verificationCode }
 */
router.post('/verify-phone/confirm',
    // authRateLimit, // temporarily disabled
    sanitizeRequest,
    validatePhoneVerificationConfirm,
    handleValidationErrors,
    confirmPhoneVerification
);

// Protected Routes (Authentication required)

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private (requires valid JWT token)
 * @headers Authorization: Bearer <token>
 */
router.get('/profile',
    authenticateToken,
    getUserProfile
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private (requires valid JWT token)
 * @headers Authorization: Bearer <token>
 */
router.post('/refresh-token',
    authenticateToken,
    refreshToken
);

// Protected Routes (Authentication + Phone verification required)

/**
 * @route   GET /api/auth/dashboard
 * @desc    Get user dashboard (only for verified users)
 * @access  Private (requires valid JWT token + phone verification)
 * @headers Authorization: Bearer <token>
 */
router.get('/dashboard',
    authenticateToken,
    requirePhoneVerification,
    (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Welcome to your dashboard!',
            data: {
                user: {
                    id: req.user._id,
                    phoneNumber: req.user.phoneNumber,
                    isPhoneVerified: req.user.isPhoneVerified,
                    memberSince: req.user.createdAt,
                    lastLogin: req.user.lastLoginAt
                },
                features: [
                    'Phone verification completed',
                    'Secure API access enabled',
                    'Full account features available'
                ]
            },
            timestamp: new Date().toISOString()
        });
    }
);

// Health check route for authentication service
/**
 * @route   GET /api/auth/health
 * @desc    Health check for authentication service
 * @access  Public
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authentication service is running',
        data: {
            service: 'Phone Verification API',
            version: '1.0.0',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            endpoints: {
                public: [
                    'POST /api/auth/register',
                    'POST /api/auth/login',
                    'POST /api/auth/verify-phone/request',
                    'POST /api/auth/verify-phone/confirm'
                ],
                protected: [
                    'GET /api/auth/profile',
                    'POST /api/auth/refresh-token',
                    'GET /api/auth/dashboard'
                ]
            }
        }
    });
});

module.exports = router;
