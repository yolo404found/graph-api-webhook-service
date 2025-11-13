'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const morgan = require('morgan');
const { httpLogger, logger } = require('./utils/logger');
const { serviceConfig } = require('./config');
const webhookRouter = require('./routes/webhook');
const registrationRouter = require('./routes/registration');
const authRouter = require('./routes/auth');
const testRouter = require('../test/test');

async function start() {
	const app = express();

	// Trust proxy for ngrok/reverse proxies (trust only first proxy for security)
	// Set to 1 to trust only ngrok, not all proxies
	app.set('trust proxy', 1);

	// Security headers
	app.use(helmet({ contentSecurityPolicy: false }));

	// JSON body parsing
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Basic request logging (dev-friendly)
	if (serviceConfig.env === 'development') {
		app.use(morgan('dev'));
	}
	// Structured logs
	app.use(httpLogger);

	// Root route
	app.get('/', (req, res) => {
		res.status(200).json({ 
		service: 'Facebook Graph API Service',
		status: 'running',
		endpoints: {
			health: '/health',
			webhook: '/webhook/facebook',
			register: '/api/register',
			authCallback: '/api/auth/callback',
			testWebhook: '/api/test/webhook/:objectId',
			testStatus: '/api/test/status/:objectId'
		}
		});
	});

	// Health checks
	app.get('/health', (req, res) => {
		res.status(200).json({ status: 'ok', time: new Date().toISOString() });
	});

	// Registration and auth routes
	app.use('/api', registrationRouter);
	app.use('/api/auth', authRouter);
	
	// Test routes (for testing client registration)
	app.use('/api/test', testRouter);

	// Rate limiting for webhook endpoint
	// With trust proxy: 1, Express sets req.ip correctly from X-Forwarded-For
	const webhookLimiter = rateLimit({
		windowMs: 60 * 1000,
		limit: 1200, // 1200 requests per minute per IP
		standardHeaders: 'draft-7',
		legacyHeaders: false,
		// Skip validation - we've configured trust proxy securely (only first proxy)
		validate: false,
	});
	app.use('/webhook', webhookLimiter);
	app.use('/webhook', webhookRouter);

	// Global not found
	app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

	// Connect to Mongo
	mongoose.set('strictQuery', true);
	await mongoose.connect(serviceConfig.mongodbUri, { autoIndex: true });
	logger.info({ uri: serviceConfig.mongodbUri }, 'Connected to MongoDB');

	// Log webhook configuration (masked for security)
	const mask = (v) => (v && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-3)}` : 'not set');
	logger.info({ 
		verifyToken: mask(serviceConfig.facebook.verifyToken),
		verifyTokenLength: serviceConfig.facebook.verifyToken ? serviceConfig.facebook.verifyToken.length : 0,
		webhookEndpoint: '/webhook/facebook'
	}, 'Webhook verification configured');

	const server = app.listen(serviceConfig.port, () => {
		logger.info({ port: serviceConfig.port, env: serviceConfig.env }, 'Server listening');
	});

	// Graceful shutdown
	const shutdown = async () => {
		try {
			logger.info('Shutting down...');
			server.close();
			await mongoose.disconnect();
			process.exit(0);
		} catch (e) {
			logger.error({ err: e }, 'Error during shutdown');
			process.exit(1);
		}
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

start().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});


