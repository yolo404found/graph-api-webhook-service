'use strict';

const mongoose = require('mongoose');

const DeliveryLogSchema = new mongoose.Schema(
	{
		pageId: { type: String, index: true },
		callbackUrl: { type: String },
		statusCode: { type: Number },
		success: { type: Boolean, index: true },
		attempt: { type: Number, default: 1 },
		errorMessage: { type: String },
		latencyMs: { type: Number },
		requestId: { type: String, index: true },
		payloadSize: { type: Number },
	},
	{ timestamps: true, collection: 'delivery_logs' }
);

module.exports = mongoose.model('DeliveryLog', DeliveryLogSchema);


