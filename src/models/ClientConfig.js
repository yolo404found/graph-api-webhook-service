'use strict';

const mongoose = require('mongoose');

const ClientConfigSchema = new mongoose.Schema(
	{
		businessName: { type: String, required: true },
		facebook: {
			pageId: { type: String, required: true, index: true, unique: true },
			appId: { type: String, required: true },
			appSecret: { type: String, required: true },
			verifyToken: { type: String, required: true },
			accessToken: { type: String, required: true },
		},
		webhook: {
			callbackUrl: { type: String, required: true },
			port: { type: Number, default: 0 }, // unused per-tenant here, reserved
		},
		features: {
			autoPostToTelegram: { type: Boolean, default: false },
			logIncomingData: { type: Boolean, default: true },
			keepRawPayloadDays: { type: Number, default: 30 },
		},
	},
	{ timestamps: true, collection: 'client_configs' }
);

module.exports = mongoose.model('ClientConfig', ClientConfigSchema);


