/**
 * Request Validation Utilities
 * Contains validation schemas and helper functions
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * Middleware to process validation results and return formatted errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors
        });
    }
    
    next();
};

/**
 * Phone number validation rules
 */
const validatePhoneNumber = [
    body('phoneNumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .custom((value) => {
            // Remove all non-digit characters except +
            const cleaned = value.replace(/[^\d+]/g, '');
            
            // Check if it has reasonable length (7-15 digits)
            const digits = cleaned.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) {
                throw new Error('Phone number must be between 7 and 15 digits');
            }
            
            // Check if it starts with + and has valid format
            if (cleaned.startsWith('+') && digits.length >= 7) {
                return true;
            }
            
            // Allow numbers without + if they're reasonable length
            if (digits.length >= 10) {
                return true;
            }
            
            throw new Error('Please provide a valid phone number');
        })
        .withMessage('Please provide a valid phone number')
];

/**
 * Verification code validation rules
 */
const validateVerificationCode = [
    body('verificationCode')
        .notEmpty()
        .withMessage('Verification code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('Verification code must be exactly 6 digits')
        .isNumeric()
        .withMessage('Verification code must contain only numbers')
];

/**
 * User registration validation rules
 */
const validateUserRegistration = [
    ...validatePhoneNumber,
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

/**
 * User login validation rules
 */
const validateUserLogin = [
    ...validatePhoneNumber,
    body('password')
        .optional()
        .notEmpty()
        .withMessage('Password is required when provided')
];

/**
 * Phone verification request validation
 */
const validatePhoneVerificationRequest = [
    ...validatePhoneNumber
];

/**
 * Phone verification confirmation validation
 */
const validatePhoneVerificationConfirm = [
    ...validatePhoneNumber,
    ...validateVerificationCode
];

/**
 * JWT token validation (for headers)
 */
const validateJWTHeader = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Authorization header is required'
        });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authorization header must be in format: Bearer <token>'
        });
    }
    
    next();
};

/**
 * Sanitize phone number
 * Remove special characters and format consistently
 */
const sanitizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return phoneNumber;
    
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + for international format
    if (!cleaned.startsWith('+')) {
        // If it's a 10-digit US number, add +1
        if (cleaned.length === 10) {
            cleaned = '+1' + cleaned;
        } else {
            cleaned = '+' + cleaned;
        }
    }
    
    return cleaned;
};

/**
 * Middleware to sanitize request body
 */
const sanitizeRequest = (req, res, next) => {
    if (req.body.phoneNumber) {
        req.body.phoneNumber = sanitizePhoneNumber(req.body.phoneNumber);
    }
    
    // Trim whitespace from string fields
    Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim();
        }
    });
    
    next();
};

/**
 * Rate limiting validation
 * Check if request exceeds rate limits
 */
const validateRateLimit = (maxRequests = 5, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!requests.has(key)) {
            requests.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const requestData = requests.get(key);
        
        if (now > requestData.resetTime) {
            // Reset window
            requests.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        if (requestData.count >= maxRequests) {
            const resetTime = Math.ceil((requestData.resetTime - now) / 1000 / 60);
            return res.status(429).json({
                success: false,
                message: `Too many requests. Please try again in ${resetTime} minutes.`,
                error: 'RATE_LIMIT_EXCEEDED',
                retryAfter: resetTime
            });
        }
        
        requestData.count++;
        requests.set(key, requestData);
        next();
    };
};

/**
 * Generic API response formatter
 */
const formatApiResponse = (success, message, data = null, error = null) => {
    const response = {
        success,
        message,
        timestamp: new Date().toISOString()
    };
    
    if (data) {
        response.data = data;
    }
    
    if (error) {
        response.error = error;
    }
    
    return response;
};

module.exports = {
    handleValidationErrors,
    validatePhoneNumber,
    validateVerificationCode,
    validateUserRegistration,
    validateUserLogin,
    validatePhoneVerificationRequest,
    validatePhoneVerificationConfirm,
    validateJWTHeader,
    sanitizePhoneNumber,
    sanitizeRequest,
    validateRateLimit,
    formatApiResponse
};
