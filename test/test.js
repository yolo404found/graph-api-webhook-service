'use strict';

const express = require('express');
const { logger } = require('../src/utils/logger');
const ClientConfig = require('../src/models/ClientConfig');
const { forwardPayload } = require('../src/services/forwarder');
const { serviceConfig } = require('../src/config');

const router = express.Router();

/**
 * POST /api/test/webhook/:pageId
 * Simulate a Facebook webhook for testing client registration
 * 
 * This endpoint creates a fake Facebook webhook payload and processes it
 * the same way a real webhook would be processed, allowing you to test
 * if the client registration and forwarding is working correctly.
 */
router.post('/webhook/:pageId', async (req, res) => {
	const pageId = req.params.pageId;
	const requestId = `test-${Date.now()}`;

	try {
		// Check if client is registered
		const clientConfig = await ClientConfig.findOne({ 'facebook.pageId': String(pageId) }).lean().exec();
		
		if (!clientConfig) {
			return res.status(404).json({
				error: 'Client not found',
				message: `No registration found for page ID: ${pageId}`,
				hint: 'Register this page first at /api/register'
			});
		}

		// Create a simulated Facebook webhook payload for a new post
		const webhookPayload = {
			object: 'page',
			entry: [
				{
					id: pageId,
					time: Math.floor(Date.now() / 1000),
					messaging: [],
					changes: [
						{
							value: {
								from: {
									id: pageId,
									name: clientConfig.businessName || 'Test Page'
								},
								item: 'post',
								post_id: `${pageId}_${Date.now()}`,
								verb: 'add',
								created_time: Math.floor(Date.now() / 1000),
								message: 'This is a test post from the webhook test endpoint'
							},
							field: 'feed'
						}
					]
				}
			]
		};

		// Convert to JSON buffer (same format as real webhook)
		const rawBodyBuffer = Buffer.from(JSON.stringify(webhookPayload), 'utf8');

		// Get client config
		const callbackUrl = clientConfig.webhook?.callbackUrl;
		const secretToken = clientConfig.facebook?.appSecret || clientConfig.facebook?.verifyToken || '';

		if (!callbackUrl) {
			return res.status(400).json({
				error: 'Missing callback URL',
				message: 'Client config is missing callbackUrl',
				pageId: pageId
			});
		}

		logger.info({ pageId, callbackUrl, requestId }, 'Simulating webhook for test');

		// Forward the payload (same as real webhook)
		const result = await forwardPayload({
			callbackUrl,
			secretToken,
			rawBodyBuffer,
			requestId,
			pageId: String(pageId),
			timeoutMs: serviceConfig.forwardTimeoutMs,
		});

		// Return result
		if (result.ok) {
			res.status(200).json({
				success: true,
				message: 'Test webhook sent successfully',
				pageId: pageId,
				clientName: clientConfig.businessName,
				callbackUrl: callbackUrl,
				requestId: requestId,
				forwardResult: {
					statusCode: result.statusCode,
					latencyMs: result.latencyMs,
					success: result.ok
				},
				webhookPayload: webhookPayload
			});
		} else {
			res.status(500).json({
				success: false,
				message: 'Test webhook forwarding failed',
				pageId: pageId,
				callbackUrl: callbackUrl,
				requestId: requestId,
				error: {
					statusCode: result.statusCode,
					error: result.error,
					message: result.errorMessage
				},
				webhookPayload: webhookPayload
			});
		}

	} catch (error) {
		logger.error({ err: error, pageId, requestId }, 'Test webhook failed');
		res.status(500).json({
			error: 'Test webhook failed',
			message: error.message,
			pageId: pageId,
			requestId: requestId
		});
	}
});

/**
 * GET /api/test/status/:pageId
 * Check if a page is registered and get its status
 */
router.get('/status/:pageId', async (req, res) => {
	const pageId = req.params.pageId;

	try {
		const clientConfig = await ClientConfig.findOne({ 'facebook.pageId': String(pageId) }).lean().exec();

		if (!clientConfig) {
			return res.status(404).json({
				registered: false,
				message: `Page ${pageId} is not registered`,
				hint: 'Register at /api/register'
			});
		}

		res.status(200).json({
			registered: true,
			pageId: pageId,
			businessName: clientConfig.businessName,
			callbackUrl: clientConfig.webhook?.callbackUrl,
			registrationStatus: clientConfig.registration?.status || 'unknown',
			hasAccessToken: !!clientConfig.facebook?.accessToken,
			authorizedAt: clientConfig.registration?.authorizedAt,
			completedAt: clientConfig.registration?.completedAt,
			createdAt: clientConfig.createdAt,
			updatedAt: clientConfig.updatedAt
		});

	} catch (error) {
		logger.error({ err: error, pageId }, 'Failed to get registration status');
		res.status(500).json({
			error: 'Failed to get status',
			message: error.message
		});
	}
});

module.exports = router;

