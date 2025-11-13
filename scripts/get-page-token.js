#!/usr/bin/env node
/**
 * Get Page Access Token for a client's page
 * Simplified flow: Client already added app to page, now we just need to get token
 */

require('dotenv').config();
const https = require('https');

const APP_ID = process.env.FB_APP_ID || '808468275327880';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const CLIENT_PAGE_ID = process.argv[2] || '';

if (!CLIENT_PAGE_ID) {
	console.log('\n' + '='.repeat(80));
	console.log('Get Page Access Token - Simplified Flow');
	console.log('='.repeat(80) + '\n');
	console.log('Usage:');
	console.log('  node get-page-token.js <PAGE_ID>');
	console.log('\nExample:');
	console.log('  node get-page-token.js 104828644766419');
	console.log('\n' + '='.repeat(80) + '\n');
	process.exit(1);
}

// Required permissions for page operations
const SCOPES = [
	'pages_show_list',           // List user's pages
	'pages_read_engagement',     // Read page posts and engagement
	'pages_read_user_content',   // Read content posted by the user
	'pages_manage_metadata',     // Manage page metadata
	'pages_read_engagement',     // Read engagement data
].join(',');

// Generate App Access Token first (for getting user's pages)
function getAppAccessToken() {
	return new Promise((resolve, reject) => {
		const url = `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`;
		
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				try {
					const json = JSON.parse(data);
					resolve(json.access_token);
				} catch (e) {
					reject(new Error('Failed to get app token: ' + e.message));
				}
			});
		}).on('error', reject);
	});
}

console.log('\n' + '='.repeat(80));
console.log('Get Page Access Token for Page:', CLIENT_PAGE_ID);
console.log('='.repeat(80) + '\n');

console.log('STEP 1: Generate Authorization URL for Client\n');
console.log('Since the client already added your app to their page,');
console.log('they just need to authorize permissions.\n');

const REDIRECT_URI = process.env.FB_REDIRECT_URI || 'https://your-domain.com/auth/callback';
const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
	`client_id=${APP_ID}` +
	`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
	`&scope=${encodeURIComponent(SCOPES)}` +
	`&response_type=code` +
	`&state=${CLIENT_PAGE_ID}`;

console.log('Share this URL with your client:');
console.log('\n' + authUrl + '\n');
console.log('\nClient will:');
console.log('  1. Click the URL');
console.log('  2. Log in (if not already)');
console.log('  3. Grant permissions');
console.log('  4. Be redirected back with authorization code');
console.log('\n' + '='.repeat(80) + '\n');

console.log('STEP 2: After client authorizes, exchange code for token\n');
console.log('Once you receive the authorization code from redirect,');
console.log('run this command:\n');
console.log('  node exchange-code.js <AUTHORIZATION_CODE> <PAGE_ID>\n');
console.log('This will:');
console.log('  1. Exchange code for User Access Token');
console.log('  2. Get list of pages user manages');
console.log('  3. Find the specific page and get its Page Access Token');
console.log('  4. Save it to the config file');
console.log('\n' + '='.repeat(80) + '\n');

