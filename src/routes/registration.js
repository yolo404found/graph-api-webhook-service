'use strict';

const express = require('express');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { serviceConfig } = require('../config');
const ClientConfig = require('../models/ClientConfig');
const oauthService = require('../services/oauth');

const router = express.Router();

/**
 * GET /api/register
 * Serve registration form
 */
router.get('/register', (req, res) => {
	res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Facebook Page Registration</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
			width: 100%;
		}
		h1 {
			color: #333;
			margin-bottom: 10px;
			font-size: 28px;
		}
		.subtitle {
			color: #666;
			margin-bottom: 30px;
			font-size: 14px;
		}
		.form-group {
			margin-bottom: 20px;
		}
		label {
			display: block;
			margin-bottom: 8px;
			color: #333;
			font-weight: 500;
			font-size: 14px;
		}
		.required {
			color: #e74c3c;
		}
		input[type="text"],
		input[type="url"] {
			width: 100%;
			padding: 12px;
			border: 2px solid #e0e0e0;
			border-radius: 6px;
			font-size: 14px;
			transition: border-color 0.3s;
		}
		input[type="text"]:focus,
		input[type="url"]:focus {
			outline: none;
			border-color: #667eea;
		}
		.token-group {
			display: flex;
			gap: 10px;
		}
		.token-group input {
			flex: 1;
		}
		.btn {
			background: #667eea;
			color: white;
			border: none;
			padding: 12px 24px;
			border-radius: 6px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: background 0.3s;
		}
		.btn:hover {
			background: #5568d3;
		}
		.btn-secondary {
			background: #6c757d;
		}
		.btn-secondary:hover {
			background: #5a6268;
		}
		.btn-generate {
			white-space: nowrap;
		}
		.help-text {
			font-size: 12px;
			color: #666;
			margin-top: 5px;
		}
		.error {
			background: #fee;
			border: 1px solid #fcc;
			color: #c33;
			padding: 12px;
			border-radius: 6px;
			margin-bottom: 20px;
			font-size: 14px;
		}
		.success {
			background: #efe;
			border: 1px solid #cfc;
			color: #3c3;
			padding: 12px;
			border-radius: 6px;
			margin-bottom: 20px;
			font-size: 14px;
		}
		.loading {
			opacity: 0.6;
			pointer-events: none;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Facebook Page Registration</h1>
		<p class="subtitle">Register your Facebook page to receive webhooks</p>
		
		<div id="message"></div>
		
		<form id="registrationForm">
			<div class="form-group">
				<label for="businessName">Business/Page Name <span class="required">*</span></label>
				<input type="text" id="businessName" name="businessName" required 
					placeholder="e.g., Cool Music Enter">
				<div class="help-text">The name of your business or Facebook page</div>
			</div>

			<div class="form-group">
				<label for="pageId">Facebook Page ID <span class="required">*</span></label>
				<input type="text" id="pageId" name="pageId" required 
					placeholder="e.g., 104828644766419">
				<div class="help-text">Your Facebook Page ID (numeric)</div>
			</div>

			<div class="form-group">
				<label for="callbackUrl">Callback URL <span class="required">*</span></label>
				<input type="url" id="callbackUrl" name="callbackUrl" required 
					placeholder="http://localhost:3001/webhook/facebook">
				<div class="help-text">HTTP or HTTPS endpoint where you want to receive webhooks (HTTP allowed for development)</div>
			</div>

			<div class="form-group">
				<label for="verifyToken">Verify Token (Optional)</label>
				<div class="token-group">
					<input type="text" id="verifyToken" name="verifyToken" 
						placeholder="Leave empty to auto-generate" maxlength="32">
					<button type="button" class="btn btn-secondary btn-generate" onclick="generateToken()">
						Generate
					</button>
				</div>
				<div class="help-text">32-character token for webhook verification (auto-generated if empty)</div>
			</div>

			<button type="submit" class="btn" style="width: 100%; margin-top: 10px;">
				Register & Get Authorization URL
			</button>
		</form>
	</div>

	<script>
		function generateToken() {
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			let token = '';
			for (let i = 0; i < 32; i++) {
				token += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			document.getElementById('verifyToken').value = token;
		}

		document.getElementById('registrationForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			
			const form = e.target;
			const messageDiv = document.getElementById('message');
			messageDiv.innerHTML = '';
			
			form.classList.add('loading');
			
			const formData = {
				businessName: document.getElementById('businessName').value.trim(),
				pageId: document.getElementById('pageId').value.trim(),
				callbackUrl: document.getElementById('callbackUrl').value.trim(),
				verifyToken: document.getElementById('verifyToken').value.trim() || null
			};

			try {
				const response = await fetch('/api/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(formData)
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || 'Registration failed');
				}

				messageDiv.innerHTML = \`<div class="success">
					<strong>Registration Successful!</strong><br>
					Your page has been registered. Please click the authorization link below to grant permissions:<br><br>
					<a href="\${data.authUrl}" target="_blank" style="color: #667eea; font-weight: bold;">
						Authorize Facebook Permissions
					</a><br><br>
					<small>After authorization, you'll be redirected back and your access token will be automatically generated.</small>
				</div>\`;
				
				form.reset();
			} catch (error) {
				messageDiv.innerHTML = \`<div class="error">
					<strong>Error:</strong> \${error.message}
				</div>\`;
			} finally {
				form.classList.remove('loading');
			}
		});
	</script>
</body>
</html>
	`);
});

/**
 * POST /api/register
 * Register a new client
 */
router.post('/register', async (req, res) => {
	try {
		const { businessName, pageId, callbackUrl, verifyToken } = req.body;

		// Validation
		if (!businessName || !pageId || !callbackUrl) {
			return res.status(400).json({
				error: 'Missing required fields',
				required: ['businessName', 'pageId', 'callbackUrl']
			});
		}

		// Validate callback URL format (allow both HTTP and HTTPS for development)
		if (!callbackUrl.startsWith('http://') && !callbackUrl.startsWith('https://')) {
			return res.status(400).json({
				error: 'Callback URL must start with http:// or https://'
			});
		}

		// Check if page already registered
		const existing = await ClientConfig.findOne({ 'facebook.pageId': String(pageId) });
		if (existing) {
			return res.status(409).json({
				error: 'Page already registered',
				pageId: pageId
			});
		}

		// Generate verify token if not provided
		const finalVerifyToken = verifyToken || oauthService.constructor.generateVerifyToken(32);

		// Generate authorization URL
		const authUrl = oauthService.generateAuthUrl(pageId, pageId);

		// Create client config
		const clientConfig = new ClientConfig({
			businessName: businessName.trim(),
			facebook: {
				pageId: String(pageId).trim(),
				appId: serviceConfig.facebook.appId,
				appSecret: serviceConfig.facebook.appSecret,
				verifyToken: finalVerifyToken,
				accessToken: '', // Will be set after OAuth
			},
			webhook: {
				callbackUrl: callbackUrl.trim(),
				port: 0,
			},
			features: {
				autoPostToTelegram: false,
				logIncomingData: true,
				keepRawPayloadDays: 30,
			},
			registration: {
				status: 'pending',
				authUrl: authUrl,
			},
		});

		await clientConfig.save();

		logger.info({ pageId, businessName }, 'Client registered successfully');

		res.status(201).json({
			success: true,
			message: 'Registration successful. Please authorize permissions.',
			pageId: pageId,
			authUrl: authUrl,
			verifyToken: finalVerifyToken,
		});

	} catch (error) {
		logger.error({ err: error }, 'Registration failed');
		
		if (error.code === 11000) {
			return res.status(409).json({
				error: 'Page already registered',
			});
		}

		res.status(500).json({
			error: 'Registration failed',
			message: error.message
		});
	}
});

module.exports = router;

