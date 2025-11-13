'use strict';

const mongoose = require('mongoose');

const ClientConfigSchema = new mongoose.Schema(
	{
		businessName: { type: String, required: true },
		objectType: { 
			type: String, 
			enum: ['page', 'group'], 
			required: true,
			default: 'page',
			index: true
		},
		facebook: {
			pageId: { type: String, index: true }, // For pages
			groupId: { type: String, index: true }, // For groups
			objectId: { type: String, required: true, index: true, unique: true }, // Combined unique ID (pageId or groupId)
			appId: { type: String, required: true },
			appSecret: { type: String, required: true },
			verifyToken: { type: String, required: true },
			accessToken: { type: String, default: '' }, // Will be set after OAuth flow
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
		registration: {
			status: { 
				type: String, 
				enum: ['pending', 'authorized', 'completed'], 
				default: 'pending' 
			},
			authUrl: { type: String }, // Authorization URL generated for client
			authorizedAt: { type: Date },
			completedAt: { type: Date },
		},
	},
	{ timestamps: true, collection: 'client_configs' }
);

module.exports = mongoose.model('ClientConfig', ClientConfigSchema);


