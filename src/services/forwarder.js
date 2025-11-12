'use strict';

const axios = require('axios');
const { performance } = require('perf_hooks');
const DeliveryLog = require('../models/DeliveryLog');
const { createHmacSignature } = require('../utils/signature');
const { logger } = require('../utils/logger');

async function forwardPayload({ callbackUrl, secretToken, rawBodyBuffer, requestId, pageId, timeoutMs }) {
	const started = performance.now();
	let statusCode = 0;
	let errorMessage = '';
	try {
		const signature = createHmacSignature(rawBodyBuffer, secretToken);
		const res = await axios.post(callbackUrl, rawBodyBuffer, {
			headers: {
				'Content-Type': 'application/json',
				'X-Service-Signature': signature,
				'X-Service-Request-Id': requestId,
				'X-Facebook-Page-Id': pageId,
			},
			timeout: timeoutMs,
			maxBodyLength: 10 * 1024 * 1024,
			validateStatus: () => true,
		});
		statusCode = res.status;
		return { ok: res.status >= 200 && res.status < 300, statusCode };
	} catch (err) {
		statusCode = err.response ? err.response.status : 0;
		errorMessage = err.message || 'unknown error';
		return { ok: false, statusCode, errorMessage };
	} finally {
		const latencyMs = Math.round(performance.now() - started);
		try {
			await DeliveryLog.create({
				pageId,
				callbackUrl,
				statusCode,
				success: statusCode >= 200 && statusCode < 300,
				attempt: 1,
				errorMessage,
				latencyMs,
				requestId,
				payloadSize: rawBodyBuffer.length,
			});
		} catch (e) {
			logger.warn({ err: e }, 'Failed to persist delivery log');
		}
	}
}

module.exports = {
	forwardPayload,
};


