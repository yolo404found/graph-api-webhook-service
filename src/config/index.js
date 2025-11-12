'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

const serviceConfig = {
	port: parseInt(process.env.PORT || '6000', 10),
	env: process.env.NODE_ENV || 'development',
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

function loadFileTenantConfig(pageId) {
	try {
		const filePath = path.join(process.cwd(), 'configs', `${pageId}.json`);
		if (!fs.existsSync(filePath)) return null;
		const raw = fs.readFileSync(filePath, 'utf8');
		const parsed = JSON.parse(raw);
		return parsed;
	} catch (err) {
		logger.warn({ err }, 'Failed to load file-based tenant config');
		return null;
	}
}

module.exports = {
	serviceConfig,
	loadFileTenantConfig,
};


