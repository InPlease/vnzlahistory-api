const main = ({ app, prisma }) => {
	app.post("/create/tag", async (req, res) => {
		try {
			const { tag_name } = req.body;

			const newTag = await prisma.tag.create({
				data: {
					name: tag_name,
				},
			});

			res.json({
				message: "Tag was created",
				tag: newTag,
				status: 200,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while creating the video",
				errorCode: error.code,
			});
		}
	});

	app.post("/create/rate-limit", async (req, res) => {
		const { source, maxRequestsPerDay } = req.body;

		try {
			await prisma.rateLimit.create({
				data: {
					source: source,
					maxRequestsPerDay: maxRequestsPerDay,
					totalRequests: 0,
					totalHourlyRequests: 0,
					lastReset: new Date(),
				},
			});
			res.status(201).json({ message: "Rate limit created successfully." });
		} catch (error) {
			res.status(500).json({
				error:
					"Failed to create rate limit, possible wrong property type on property.",
			});
		}
	});
};

export default main;
