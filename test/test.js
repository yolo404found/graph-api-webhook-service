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
router.post('/webhook/:objectId', async (req, res) => {
	const objectId = req.params.objectId;
	const requestId = `test-${Date.now()}`;

	try {
		// Check if client is registered (using objectId which works for both page and group)
		const clientConfig = await ClientConfig.findOne({ 'facebook.objectId': String(objectId) }).lean().exec();
		
		if (!clientConfig) {
			return res.status(404).json({
				error: 'Client not found',
				message: `No registration found for object ID: ${objectId}`,
				hint: 'Register this page/group first at /api/register'
			});
		}

		const objectType = clientConfig.objectType || 'page';
		const objectName = objectType === 'group' ? 'Group' : 'Page';

		// Create a simulated Facebook webhook payload
		const webhookPayload = {
			object: objectType, // 'page' or 'group'
			entry: [
				{
					id: objectId,
					time: Math.floor(Date.now() / 1000),
					messaging: [],
					changes: [
						{
							value: {
								from: {
									id: objectId,
									name: clientConfig.businessName || `Test ${objectName}`
								},
								item: 'post',
								post_id: `${objectId}_${Date.now()}`,
								verb: 'add',
								created_time: Math.floor(Date.now() / 1000),
								message: `This is a test post from the webhook test endpoint for ${objectType}`
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
				objectId: objectId
			});
		}

		logger.info({ objectId, objectType, callbackUrl, requestId }, 'Simulating webhook for test');

		// Forward the payload (same as real webhook)
		const result = await forwardPayload({
			callbackUrl,
			secretToken,
			rawBodyBuffer,
			requestId,
			pageId: String(objectId), // Keep parameter name for backward compatibility
			timeoutMs: serviceConfig.forwardTimeoutMs,
		});

		// Return result
		if (result.ok) {
			res.status(200).json({
				success: true,
				message: 'Test webhook sent successfully',
				objectType: objectType,
				objectId: objectId,
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
				objectType: objectType,
				objectId: objectId,
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
		logger.error({ err: error, objectId, requestId }, 'Test webhook failed');
		res.status(500).json({
			error: 'Test webhook failed',
			message: error.message,
			objectId: objectId,
			requestId: requestId
		});
	}
});

/**
 * GET /api/test/status/:objectId
 * Check if a page or group is registered and get its status
 */
router.get('/status/:objectId', async (req, res) => {
	const objectId = req.params.objectId;

	try {
		const clientConfig = await ClientConfig.findOne({ 'facebook.objectId': String(objectId) }).lean().exec();

		if (!clientConfig) {
			return res.status(404).json({
				registered: false,
				message: `Object ${objectId} is not registered`,
				hint: 'Register at /api/register'
			});
		}

		const objectType = clientConfig.objectType || 'page';

		res.status(200).json({
			registered: true,
			objectType: objectType,
			objectId: objectId,
			pageId: clientConfig.facebook?.pageId,
			groupId: clientConfig.facebook?.groupId,
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
		logger.error({ err: error, objectId }, 'Failed to get registration status');
		res.status(500).json({
			error: 'Failed to get status',
			message: error.message
		});
	}
});

module.exports = router;

