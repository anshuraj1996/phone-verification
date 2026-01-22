/**
 * User Model
 * Defines the user schema with phone verification functionality
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic user information
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    
    // Password (optional)
    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters long']
    },
    
    // Phone verification status
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    
    // Verification code details
    verificationCode: {
        type: String,
        select: false 
    },
    
    verificationCodeExpiry: {
        type: Date,
        select: false
    },
    
    // Tracking verification attempts (prevent spam)
    verificationAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    
    lastVerificationAttempt: {
        type: Date,
        select: false
    },
    
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.verificationCode;
            delete ret.verificationCodeExpiry;
            delete ret.verificationAttempts;
            delete ret.lastVerificationAttempt;
            return ret;
        }
    }
});

// Index for better query performance
userSchema.index({ phoneNumber: 1 });
userSchema.index({ verificationCodeExpiry: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash password if it's modified or new
    if (!this.isModified('password') || !this.password) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate verification code
userSchema.methods.generateVerificationCode = function() {
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set verification code and expiry
    this.verificationCode = code;
    this.verificationCodeExpiry = new Date(Date.now() + parseInt(process.env.VERIFICATION_CODE_EXPIRY));
    this.verificationAttempts += 1;
    this.lastVerificationAttempt = new Date();
    
    return code;
};

// Instance method to verify code
userSchema.methods.verifyCode = function(code) {
    // Check if code exists and hasn't expired
    if (!this.verificationCode || !this.verificationCodeExpiry) {
        return { success: false, message: 'No verification code found' };
    }
    
    if (this.verificationCodeExpiry < new Date()) {
        return { success: false, message: 'Verification code has expired' };
    }
    
    if (this.verificationCode !== code) {
        return { success: false, message: 'Invalid verification code' };
    }
    
    // Code is valid - mark phone as verified and clear verification data
    this.isPhoneVerified = true;
    this.verificationCode = undefined;
    this.verificationCodeExpiry = undefined;
    this.verificationAttempts = 0;
    
    return { success: true, message: 'Phone number verified successfully' };
};

// Instance method to check if user can request new verification code
userSchema.methods.canRequestVerificationCode = function() {
    const maxAttempts = 5;
    const cooldownPeriod = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Check if user has exceeded max attempts
    if (this.verificationAttempts >= maxAttempts) {
        const timeSinceLastAttempt = Date.now() - this.lastVerificationAttempt.getTime();
        if (timeSinceLastAttempt < cooldownPeriod) {
            const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastAttempt) / 60000);
            return { 
                canRequest: false, 
                message: `Too many attempts. Please wait ${remainingTime} minutes before requesting a new code.` 
            };
        } else {
            // Reset attempts after cooldown period
            this.verificationAttempts = 0;
        }
    }
    
    return { canRequest: true };
};

// Static method to find user by phone number
userSchema.statics.findByPhoneNumber = function(phoneNumber) {
    return this.findOne({ phoneNumber });
};

// Static method to clean up expired verification codes
userSchema.statics.cleanupExpiredCodes = function() {
    return this.updateMany(
        { verificationCodeExpiry: { $lt: new Date() } },
        { 
            $unset: { 
                verificationCode: 1, 
                verificationCodeExpiry: 1 
            } 
        }
    );
};

module.exports = mongoose.model('User', userSchema);
