'use strict';

const express = require('express');
const { logger } = require('../utils/logger');
const ClientConfig = require('../models/ClientConfig');
const oauthService = require('../services/oauth');

const router = express.Router();

/**
 * GET /api/auth/callback
 * OAuth callback handler - exchanges code for token and updates client config
 */
router.get('/callback', async (req, res) => {
	const { code, state, error, error_reason, error_description } = req.query;
	console.log("callback queries",{code, state, error, error_reason, error_description})

	// Handle OAuth errors
	if (error) {
		logger.warn({ error, error_reason, error_description }, 'OAuth error received');
		return res.status(400).send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Authorization Failed</title>
				<style>
					body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
					.error { color: #e74c3c; }
				</style>
			</head>
			<body>
				<h1 class="error">Authorization Failed</h1>
				<p>Error: ${error_reason || error}</p>
				${error_description ? `<p>${error_description}</p>` : ''}
				<p><a href="/api/register">Try again</a></p>
			</body>
			</html>
		`);
	}

	// Validate required parameters
	if (!code || !state) {
		return res.status(400).send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Invalid Request</title>
				<style>
					body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
					.error { color: #e74c3c; }
				</style>
			</head>
			<body>
				<h1 class="error">Invalid Request</h1>
				<p>Missing authorization code or state parameter.</p>
				<p><a href="/api/register">Go to registration</a></p>
			</body>
			</html>
		`);
	}

	// Parse state: format is "objectType:objectId" or just "objectId" (legacy)
	let objectType = 'page';
	let objectId = state;

	if (state.includes(':')) {
		const parts = state.split(':');
		objectType = parts[0];
		objectId = parts[1];
	}

	try {
		// Find client config by objectId (works for both page and group)
		const clientConfig = await ClientConfig.findOne({ 'facebook.objectId': String(objectId) });

		if (!clientConfig) {
			logger.warn({ objectId, objectType }, 'Client config not found for OAuth callback');
			return res.status(404).send(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Not Found</title>
					<style>
						body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
						.error { color: #e74c3c; }
					</style>
				</head>
				<body>
					<h1 class="error">Not Found</h1>
					<p>No registration found for ${objectType} ID: ${objectId}</p>
					<p><a href="/api/register">Register your ${objectType}</a></p>
				</body>
				</html>
			`);
		}

		// Use the objectType from config if state doesn't have it
		const finalObjectType = clientConfig.objectType || objectType;

		// Complete OAuth flow
		logger.info({ objectId, objectType: finalObjectType }, 'Processing OAuth callback');
		const objectInfo = await oauthService.completeOAuthFlow(code, objectId, finalObjectType);

		// Update client config with access token
		clientConfig.facebook.accessToken = objectInfo.accessToken;
		clientConfig.registration.status = 'completed';
		clientConfig.registration.authorizedAt = new Date();
		clientConfig.registration.completedAt = new Date();

		await clientConfig.save();

		logger.info(
			{ objectId, objectType: finalObjectType, objectName: objectInfo.name },
			'OAuth flow completed successfully'
		);

		// Success page
		res.send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Authorization Successful</title>
				<style>
					body { 
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						min-height: 100vh;
						display: flex;
						align-items: center;
						justify-content: center;
						padding: 20px;
					}
					.container {
						background: white;
						border-radius: 12px;
						box-shadow: 0 20px 60px rgba(0,0,0,0.3);
						padding: 40px;
						max-width: 500px;
						text-align: center;
					}
					.success-icon {
						font-size: 64px;
						color: #27ae60;
						margin-bottom: 20px;
					}
					h1 { color: #333; margin-bottom: 10px; }
					.info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left; }
					.info-item { margin: 10px 0; }
					.info-label { font-weight: 600; color: #666; }
					.info-value { color: #333; }
					.btn {
						display: inline-block;
						background: #667eea;
						color: white;
						padding: 12px 24px;
						border-radius: 6px;
						text-decoration: none;
						margin-top: 20px;
					}
					.btn:hover { background: #5568d3; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="success-icon">✓</div>
					<h1>Authorization Successful!</h1>
					<p style="color: #666; margin-bottom: 20px;">
						Your Facebook ${finalObjectType} has been successfully connected and authorized.
					</p>
					<div class="info">
						<div class="info-item">
							<span class="info-label">${finalObjectType === 'group' ? 'Group' : 'Page'} Name:</span>
							<span class="info-value">${objectInfo.name || 'N/A'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">${finalObjectType === 'group' ? 'Group' : 'Page'} ID:</span>
							<span class="info-value">${objectInfo.objectId}</span>
						</div>
						${objectInfo.category ? `
						<div class="info-item">
							<span class="info-label">Category:</span>
							<span class="info-value">${objectInfo.category}</span>
						</div>` : ''}
						<div class="info-item">
							<span class="info-label">Status:</span>
							<span class="info-value">✓ Access token generated</span>
						</div>
					</div>
					<p style="color: #666; font-size: 14px; margin-top: 20px;">
						Your webhook service is now ready to receive and forward events from your Facebook ${finalObjectType}.
					</p>
					<a href="/api/register" class="btn">Register Another ${finalObjectType === 'group' ? 'Group' : 'Page'}</a>
				</div>
			</body>
			</html>
		`);
	} catch (error) {
		logger.error({ err: error, objectId, objectType }, 'OAuth callback failed');

		// Try to update status to show error (safe and consistent)
		try {
			const clientConfig = await ClientConfig.findOne({ 'facebook.objectId': String(objectId) });
			if (clientConfig) {
				clientConfig.registration.status = 'pending';
				await clientConfig.save();
			}
		} catch (updateError) {
			logger.error({ err: updateError }, 'Failed to update client config status');
		}

		const errorMessage = error.message || 'Unknown error occurred';
		res.status(500).send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Authorization Failed</title>
				<style>
					body { 
						font-family: Arial, sans-serif; 
						text-align: center; 
						padding: 50px;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						min-height: 100vh;
						display: flex;
						align-items: center;
						justify-content: center;
					}
					.container {
						background: white;
						border-radius: 12px;
						padding: 40px;
						max-width: 500px;
					}
					.error { color: #e74c3c; }
					.btn {
						display: inline-block;
						background: #667eea;
						color: white;
						padding: 12px 24px;
						border-radius: 6px;
						text-decoration: none;
						margin-top: 20px;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<h1 class="error">Authorization Failed</h1>
					<p>${errorMessage}</p>
					<p style="margin-top: 20px;">
						<a href="/api/register" class="btn">Try Again</a>
					</p>
				</div>
			</body>
			</html>
		`);
	}
});

module.exports = router;
