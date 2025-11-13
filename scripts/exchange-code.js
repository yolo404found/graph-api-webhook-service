#!/usr/bin/env node
/**
 * Exchange authorization code for Page Access Token
 * Gets the token and saves it to the config file
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const APP_ID = process.env.FB_APP_ID || '808468275327880';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const REDIRECT_URI = process.env.FB_REDIRECT_URI || 'https://your-domain.com/auth/callback';

const AUTH_CODE = process.argv[2];
const PAGE_ID = process.argv[3];

if (!AUTH_CODE || !PAGE_ID) {
	console.log('\n' + '='.repeat(80));
	console.log('Exchange Authorization Code for Page Access Token');
	console.log('='.repeat(80) + '\n');
	console.log('Usage:');
	console.log('  node exchange-code.js <AUTHORIZATION_CODE> <PAGE_ID>');
	console.log('\nExample:');
	console.log('  node exchange-code.js "AQBx..." 104828644766419');
	console.log('\n' + '='.repeat(80) + '\n');
	process.exit(1);
}

// Helper function for HTTPS requests
function httpsRequest(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				try {
					const json = JSON.parse(data);
					if (json.error) {
						reject(new Error(json.error.message || 'API Error'));
					} else {
						resolve(json);
					}
				} catch (e) {
					reject(new Error('Failed to parse response: ' + e.message));
				}
			});
		}).on('error', reject);
	});
}

async function main() {
	try {
		console.log('\n' + '='.repeat(80));
		console.log('Exchanging Authorization Code for Page Access Token');
		console.log('='.repeat(80) + '\n');

		// Step 1: Exchange code for User Access Token
		console.log('Step 1: Exchanging code for User Access Token...');
		const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
			`client_id=${APP_ID}` +
			`&client_secret=${APP_SECRET}` +
			`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
			`&code=${AUTH_CODE}`;

		const tokenResponse = await httpsRequest(tokenUrl);
		const userAccessToken = tokenResponse.access_token;
		console.log('✓ Got User Access Token\n');

		// Step 2: Get user's pages
		console.log('Step 2: Getting user\'s pages...');
		const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`;
		const pagesResponse = await httpsRequest(pagesUrl);
		
		if (!pagesResponse.data || pagesResponse.data.length === 0) {
			throw new Error('No pages found for this user');
		}

		console.log(`✓ Found ${pagesResponse.data.length} page(s)\n`);

		// Step 3: Find the specific page
		console.log(`Step 3: Looking for page ID: ${PAGE_ID}...`);
		const targetPage = pagesResponse.data.find(page => page.id === PAGE_ID);
		
		if (!targetPage) {
			console.log('\nAvailable pages:');
			pagesResponse.data.forEach((page, i) => {
				console.log(`  ${i + 1}. ${page.name} (ID: ${page.id})`);
			});
			throw new Error(`Page ${PAGE_ID} not found in user's pages`);
		}

		console.log(`✓ Found page: ${targetPage.name}\n`);

		// Step 4: Get Page Access Token
		const pageAccessToken = targetPage.access_token;
		console.log('Step 4: Page Access Token obtained');
		console.log(`✓ Token: ${pageAccessToken.substring(0, 20)}...\n`);

		// Step 5: Update config file
		console.log('Step 5: Updating config file...');
		const configPath = path.join(process.cwd(), 'configs', `page_${PAGE_ID}.json`);
		
		if (!fs.existsSync(configPath)) {
			throw new Error(`Config file not found: ${configPath}`);
		}

		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		config.facebook.accessToken = pageAccessToken;
		
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(`✓ Updated: ${configPath}\n`);

		console.log('='.repeat(80));
		console.log('SUCCESS! Page Access Token saved to config file');
		console.log('='.repeat(80) + '\n');
		console.log('Page Info:');
		console.log(`  Name: ${targetPage.name}`);
		console.log(`  ID: ${targetPage.id}`);
		console.log(`  Category: ${targetPage.category || 'N/A'}`);
		console.log(`  Token saved to: configs/page_${PAGE_ID}.json\n`);

	} catch (error) {
		console.error('\n' + '='.repeat(80));
		console.error('ERROR:', error.message);
		console.error('='.repeat(80) + '\n');
		
		if (error.message.includes('invalid code')) {
			console.error('Possible issues:');
			console.error('  - Authorization code expired (codes expire quickly)');
			console.error('  - Code already used');
			console.error('  - Redirect URI mismatch');
		} else if (error.message.includes('not found')) {
			console.error('Make sure:');
			console.error('  - Client added your app to the correct page');
			console.error('  - Client granted page permissions');
			console.error('  - Page ID is correct');
		}
		
		process.exit(1);
	}
}

main();

