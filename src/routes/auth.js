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

	const pageId = state; // State contains the pageId

	try {
		// Find client config
		const clientConfig = await ClientConfig.findOne({ 'facebook.pageId': String(pageId) });
		
		if (!clientConfig) {
			logger.warn({ pageId }, 'Client config not found for OAuth callback');
			return res.status(404).send(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Page Not Found</title>
					<style>
						body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
						.error { color: #e74c3c; }
					</style>
				</head>
				<body>
					<h1 class="error">Page Not Found</h1>
					<p>No registration found for page ID: ${pageId}</p>
					<p><a href="/api/register">Register your page</a></p>
				</body>
				</html>
			`);
		}

		// Complete OAuth flow
		logger.info({ pageId }, 'Processing OAuth callback');
		const pageInfo = await oauthService.completeOAuthFlow(code, pageId);

		// Update client config with access token
		clientConfig.facebook.accessToken = pageInfo.accessToken;
		clientConfig.registration.status = 'completed';
		clientConfig.registration.authorizedAt = new Date();
		clientConfig.registration.completedAt = new Date();
		
		await clientConfig.save();

		logger.info({ pageId, pageName: pageInfo.name }, 'OAuth flow completed successfully');

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
					h1 {
						color: #333;
						margin-bottom: 10px;
					}
					.info {
						background: #f8f9fa;
						border-radius: 8px;
						padding: 20px;
						margin: 20px 0;
						text-align: left;
					}
					.info-item {
						margin: 10px 0;
					}
					.info-label {
						font-weight: 600;
						color: #666;
					}
					.info-value {
						color: #333;
					}
					.btn {
						display: inline-block;
						background: #667eea;
						color: white;
						padding: 12px 24px;
						border-radius: 6px;
						text-decoration: none;
						margin-top: 20px;
					}
					.btn:hover {
						background: #5568d3;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="success-icon">✓</div>
					<h1>Authorization Successful!</h1>
					<p style="color: #666; margin-bottom: 20px;">
						Your Facebook page has been successfully connected and authorized.
					</p>
					<div class="info">
						<div class="info-item">
							<span class="info-label">Page Name:</span>
							<span class="info-value">${pageInfo.name || 'N/A'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Page ID:</span>
							<span class="info-value">${pageInfo.pageId}</span>
						</div>
						${pageInfo.category ? `
						<div class="info-item">
							<span class="info-label">Category:</span>
							<span class="info-value">${pageInfo.category}</span>
						</div>
						` : ''}
						<div class="info-item">
							<span class="info-label">Status:</span>
							<span class="info-value">✓ Access token generated</span>
						</div>
					</div>
					<p style="color: #666; font-size: 14px; margin-top: 20px;">
						Your webhook service is now ready to receive and forward events from your Facebook page.
					</p>
					<a href="/api/register" class="btn">Register Another Page</a>
				</div>
			</body>
			</html>
		`);

	} catch (error) {
		logger.error({ err: error, pageId }, 'OAuth callback failed');

		// Try to update status to show error
		try {
			const clientConfig = await ClientConfig.findOne({ 'facebook.pageId': String(pageId) });
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

