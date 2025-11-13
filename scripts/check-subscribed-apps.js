#!/usr/bin/env node
/**
 * Check Subscribed Apps for a Facebook Page
 * Usage: node check-subscribed-apps.js <PAGE_ID> <PAGE_ACCESS_TOKEN>
 */

require('dotenv').config();
const https = require('https');

const PAGE_ID = process.argv[2] || process.env.FB_PAGE_ID || '104828644766419';
const PAGE_ACCESS_TOKEN = process.argv[3] || process.env.FB_PAGE_ACCESS_TOKEN || '';

if (!PAGE_ACCESS_TOKEN) {
	console.error('Error: Page Access Token required');
	console.log('\nUsage:');
	console.log('  node check-subscribed-apps.js <PAGE_ID> <PAGE_ACCESS_TOKEN>');
	console.log('\nOr set environment variables:');
	console.log('  FB_PAGE_ID=your_page_id');
	console.log('  FB_PAGE_ACCESS_TOKEN=your_page_access_token');
	process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('Checking Subscribed Apps for Page:', PAGE_ID);
console.log('='.repeat(80) + '\n');

// Method 1: Get subscribed apps
function getSubscribedApps(pageId, accessToken) {
	return new Promise((resolve, reject) => {
		const url = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?access_token=${accessToken}`;
		
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				try {
					const json = JSON.parse(data);
					resolve(json);
				} catch (e) {
					reject(new Error('Failed to parse response: ' + e.message));
				}
			});
		}).on('error', reject);
	});
}

// Method 2: Get page info
function getPageInfo(pageId, accessToken) {
	return new Promise((resolve, reject) => {
		const url = `https://graph.facebook.com/v18.0/${pageId}?fields=name,id&access_token=${accessToken}`;
		
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				try {
					const json = JSON.parse(data);
					resolve(json);
				} catch (e) {
					reject(new Error('Failed to parse response: ' + e.message));
				}
			});
		}).on('error', reject);
	});
}

async function main() {
	try {
		// Get page info
		console.log('Fetching page information...');
		const pageInfo = await getPageInfo(PAGE_ID, PAGE_ACCESS_TOKEN);
		console.log(`Page Name: ${pageInfo.name}`);
		console.log(`Page ID: ${pageInfo.id}\n`);

		// Get subscribed apps
		console.log('Fetching subscribed apps...');
		const result = await getSubscribedApps(PAGE_ID, PAGE_ACCESS_TOKEN);
		
		if (result.data && result.data.length > 0) {
			console.log(`\nFound ${result.data.length} subscribed app(s):\n`);
			result.data.forEach((app, index) => {
				console.log(`${index + 1}. App ID: ${app.id}`);
				console.log(`   Category: ${app.category || 'N/A'}`);
				console.log(`   Link: ${app.link || 'N/A'}`);
				console.log(`   Name: ${app.name || 'N/A'}`);
				console.log('');
			});
		} else {
			console.log('\nNo subscribed apps found for this page.');
			console.log('Note: This might mean:');
			console.log('  - No apps are subscribed to webhooks for this page');
			console.log('  - Or the page access token doesn\'t have required permissions');
		}
		
		console.log('='.repeat(80) + '\n');
	} catch (error) {
		console.error('\nError:', error.message);
		if (error.message.includes('Invalid OAuth')) {
			console.error('\nPossible issues:');
			console.error('  - Invalid or expired access token');
			console.error('  - Token doesn\'t have required permissions');
			console.error('  - Page ID is incorrect');
		}
		process.exit(1);
	}
}

main();

