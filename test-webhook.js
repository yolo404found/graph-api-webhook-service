#!/usr/bin/env node
/**
 * Test script for Facebook webhook verification
 * Simulates Facebook's verification request
 */

const http = require('http');
const https = require('https');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:6000/webhook/facebook';
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'aKd6OMTBDWSOd57AXluKh2Mmqi4dsUaJ';

// Parse URL
const url = new URL(WEBHOOK_URL);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

// Test 1: Browser-like request (no parameters) - should return 400
console.log('Test 1: Browser-like request (no parameters)...');
testRequest(url, {}, (statusCode, data) => {
	console.log(`  Status: ${statusCode}`);
	console.log(`  Response:`, JSON.stringify(data, null, 2));
	
	// Test 2: Facebook verification request (with parameters) - should return 200
	console.log('\nTest 2: Facebook verification request (with parameters)...');
	const challenge = '123456789';
	const params = new URLSearchParams({
		'hub.mode': 'subscribe',
		'hub.verify_token': VERIFY_TOKEN,
		'hub.challenge': challenge
	});
	
	testRequest(url, params, (statusCode, data) => {
		console.log(`  Status: ${statusCode}`);
		if (statusCode === 200) {
			console.log(`  Challenge returned: ${data}`);
			console.log(`  ✓ Verification SUCCESSFUL!`);
		} else {
			console.log(`  Response:`, JSON.stringify(data, null, 2));
			console.log(`  ✗ Verification FAILED`);
		}
		
		// Test 3: Wrong token - should return 403
		console.log('\nTest 3: Wrong verify token...');
		const wrongParams = new URLSearchParams({
			'hub.mode': 'subscribe',
			'hub.verify_token': 'wrong_token',
			'hub.challenge': challenge
		});
		
		testRequest(url, wrongParams, (statusCode, data) => {
			console.log(`  Status: ${statusCode}`);
			console.log(`  Response:`, JSON.stringify(data, null, 2));
			if (statusCode === 403) {
				console.log(`  ✓ Correctly rejected wrong token`);
			}
		});
	});
});

function testRequest(url, params, callback) {
	const queryString = params.toString();
	const fullUrl = queryString ? `${url.href}?${queryString}` : url.href;
	const parsedUrl = new URL(fullUrl);
	
	const options = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || (isHttps ? 443 : 80),
		path: parsedUrl.pathname + parsedUrl.search,
		method: 'GET',
		headers: {
			'User-Agent': 'facebookplatform/1.0 (+http://developers.facebook.com)'
		}
	};
	
	const req = client.request(options, (res) => {
		let data = '';
		res.on('data', (chunk) => { data += chunk; });
		res.on('end', () => {
			try {
				const json = JSON.parse(data);
				callback(res.statusCode, json);
			} catch (e) {
				// Not JSON, return as string
				callback(res.statusCode, data);
			}
		});
	});
	
	req.on('error', (err) => {
		console.error(`  ✗ Request error: ${err.message}`);
		callback(0, { error: err.message });
	});
	
	req.end();
}

