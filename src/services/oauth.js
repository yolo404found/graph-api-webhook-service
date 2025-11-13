'use strict';

const https = require('https');
const { serviceConfig } = require('../config');
const { logger } = require('../utils/logger');

/**
 * OAuth service for Facebook Graph API
 * Handles authorization URL generation and token exchange
 */
class OAuthService {
	constructor() {
		this.appId = serviceConfig.facebook.appId;
		this.appSecret = serviceConfig.facebook.appSecret;
		this.baseUrl = serviceConfig.baseUrl;
	}

	/**
	 * Generate authorization URL for client to grant permissions
	 * @param {string} pageId - Facebook Page ID
	 * @param {string} state - Optional state parameter (can include pageId)
	 * @returns {string} Authorization URL
	 */
	generateAuthUrl(pageId, state = null) {
		const scopes = [
			'pages_show_list',           // List user's pages
			'pages_read_engagement',     // Read page posts and engagement
			'pages_read_user_content',   // Read content posted by the user
			'pages_manage_metadata',     // Manage page metadata
		].join(',');

		const redirectUri = `${this.baseUrl}/api/auth/callback`;
		const stateParam = state || pageId;

		const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
			`client_id=${this.appId}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&scope=${encodeURIComponent(scopes)}` +
			`&response_type=code` +
			`&state=${encodeURIComponent(stateParam)}`;

		return authUrl;
	}

	/**
	 * Exchange authorization code for User Access Token
	 * @param {string} code - Authorization code from Facebook
	 * @returns {Promise<string>} User Access Token
	 */
	async exchangeCodeForUserToken(code) {
		const redirectUri = `${this.baseUrl}/api/auth/callback`;
		const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
			`client_id=${this.appId}` +
			`&client_secret=${this.appSecret}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&code=${code}`;

		const response = await this.httpsRequest(tokenUrl);
		
		if (response.error) {
			throw new Error(response.error.message || 'Failed to exchange code for token');
		}

		return response.access_token;
	}

	/**
	 * Get user's pages and find specific page access token
	 * @param {string} userAccessToken - User Access Token
	 * @param {string} pageId - Target Page ID
	 * @returns {Promise<{pageId: string, accessToken: string, name: string}>} Page info with access token
	 */
	async getPageAccessToken(userAccessToken, pageId) {
		const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`;
		const response = await this.httpsRequest(pagesUrl);

		if (response.error) {
			throw new Error(response.error.message || 'Failed to get user pages');
		}

		if (!response.data || response.data.length === 0) {
			throw new Error('No pages found for this user');
		}

		const targetPage = response.data.find(page => page.id === pageId);

		if (!targetPage) {
			const availablePages = response.data.map(p => ({ id: p.id, name: p.name }));
			throw new Error(`Page ${pageId} not found in user's pages. Available pages: ${JSON.stringify(availablePages)}`);
		}

		return {
			pageId: targetPage.id,
			accessToken: targetPage.access_token,
			name: targetPage.name,
			category: targetPage.category || null,
		};
	}

	/**
	 * Complete OAuth flow: exchange code and get page token
	 * @param {string} code - Authorization code
	 * @param {string} pageId - Target Page ID
	 * @returns {Promise<{pageId: string, accessToken: string, name: string}>} Page info with access token
	 */
	async completeOAuthFlow(code, pageId) {
		logger.info({ pageId }, 'Starting OAuth flow');
		
		// Step 1: Exchange code for user token
		const userAccessToken = await this.exchangeCodeForUserToken(code);
		logger.info({ pageId }, 'Exchanged code for user access token');

		// Step 2: Get page access token
		const pageInfo = await this.getPageAccessToken(userAccessToken, pageId);
		logger.info({ pageId, pageName: pageInfo.name }, 'Retrieved page access token');

		return pageInfo;
	}

	/**
	 * Helper method for HTTPS requests
	 * @private
	 */
	httpsRequest(url) {
		return new Promise((resolve, reject) => {
			https.get(url, (res) => {
				let data = '';
				res.on('data', (chunk) => { data += chunk; });
				res.on('end', () => {
					try {
						const json = JSON.parse(data);
						if (json.error && res.statusCode !== 200) {
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

	/**
	 * Generate random verify token
	 * @param {number} length - Token length (default: 32)
	 * @returns {string} Random token
	 */
	static generateVerifyToken(length = 32) {
		const crypto = require('crypto');
		return crypto.randomBytes(length).toString('hex').substring(0, length);
	}
}

module.exports = new OAuthService();

