
const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @returns {Promise} - Returns a promise that resolves when connected
 */
const connectDatabase = async () => {
    try {
        // MongoDB connection options for production-ready setup
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);
        
        console.log(` MongoDB Connected: ${conn.connection.host}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error(' MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log(' MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log(' MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error(' Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { connectDatabase };
