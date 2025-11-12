'use strict';

const { logger } = require('../utils/logger');

class RetryQueue {
	constructor(maxAttempts, baseBackoffMs) {
		this.maxAttempts = maxAttempts;
		this.baseBackoffMs = baseBackoffMs;
		this.timers = new Set();
	}

	stop() {
		for (const t of this.timers) {
			clearTimeout(t);
		}
		this.timers.clear();
	}

	schedule(taskFn, attempt) {
		if (attempt >= this.maxAttempts) {
			logger.warn({ attempt }, 'Max retry attempts reached, dropping task');
			return;
		}
		const delay = this.baseBackoffMs * Math.pow(2, attempt);
		const timer = setTimeout(async () => {
			this.timers.delete(timer);
			try {
				await taskFn(attempt + 1);
			} catch (err) {
				logger.error({ err }, 'Retry task failed unexpectedly');
			}
		}, delay);
		this.timers.add(timer);
	}
}

module.exports = {
	RetryQueue,
};


