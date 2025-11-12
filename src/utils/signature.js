'use strict';

const crypto = require('crypto');

function createHmacSignature(payloadBuffer, secret) {
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(payloadBuffer);
	return `sha256=${hmac.digest('hex')}`;
}

module.exports = {
	createHmacSignature,
};


