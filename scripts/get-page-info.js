#!/usr/bin/env node
/**
 * Get Page Information
 * Can use App Access Token (public info) or Page Access Token (detailed info)
 */

require('dotenv').config();
const https = require('https');
const path = require('path');
const fs = require('fs');

const APP_ID = process.env.FB_APP_ID || '808468275327880';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const PAGE_ID = process.argv[2] || '';

if (!PAGE_ID) {
	console.log('\nUsage: node get-page-info.js <PAGE_ID>');
	console.log('Example: node get-page-info.js 104828644766419\n');
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

async function getAppAccessToken() {
	const url = `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`;
	const response = await httpsRequest(url);
	return response.access_token;
}

async function getPageAccessTokenFromConfig() {
	try {
		const configPath = path.join(process.cwd(), 'configs', `page_${PAGE_ID}.json`);
		if (!fs.existsSync(configPath)) return null;
		
		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		return config.facebook?.accessToken || null;
	} catch (e) {
		return null;
	}
}

async function main() {
	try {
		console.log('\n' + '='.repeat(80));
		console.log('Getting Page Information for:', PAGE_ID);
		console.log('='.repeat(80) + '\n');

		// Try to get Page Access Token from config first
		let pageAccessToken = await getPageAccessTokenFromConfig();
		let usingPageToken = false;

		if (pageAccessToken && pageAccessToken !== 'YOUR_PAGE_ACCESS_TOKEN') {
			console.log('Using Page Access Token from config file...\n');
			usingPageToken = true;
		} else {
			console.log('No Page Access Token found, using App Access Token (public info only)...\n');
			pageAccessToken = await getAppAccessToken();
		}

		// Get page info
		const fields = [
			'id',
			'name',
			'category',
			'category_list',
			'about',
			'phone',
			'website',
			'fan_count',
			'followers_count',
			'link',
			'picture',
			'cover',
			'verification_status',
			'is_verified'
		].join(',');

		const url = `https://graph.facebook.com/v18.0/${PAGE_ID}?fields=${fields}&access_token=${pageAccessToken}`;
		const pageInfo = await httpsRequest(url);

		console.log('Page Information:');
		console.log('='.repeat(80));
		console.log(`Name: ${pageInfo.name || 'N/A'}`);
		console.log(`ID: ${pageInfo.id}`);
		console.log(`Category: ${pageInfo.category || 'N/A'}`);
		if (pageInfo.category_list) {
			console.log(`Categories: ${pageInfo.category_list.map(c => c.name).join(', ')}`);
		}
		console.log(`About: ${pageInfo.about || 'N/A'}`);
		console.log(`Phone: ${pageInfo.phone || 'N/A'}`);
		console.log(`Website: ${pageInfo.website || 'N/A'}`);
		console.log(`Fan Count: ${pageInfo.fan_count || 0}`);
		console.log(`Followers: ${pageInfo.followers_count || 0}`);
		console.log(`Link: ${pageInfo.link || 'N/A'}`);
		console.log(`Verified: ${pageInfo.is_verified ? 'Yes' : 'No'}`);
		if (pageInfo.verification_status) {
			console.log(`Verification Status: ${pageInfo.verification_status}`);
		}
		console.log('='.repeat(80) + '\n');

		if (!usingPageToken) {
			console.log('Note: Using App Access Token - limited to public information.');
			console.log('For detailed info (posts, insights, etc.), use Page Access Token.\n');
			console.log('To get Page Access Token, run:');
			console.log(`  node get-page-token.js ${PAGE_ID}\n`);
		}

	} catch (error) {
		console.error('\nError:', error.message);
		if (error.message.includes('Invalid OAuth')) {
			console.error('\nPossible issues:');
			console.error('  - Invalid or expired access token');
			console.error('  - Page ID is incorrect');
			console.error('  - App doesn\'t have required permissions');
		}
		process.exit(1);
	}
}

main();

