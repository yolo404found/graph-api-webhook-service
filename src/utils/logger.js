'use strict';

const pino = require('pino');
const pinoHttp = require('pino-http');

const level = process.env.LOG_LEVEL || 'info';

const logger = pino({
	level,
	base: undefined,
	transport: process.env.NODE_ENV === 'development'
		? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
		: undefined,
});

const httpLogger = pinoHttp({
	logger,
	customSuccessMessage: function (req, res) {
		return `${req.method} ${req.url} ${res.statusCode}`;
	},
	customErrorMessage: function (req, res, err) {
		return `error: ${req.method} ${req.url} ${res.statusCode} ${err && err.message}`;
	},
	autoLogging: true,
	redact: {
		paths: ['req.headers.authorization', 'req.headers.cookie'],
		remove: true,
	},
});

module.exports = {
	logger,
	httpLogger,
};


