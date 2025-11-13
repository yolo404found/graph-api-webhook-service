#!/usr/bin/env node
/**
 * Test Client Webhook Server
 * Receives webhook payloads forwarded from the Facebook Graph API Service
 * For testing purposes only
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.TEST_CLIENT_PORT || 3001;
const SECRET_TOKEN = process.env.TEST_CLIENT_SECRET || 'test-secret-token-12345';

// Middleware to capture raw body for signature verification
app.use((req, res, next) => {
	let data = [];
	req.on('data', (chunk) => data.push(chunk));
	req.on('end', () => {
		req.rawBody = Buffer.concat(data);
		try {
			req.body = req.rawBody.length ? JSON.parse(req.rawBody.toString('utf8')) : {};
		} catch (e) {
			req.body = {};
		}
		next();
	});
});

// Verify signature from our service
function verifySignature(rawBody, signature, secret) {
	if (!signature || !secret) return false;
	
	// Extract signature from header format: "sha256=<hash>"
	const match = signature.match(/sha256=(.+)/);
	if (!match) return false;
	
	const providedHash = match[1];
	const expectedHash = crypto
		.createHmac('sha256', secret)
		.update(rawBody)
		.digest('hex');
	
	return crypto.timingSafeEqual(
		Buffer.from(providedHash, 'hex'),
		Buffer.from(expectedHash, 'hex')
	);
}

// Test webhook endpoint
app.post('/webhook/facebook', (req, res) => {
	const signature = req.get('X-Service-Signature');
	const requestId = req.get('X-Service-Request-Id');
	const pageId = req.get('X-Facebook-Page-Id');
	const timestamp = new Date().toISOString();
	
	// Verify signature
	const isValid = verifySignature(req.rawBody, signature, SECRET_TOKEN);
	
	// Log everything for testing
	console.log('\n' + '='.repeat(80));
	console.log(`[${timestamp}] Webhook Received`);
	console.log('='.repeat(80));
	console.log('Headers:');
	console.log(`  X-Service-Signature: ${signature || 'MISSING'}`);
	console.log(`  X-Service-Request-Id: ${requestId || 'MISSING'}`);
	console.log(`  X-Facebook-Page-Id: ${pageId || 'MISSING'}`);
	console.log(`  Content-Type: ${req.get('content-type') || 'MISSING'}`);
	console.log(`  Signature Valid: ${isValid ? '✓ YES' : '✗ NO'}`);
	console.log('\nPayload:');
	console.log(JSON.stringify(req.body, null, 2));
	console.log('\nRaw Body Length:', req.rawBody.length, 'bytes');
	console.log('='.repeat(80) + '\n');
	
	// Always return 200 to acknowledge receipt
	// In production, you'd process the webhook here
	res.status(200).json({
		status: 'received',
		timestamp,
		requestId,
		pageId,
		signatureValid: isValid,
		payloadSize: req.rawBody.length
	});
});

// Health check
app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		service: 'Test Client Webhook Server',
		port: PORT,
		endpoint: '/webhook/facebook'
	});
});

// Root
app.get('/', (req, res) => {
	const protocol = req.protocol;
	const host = req.get('host');
	const callbackUrl = `${protocol}://${host}/webhook/facebook`;
	
	res.status(200).json({
		service: 'Test Client Webhook Server',
		status: 'running',
		endpoints: {
			webhook: '/webhook/facebook',
			health: '/health'
		},
		callbackUrl: callbackUrl,
		instructions: {
			step1: 'Use this callback URL in the registration form:',
			step2: callbackUrl,
			step3: 'Set verify token to match: ' + SECRET_TOKEN,
			step4: 'Watch this console for incoming webhook payloads'
		}
	});
});

app.listen(PORT, () => {
	console.log('\n' + '='.repeat(80));
	console.log('Test Client Webhook Server Started');
	console.log('='.repeat(80));
	console.log(`Port: ${PORT}`);
	console.log(`Webhook Endpoint: http://localhost:${PORT}/webhook/facebook`);
	console.log(`Health Check: http://localhost:${PORT}/health`);
	console.log(`Secret Token: ${SECRET_TOKEN}`);
	console.log('\n📋 Use this callback URL in registration form:');
	console.log(`   http://localhost:${PORT}/webhook/facebook`);
	console.log('\n💡 For HTTPS (required for production):');
	console.log('   1. Install ngrok: https://ngrok.com/download');
	console.log(`   2. Run: ngrok http ${PORT}`);
	console.log('   3. Use the ngrok HTTPS URL as callback URL');
	console.log('\nWaiting for webhook payloads from Facebook Graph API Service...');
	console.log('='.repeat(80) + '\n');
});

