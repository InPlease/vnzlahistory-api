// Variables
export const __dirname = import.meta.dirname;

export const cacheTime = "5 minutes";

export const NEWS_REQUEST_INTERVAL_HOURS = 1.6 * 60 * 60 * 1000;

export const newsUrls = {
	newsdata: {
		url: `${process.env.NEWS_DATA_BASE_URL}?apikey=${process.env.NEWS_DATA_API_KEY}&language=es&country=ve`,
		data_key: "results",
	},
	mediastack: {
		url: `${process.env.MEDIA_STACK_BASE_URL}?access_key=${process.env.MEDIA_STACK_API}&countries=ve`,
		data_key: "news_items",
	},
};

// Methods
export const cleanedPayload = (payload) =>
	Object.entries(payload).reduce((acc, [key, value]) => {
		if (value !== "" && value !== undefined) {
			acc[key] = value;
		}
		return acc;
	}, {});

export async function canMakeRequest(source, prisma) {
	const rateLimit = await prisma.rateLimit.findFirst({
		where: { source: source },
	});

	if (!rateLimit) {
		throw new Error(`No se encontró el rate limit para la fuente: ${source}`);
	}

	const currentDate = new Date();
	const lastResetDate = new Date(rateLimit.lastReset);

	if (currentDate.getDate() !== lastResetDate.getDate()) {
		await prisma.rateLimit.update({
			where: { id: rateLimit.id },
			data: {
				totalRequests: 0,
				totalHourlyRequests: 0,
				lastReset: currentDate,
			},
		});
	}

	const hourlyLimit = Math.ceil(rateLimit.maxRequestsPerDay / 24);
	const currentHour = currentDate.getHours();

	if (currentHour !== lastResetDate.getHours()) {
		await prisma.rateLimit.update({
			where: { id: rateLimit.id },
			data: {
				totalHourlyRequests: 0,
			},
		});
	}

	const lastRequestLog = await prisma.requestLog.findFirst({
		where: { source: source },
		orderBy: { createdAt: "desc" },
	});

	if (!lastRequestLog) {
		return true;
	}

	const timeSinceLastRequest = currentDate - new Date(lastRequestLog.createdAt);
	const requiredInterval = (24 * 60 * 60 * 1000) / rateLimit.maxRequestsPerDay;

	if (timeSinceLastRequest >= requiredInterval) {
		const requestsThisHour = await prisma.requestLog.count({
			where: {
				source: source,
				createdAt: {
					gte: new Date(currentDate.setHours(currentHour, 0, 0, 0)),
					lt: new Date(currentDate.setHours(currentHour + 1, 0, 0, 0)),
				},
			},
		});

		if (requestsThisHour < hourlyLimit) {
			await prisma.rateLimit.update({
				where: { id: rateLimit.id },
				data: {
					totalRequests: rateLimit.totalRequests + 1,
					totalHourlyRequests: rateLimit.totalHourlyRequests + 1,
				},
			});

			await prisma.requestLog.create({
				data: {
					source: source,
					createdAt: currentDate,
				},
			});

			return true;
		}
	}

	return false;
}

export const centralizeNewsProperties = (article, sourceId, source) => {
	switch (source) {
		case "newsdata":
			return {
				title: article.title || "No title available",
				content:
					article.description || article.content || "No content available",
				author:
					article.creator?.[0] ||
					article.creator ||
					article.author ||
					"source.unknown",
				url: article.link,
				image: article.image_url || article.image || null,
				category: Array.isArray(article.category)
					? article.category?.[0]
					: article.category || "General",
				language: article.language || "en",
				country: Array.isArray(article.country)
					? article.country?.[0]
					: article.country || "us",
				publishedAt: new Date(article.pubDate || article.publishedAt),
				newsSourceId: sourceId,
			};
		case "mediastack":
			return {
				title: article.title || "No title available",
				content: article.description || "No content available",
				author: article.author || "source.unknown",
				url: article.url,
				image: article.image || null,
				category: article.category || "General",
				language: article.language || "en",
				country: article.country || "us",
				publishedAt: new Date(article.published_at || article.publishedAt),
				newsSourceId: sourceId,
			};
		default:
			return "Ab errir";
	}
};

// This is FRONTEND
export const organizeNewsData = (layout, news) => {
	const organizedLayout = { ...layout };
	const sections = organizedLayout.components.sections;

	for (const sectionKey of Object.keys(sections)) {
		const components = sections[sectionKey];

		for (const component of components) {
			if (component?.component_data) {
				const { limit, limitPerPage, component_type } =
					component.component_data;

				const currentLimit =
					component_type === "single_news" ? limitPerPage : limit;

				if (currentLimit) {
					const assignedNews = news.slice(0, currentLimit);

					component.component_data.news_data =
						assignedNews.length > 0 ? assignedNews : "No news available";

					news.splice(0, assignedNews.length);
				}
			}
		}
	}

	return organizedLayout;
};
