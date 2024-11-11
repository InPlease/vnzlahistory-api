// Variables
export const cacheTime = "5 minutes";

export const NEWS_REQUEST_INTERVAL_HOURS = 1.6 * 60 * 60 * 1000;

// Validate scenarios when keys or something are wrong
export const newsUrls = (category, search) => {
	return {
		newsdata: {
			url: `${process.env.NEWS_DATA_BASE_URL}?apikey=${process.env.NEWS_DATA_API_KEY}&removeduplicate=1&language=es&image=1&country=ve${category ? `&category=${category}` : ""}`,
			data_key: "results",
		},
		gnews: {
			url: `${process.env.GNEWS_BASE_URL}/top-headlines?category=${category}&lang=es&max=30&apikey=${process.env.GNEWS_API_KEY}`,
			data_key: "articles",
		},
		thenewsapi: {
			url: `${process.env.THE_NEWS_BASE_URL}/top?api_token=${process.env.THE_NEWS_API_KEY}&locale=us&limit=5&language=es${search ? `&search=${search}` : ""}`,
			data_key: "data",
		},
	};
};

// Methods
export const cleanedPayload = (payload) =>
	Object.entries(payload).reduce((acc, [key, value]) => {
		if (value !== "" && value !== undefined) {
			acc[key] = value;
		}
		return acc;
	}, {});

/**
 * @param {string} source - News source name
 * @param {Prisma} prisma
 * @param {boolean} reFill - When we need data, enable this by body request (Take care)
 */
export async function canMakeRequest(source, prisma, reFill) {
	const rateLimit = await prisma.rateLimit.findFirst({
		where: { source: source },
	});

	if (!rateLimit) {
		throw new Error(`Source was not found: ${source}`);
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

	if (reFill) {
		await prisma.requestLog.create({
			data: {
				source: source,
				createdAt: currentDate,
			},
		});

		return true;
	}

	if (!lastRequestLog) {
		await prisma.requestLog.create({
			data: {
				source: source,
				createdAt: currentDate,
			},
		});

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

export const centralizeNewsProperties = (
	article,
	sourceId,
	source,
	category,
) => {
	switch (source) {
		case "newsdata":
			return {
				title: article.title || "news.not_available_title",
				content:
					article.description ||
					article.content ||
					"news.not_available_content",
				author:
					article.creator?.[0] ||
					article.creator ||
					article.author ||
					"source.unknown",
				url: article.link || article.url,
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
		case "gnews":
			return {
				title: article.title || "news.not_available_title",
				content: article.content || "news.not_available_content",
				author:
					article.source?.name || article.author || "news.not_available_author",
				url: article.url,
				image: article.image,
				category,
				publishedAt: new Date(article.pubDate || article.publishedAt),
				newsSourceId: sourceId,
			};
		case "thenewsapi":
			return {
				title: article.title || "news.not_available_title",
				content:
					article.description ||
					article.content ||
					"news.not_available_content",
				author: article.source || article.author || "news.not_available_author",
				url: article.url,
				image: article.image_url || article.image,
				category: article.categories[0] || article.categories,
				publishedAt: new Date(article.published_at || article.publishedAt),
				newsSourceId: sourceId,
				language: article.locale || article.language,
			};
		default:
			return false;
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
