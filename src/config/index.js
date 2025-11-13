'use strict';

require('dotenv').config();

const port = parseInt(process.env.PORT || '3000', 10);
const serviceConfig = {
	port: port,
	env: process.env.NODE_ENV || 'development',
	baseUrl: process.env.BASE_URL || `http://localhost:${port}`,
	requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '6000', 10),
	forwardTimeoutMs: parseInt(process.env.FORWARD_TIMEOUT_MS || '4500', 10),
	maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '5', 10),
	retryBackoffBaseMs: parseInt(process.env.RETRY_BACKOFF_BASE_MS || '1000', 10),
	mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-graph-api-service',
	facebook: {
		appId: process.env.FB_APP_ID || '',
		appSecret: process.env.FB_APP_SECRET || '',
		verifyToken: process.env.FB_VERIFY_TOKEN || '',
	},
};

module.exports = {
	serviceConfig,
};


