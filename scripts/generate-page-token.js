#!/usr/bin/env node
/**
 * Generate Page Access Token for a client's Facebook Page
 * This creates a login URL that the client can use to authorize and get tokens
 */

require('dotenv').config();

const APP_ID = process.env.FB_APP_ID || '808468275327880';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const REDIRECT_URI = process.env.FB_REDIRECT_URI || 'https://your-domain.com/auth/facebook/callback';
const CLIENT_PAGE_ID = process.argv[2] || '';

if (!CLIENT_PAGE_ID) {
	console.log('\n' + '='.repeat(80));
	console.log('Generate Page Access Token - Login URL Generator');
	console.log('='.repeat(80) + '\n');
	console.log('Usage:');
	console.log('  node generate-page-token.js <PAGE_ID>');
	console.log('\nOr set environment variables:');
	console.log('  FB_APP_ID=your_app_id');
	console.log('  FB_APP_SECRET=your_app_secret');
	console.log('  FB_REDIRECT_URI=your_redirect_uri');
	console.log('\nExample:');
	console.log('  node generate-page-token.js 104828644766419');
	console.log('\n' + '='.repeat(80) + '\n');
	process.exit(1);
}

// Required permissions for page access
const SCOPES = [
	'pages_show_list',           // List user's pages
	'pages_read_engagement',      // Read page posts and engagement
	'pages_manage_metadata',     // Manage page metadata
	'pages_read_user_content',    // Read content posted by the user
	'pages_manage_posts',         // Manage page posts (if needed)
	'pages_messaging',            // Send messages (if needed)
].join(',');

// Generate login URL
const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
	`client_id=${APP_ID}` +
	`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
	`&scope=${encodeURIComponent(SCOPES)}` +
	`&response_type=code` +
	`&state=${CLIENT_PAGE_ID}`; // Pass page ID in state for reference

console.log('\n' + '='.repeat(80));
console.log('Page Access Token Generation - Step 1');
console.log('='.repeat(80) + '\n');
console.log('For Page ID:', CLIENT_PAGE_ID);
console.log('\n1. Share this login URL with your client:');
console.log('\n' + loginUrl + '\n');
console.log('\n2. Client will:');
console.log('   - Click the URL');
console.log('   - Log in to Facebook');
console.log('   - Authorize your app');
console.log('   - Select their page');
console.log('   - Grant permissions');
console.log('   - Be redirected to:', REDIRECT_URI);
console.log('\n3. After redirect, you\'ll receive:');
console.log('   - Authorization code in query parameter: ?code=...');
console.log('   - Page ID in state parameter: &state=' + CLIENT_PAGE_ID);
console.log('\n4. Exchange the code for access token (see step 2)');
console.log('\n' + '='.repeat(80) + '\n');

