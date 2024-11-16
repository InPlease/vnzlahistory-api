const rateLimitTime = 5 * 1000;

export const rateLimitFunction = (rate) => {
	const generalLimiter = rate({
		windowMs: rateLimitTime,
		limit: 10,
		standardHeaders: true,
		legacyHeaders: false,
	});

	return {
		generalLimiter,
	};
};
