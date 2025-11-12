'use strict';

const express = require('express');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { serviceConfig, loadFileTenantConfig } = require('../config');
const ClientConfig = require('../models/ClientConfig');
const { forwardPayload } = require('../services/forwarder');
const { RetryQueue } = require('../services/retryQueue');

const router = express.Router();

// Keep raw body for signature and forwarding
router.use((req, res, next) => {
	let data = [];
	req.on('data', (chunk) => data.push(chunk));
	req.on('end', () => {
		req.rawBodyBuffer = Buffer.concat(data);
		try {
			req.rawBodyJson = req.rawBodyBuffer.length ? JSON.parse(req.rawBodyBuffer.toString('utf8')) : {};
		} catch (e) {
			req.rawBodyJson = {};
		}
		next();
	});
});

// Facebook webhook verification
router.get('/facebook', (req, res) => {
	const mode = req.query['hub.mode'];
	const token = req.query['hub.verify_token'];
	const challenge = req.query['hub.challenge'];

	// Log all incoming parameters for debugging
	logger.info({
		mode,
		tokenPresent: Boolean(token),
		challengePresent: Boolean(challenge),
		query: req.query,
		userAgent: req.get('user-agent'),
		ip: req.ip
	}, 'Facebook webhook verification request received');

	// Trim tokens to handle any whitespace issues
	const providedToken = token ? String(token).trim() : '';
	const expectedToken = serviceConfig.facebook.verifyToken ? String(serviceConfig.facebook.verifyToken).trim() : '';
	
	if (mode === 'subscribe' && providedToken === expectedToken) {
		logger.info({ 
			mode, 
			challenge, 
			challengeLength: challenge ? challenge.length : 0,
			tokenMatch: true
		}, 'Facebook webhook verification succeeded - returning challenge');
		
		// Facebook requires plain text response with just the challenge
		res.setHeader('Content-Type', 'text/plain');
		return res.status(200).send(String(challenge || ''));
	}

	// If no parameters at all, likely a browser visit - return helpful message
	if (!mode && !token && !challenge) {
		return res.status(400).json({
			error: 'Missing required parameters',
			message: 'This endpoint requires Facebook webhook verification parameters',
			required: {
				'hub.mode': 'subscribe',
				'hub.verify_token': 'Your verify token',
				'hub.challenge': 'Challenge string from Facebook'
			},
			note: 'This endpoint is called automatically by Facebook during webhook setup'
		});
	}

	const reasons = [];
	if (mode !== 'subscribe') reasons.push('invalid_mode');
	if (providedToken !== expectedToken) reasons.push('verify_token_mismatch');
	if (!challenge) reasons.push('missing_challenge');

	// Mask tokens to avoid leaking secrets
	const mask = (v) => (typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-3)}` : '***');

	logger.warn(
		{
			mode,
			challengePresent: Boolean(challenge),
			providedToken: providedToken ? mask(providedToken) : null,
			expectedToken: expectedToken ? mask(expectedToken) : null,
			providedTokenLength: providedToken ? providedToken.length : 0,
			expectedTokenLength: expectedToken ? expectedToken.length : 0,
			reasons,
		},
		'Facebook webhook verification failed'
	);

	return res.status(403).json({
		error: 'Verification failed',
		reasons
	});
});

// Retry queue instance
const retryQueue = new RetryQueue(serviceConfig.maxRetryAttempts, serviceConfig.retryBackoffBaseMs);

// Receive Facebook webhook events
router.post('/facebook', async (req, res) => {
	// Immediately acknowledge to Facebook
	res.sendStatus(200);

	const requestId = crypto.randomUUID();
	const body = req.rawBodyJson || {};

	try {
		// Facebook sends page ID in different places; check common paths
		const pageId =
			body?.entry?.[0]?.id ||
			body?.object_id ||
			body?.object ||
			body?.page?.id ||
			null;

		if (!pageId) {
			logger.warn({ requestId }, 'Unable to determine pageId from webhook payload');
			return;
		}

		// Load tenant config: try DB then file fallback
		let tenant = await ClientConfig.findOne({ 'facebook.pageId': String(pageId) }).lean().exec();
		if (!tenant) {
			tenant = loadFileTenantConfig(String(pageId));
		}
		if (!tenant) {
			logger.warn({ pageId, requestId }, 'No tenant configuration found for pageId');
			return;
		}

		const callbackUrl = tenant.webhook?.callbackUrl;
		const secretToken = tenant.facebook?.appSecret || tenant.facebook?.verifyToken || '';
		if (!callbackUrl || !secretToken) {
			logger.warn({ pageId, requestId }, 'Tenant config missing callbackUrl or secret');
			return;
		}

		const doForward = async (attempt) => {
			const result = await forwardPayload({
				callbackUrl,
				secretToken,
				rawBodyBuffer: req.rawBodyBuffer,
				requestId,
				pageId: String(pageId),
				timeoutMs: serviceConfig.forwardTimeoutMs,
			});

			// Retry on 5xx/connection errors only
			if (!result.ok && (result.statusCode === 0 || result.statusCode >= 500)) {
				retryQueue.schedule(doForward, attempt);
			}
		};

		// Kick off first attempt without delay
		doForward(0).catch((err) => logger.error({ err, requestId }, 'Initial forwarding failed'));
	} catch (err) {
		logger.error({ err, requestId }, 'Failed processing webhook');
	}
});

module.exports = router;


