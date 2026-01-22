
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {String} - JWT token
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id, 
            phoneNumber: user.phoneNumber,
            isPhoneVerified: user.isPhoneVerified
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN,
            issuer: 'phone-verification-api'
        }
    );
};

/**
 * Verify JWT token and authenticate user
 * Middleware function to protect routes
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                error: 'MISSING_TOKEN'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user in database
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or user not found',
                error: 'INVALID_TOKEN'
            });
        }

        // Add user to request object
        req.user = user;
        req.tokenData = decoded;
        
        next();
    } catch (error) {
        let message = 'Invalid token';
        let errorCode = 'INVALID_TOKEN';

        if (error.name === 'TokenExpiredError') {
            message = 'Token has expired';
            errorCode = 'TOKEN_EXPIRED';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Malformed token';
            errorCode = 'MALFORMED_TOKEN';
        }

        return res.status(401).json({
            success: false,
            message,
            error: errorCode
        });
    }
};

/**
 * Middleware to check if user's phone is verified
 * Should be used after authenticateToken
 */
const requirePhoneVerification = (req, res, next) => {
    if (!req.user || !req.user.isPhoneVerified) {
        return res.status(403).json({
            success: false,
            message: 'Phone number verification required',
            error: 'PHONE_NOT_VERIFIED'
        });
    }
    next();
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't block request if invalid/missing
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = user;
                req.tokenData = decoded;
            }
        }
    } catch (error) {
        // Silent fail for optional auth
        console.log('Optional auth failed:', error.message);
    }
    
    next();
};

/**
 * Refresh token middleware
 * Generates a new token if the current one is valid but close to expiry
 */
const refreshTokenIfNeeded = (req, res, next) => {
    if (req.tokenData && req.user) {
        const now = Math.floor(Date.now() / 1000);
        const tokenExp = req.tokenData.exp;
        const timeUntilExpiry = tokenExp - now;
        
        // If token expires in less than 1 hour, provide a new token
        if (timeUntilExpiry < 3600) {
            const newToken = generateToken(req.user);
            res.set('X-New-Token', newToken);
        }
    }
    next();
};

module.exports = {
    generateToken,
    authenticateToken,
    requirePhoneVerification,
    optionalAuth,
    refreshTokenIfNeeded
};
