

const serverlessExpress = require('@codegenie/serverless-express');
const app = require('./server');

// Initialize serverless express
let serverlessExpressInstance;

/**
 * Lambda handler function
 * @param {Object} event - AWS Lambda event
 * @param {Object} context - AWS Lambda context
 * @returns {Promise} - API Gateway response
 */
async function handler(event, context) {
    // Initialize serverless express instance on cold start
    if (!serverlessExpressInstance) {
        serverlessExpressInstance = serverlessExpress({ app });
    }
    
    return serverlessExpressInstance(event, context);
}

module.exports = { handler };
