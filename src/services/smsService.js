
const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

/**
 * Initialize Twilio client with credentials
 */
const initializeTwilio = () => {
    try {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.warn(' Twilio credentials not found. SMS service will use mock mode.');
            return null;
        }

        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        console.log(' Twilio SMS service initialized');
        return twilioClient;
    } catch (error) {
        console.error(' Failed to initialize Twilio:', error.message);
        return null;
    }
};

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add + prefix if not present
    if (!phoneNumber.startsWith('+')) {
        // Assume US number if no country code and 10 digits
        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        }
        // Otherwise add + prefix
        return `+${cleaned}`;
    }
    
    return phoneNumber;
};

/**
 * Send verification code via SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} verificationCode - 6-digit verification code
 * @returns {Promise<Object>} - Result of SMS sending operation
 */
const sendVerificationSMS = async (phoneNumber, verificationCode) => {
    try {
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        
        // Mock mode for development/testing when Twilio is not configured
        if (!twilioClient) {
            console.log(' MOCK SMS MODE - Verification code would be sent to:', formattedPhoneNumber);
            console.log(' Verification Code:', verificationCode);
            
            return {
                success: true,
                message: 'Verification code sent successfully (mock mode)',
                mockMode: true,
                phoneNumber: formattedPhoneNumber,
                verificationCode: verificationCode // Only for mock mode
            };
        }

        // Create SMS message
        const messageBody = `Your verification code is: ${verificationCode}. This code will expire in 2 minutes. Do not share this code with anyone.`;

        // Send SMS using Twilio
        const message = await twilioClient.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhoneNumber
        });

        console.log(` SMS sent successfully to ${formattedPhoneNumber}. Message SID: ${message.sid}`);

        return {
            success: true,
            message: 'Verification code sent successfully',
            messageId: message.sid,
            phoneNumber: formattedPhoneNumber,
            status: message.status
        };

    } catch (error) {
        console.error(' Failed to send SMS:', error.message);
        
        // Handle specific Twilio errors
        let errorMessage = 'Failed to send verification code';
        let errorCode = 'SMS_SEND_FAILED';

        if (error.code === 21211) {
            errorMessage = 'Invalid phone number format';
            errorCode = 'INVALID_PHONE_NUMBER';
        } else if (error.code === 21408) {
            errorMessage = 'Permission to send SMS to this number denied';
            errorCode = 'SMS_PERMISSION_DENIED';
        } else if (error.code === 21610) {
            errorMessage = 'Phone number is unsubscribed from SMS';
            errorCode = 'PHONE_UNSUBSCRIBED';
        } else if (error.code === 20003) {
            errorMessage = 'Authentication failed - check Twilio credentials';
            errorCode = 'TWILIO_AUTH_FAILED';
        }

        return {
            success: false,
            message: errorMessage,
            error: errorCode,
            details: error.message
        };
    }
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Object} - Validation result
 */
const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) {
        return { isValid: false, message: 'Phone number is required' };
    }

    // Remove all non-digit characters for validation
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if phone number has reasonable length (7-15 digits)
    if (cleaned.length < 7 || cleaned.length > 15) {
        return { 
            isValid: false, 
            message: 'Phone number must be between 7 and 15 digits' 
        };
    }

    // Basic international phone number regex
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    if (!phoneRegex.test(formattedNumber.replace('+', ''))) {
        return { 
            isValid: false, 
            message: 'Please enter a valid phone number' 
        };
    }

    return { 
        isValid: true, 
        formattedNumber 
    };
};

/**
 * Get SMS service status
 * @returns {Object} - Service status information
 */
const getServiceStatus = () => {
    return {
        isInitialized: !!twilioClient,
        mockMode: !twilioClient,
        provider: 'Twilio',
        configuration: {
            hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
            hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
            hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER
        }
    };
};

// Initialize Twilio on module load
initializeTwilio();

module.exports = {
    sendVerificationSMS,
    validatePhoneNumber,
    formatPhoneNumber,
    getServiceStatus,
    initializeTwilio
};
