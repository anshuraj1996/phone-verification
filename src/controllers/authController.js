
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendVerificationSMS } = require('../services/smsService');
const { formatApiResponse } = require('../utils/validation');

/**
 * Register a new user with phone number
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findByPhoneNumber(phoneNumber);
        if (existingUser) {
            return res.status(409).json(
                formatApiResponse(
                    false, 
                    'User with this phone number already exists',
                    null,
                    'USER_ALREADY_EXISTS'
                )
            );
        }

        // Create new user
        const userData = {
            phoneNumber,
            isPhoneVerified: false,
            isActive: true
        };

        // Add password if provided
        if (password) {
            userData.password = password;
        }

        const user = new User(userData);
        await user.save();

        // Generate JWT token
        const token = generateToken(user);

        console.log(`New user registered with phone: ${phoneNumber}`);

        res.status(201).json(
            formatApiResponse(
                true,
                'User registered successfully. Please verify your phone number.',
                {
                    user: {
                        id: user._id,
                        phoneNumber: user.phoneNumber,
                        isPhoneVerified: user.isPhoneVerified,
                        createdAt: user.createdAt
                    },
                    token,
                    nextStep: 'phone_verification'
                }
            )
        );

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json(
                formatApiResponse(
                    false,
                    'Phone number already registered',
                    null,
                    'DUPLICATE_PHONE_NUMBER'
                )
            );
        }

        res.status(500).json(
            formatApiResponse(
                false,
                'Registration failed. Please try again.',
                null,
                'REGISTRATION_FAILED'
            )
        );
    }
};

/**
 * Login user with phone number and optional password
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Find user by phone number
        const user = await User.findByPhoneNumber(phoneNumber).select('+password');
        if (!user || !user.isActive) {
            return res.status(401).json(
                formatApiResponse(
                    false,
                    'Invalid phone number or user not found',
                    null,
                    'INVALID_CREDENTIALS'
                )
            );
        }

        // Check password if user has one and password is provided
        if (user.password && password) {
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json(
                    formatApiResponse(
                        false,
                        'Invalid password',
                        null,
                        'INVALID_PASSWORD'
                    )
                );
            }
        } else if (user.password && !password) {
            return res.status(401).json(
                formatApiResponse(
                    false,
                    'Password is required for this account',
                    null,
                    'PASSWORD_REQUIRED'
                )
            );
        }

        // Update last login time
        user.lastLoginAt = new Date();
        await user.save();

        // Generate JWT token
        const token = generateToken(user);

        console.log(` User logged in with phone: ${phoneNumber}`);

        res.status(200).json(
            formatApiResponse(
                true,
                'Login successful',
                {
                    user: {
                        id: user._id,
                        phoneNumber: user.phoneNumber,
                        isPhoneVerified: user.isPhoneVerified,
                        lastLoginAt: user.lastLoginAt
                    },
                    token,
                    nextStep: user.isPhoneVerified ? 'dashboard' : 'phone_verification'
                }
            )
        );

    } catch (error) {
        console.error(' Login error:', error);
        res.status(500).json(
            formatApiResponse(
                false,
                'Login failed. Please try again.',
                null,
                'LOGIN_FAILED'
            )
        );
    }
};

/**
 * Request phone verification code
 * POST /api/auth/verify-phone/request
 */
const requestPhoneVerification = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        // Find user by phone number
        let user = await User.findByPhoneNumber(phoneNumber)
            .select('+verificationCode +verificationCodeExpiry +verificationAttempts +lastVerificationAttempt');

        // If user doesn't exist, create a temporary user for verification
        if (!user) {
            user = new User({
                phoneNumber,
                isPhoneVerified: false,
                isActive: true
            });
        }

        // Check if user can request verification code
        const canRequest = user.canRequestVerificationCode();
        if (!canRequest.canRequest) {
            return res.status(429).json(
                formatApiResponse(
                    false,
                    canRequest.message,
                    null,
                    'RATE_LIMIT_EXCEEDED'
                )
            );
        }

        // Generate verification code
        const verificationCode = user.generateVerificationCode();
        await user.save();

        // Send SMS
        const smsResult = await sendVerificationSMS(phoneNumber, verificationCode);
        
        if (!smsResult.success) {
            return res.status(500).json(
                formatApiResponse(
                    false,
                    smsResult.message,
                    null,
                    smsResult.error
                )
            );
        }

        console.log(` Verification code sent to: ${phoneNumber}`);

        // Prepare response data
        const responseData = {
            phoneNumber: user.phoneNumber,
            message: smsResult.message,
            expiresIn: parseInt(process.env.VERIFICATION_CODE_EXPIRY) / 1000, // seconds
            attemptsRemaining: 5 - user.verificationAttempts
        };

        // Include verification code in response only for mock mode (development)
        if (smsResult.mockMode) {
            responseData.verificationCode = smsResult.verificationCode;
            responseData.mockMode = true;
        }

        res.status(200).json(
            formatApiResponse(
                true,
                'Verification code sent successfully',
                responseData
            )
        );

    } catch (error) {
        console.error(' Phone verification request error:', error);
        res.status(500).json(
            formatApiResponse(
                false,
                'Failed to send verification code. Please try again.',
                null,
                'VERIFICATION_REQUEST_FAILED'
            )
        );
    }
};

/**
 * Verify phone number with code
 * POST /api/auth/verify-phone/confirm
 */
const confirmPhoneVerification = async (req, res) => {
    try {
        const { phoneNumber, verificationCode } = req.body;

        // Find user with verification data
        const user = await User.findByPhoneNumber(phoneNumber)
            .select('+verificationCode +verificationCodeExpiry +verificationAttempts');

        if (!user) {
            return res.status(404).json(
                formatApiResponse(
                    false,
                    'No verification request found for this phone number',
                    null,
                    'USER_NOT_FOUND'
                )
            );
        }

        // Verify the code
        const verificationResult = user.verifyCode(verificationCode);
        
        if (!verificationResult.success) {
            await user.save(); // Save any attempt tracking updates
            return res.status(400).json(
                formatApiResponse(
                    false,
                    verificationResult.message,
                    null,
                    'INVALID_VERIFICATION_CODE'
                )
            );
        }

        // Save the verified user
        await user.save();

        // Generate JWT token for the verified user
        const token = generateToken(user);

        console.log(` Phone verified successfully: ${phoneNumber}`);

        res.status(200).json(
            formatApiResponse(
                true,
                'Phone number verified successfully',
                {
                    user: {
                        id: user._id,
                        phoneNumber: user.phoneNumber,
                        isPhoneVerified: user.isPhoneVerified,
                        verifiedAt: new Date()
                    },
                    token,
                    nextStep: 'dashboard'
                }
            )
        );

    } catch (error) {
        console.error(' Phone verification confirm error:', error);
        res.status(500).json(
            formatApiResponse(
                false,
                'Verification failed. Please try again.',
                null,
                'VERIFICATION_CONFIRM_FAILED'
            )
        );
    }
};

/**
 * Get current user profile (protected route)
 * GET /api/auth/profile
 */
const getUserProfile = async (req, res) => {
    try {
        // User is available from auth middleware
        const user = req.user;

        res.status(200).json(
            formatApiResponse(
                true,
                'User profile retrieved successfully',
                {
                    user: {
                        id: user._id,
                        phoneNumber: user.phoneNumber,
                        isPhoneVerified: user.isPhoneVerified,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        lastLoginAt: user.lastLoginAt
                    }
                }
            )
        );

    } catch (error) {
        console.error(' Get profile error:', error);
        res.status(500).json(
            formatApiResponse(
                false,
                'Failed to retrieve user profile',
                null,
                'PROFILE_FETCH_FAILED'
            )
        );
    }
};

/**
 * Refresh JWT token (protected route)
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
    try {
        // User is available from auth middleware
        const user = req.user;

        // Generate new JWT token
        const newToken = generateToken(user);

        res.status(200).json(
            formatApiResponse(
                true,
                'Token refreshed successfully',
                {
                    token: newToken,
                    expiresIn: process.env.JWT_EXPIRES_IN
                }
            )
        );

    } catch (error) {
        console.error(' Token refresh error:', error);
        res.status(500).json(
            formatApiResponse(
                false,
                'Failed to refresh token',
                null,
                'TOKEN_REFRESH_FAILED'
            )
        );
    }
};

module.exports = {
    registerUser,
    loginUser,
    requestPhoneVerification,
    confirmPhoneVerification,
    getUserProfile,
    refreshToken
};
