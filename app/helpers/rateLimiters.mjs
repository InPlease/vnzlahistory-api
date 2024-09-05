const rateLimitTime = 5 * 60 * 1000; // 5 minutes

export const rateLimitFunction = (rate) => {
	const generalLimiter = rate({
		windowMs: rateLimitTime,
		limit: 10,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: {
			status: 429,
			error:
				"You have exceeded the request limit. Now, you have to wait 15 minutes to refresh. Please try again later.",
		},
		handler: (req, res, next, options) => {
			res.status(options.statusCode).send(options.message);
		},
	});

	const downloadLimiter = rate({
		windowMs: rateLimitTime,
		limit: 5,
		standardHeaders: "draft-7",
		legacyHeaders: false,
	});

	const newsLimiter = rate({
		windowMs: rateLimitTime,
		limit: 200,
		standardHeaders: "draft-7",
		legacyHeaders: false,
	});

	return {
		generalLimiter,
		downloadLimiter,
		newsLimiter,
	};
};
