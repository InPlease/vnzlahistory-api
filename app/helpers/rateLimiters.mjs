const rateLimitTime = 5 * 1000;

export const rateLimitFunction = (rate) => {
	const generalLimiter = rate({
		windowMs: rateLimitTime,
		limit: 10,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: {
			status: 429,
			error:
				"You have exceeded the request limit. Please wait 5 seconds before trying again.",
		},
		handler: (req, res, next, options) => {
			res.status(options.statusCode).send(options.message);
		},
	});

	const downloadLimiter = rate({
		windowMs: rateLimitTime,
		limit: 2,
		standardHeaders: "draft-7",
		message: {
			status: 429,
			error:
				"You have exceeded the download limit. Now you have to wait 5 minutes",
		},
		legacyHeaders: false,
	});

	return {
		generalLimiter,
		downloadLimiter,
	};
};
