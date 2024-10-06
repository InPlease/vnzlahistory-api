// Utils
import { canMakeRequest } from "../../helpers/generics.mjs";

const main = ({ app, prisma, prefix }) => {
	app.get(`${prefix}/tag/list`, async (req, res) => {
		try {
			const tagList = await prisma.tag.findMany();
			res.json({
				tagList: tagList,
				status: 200,
			});
		} catch (error) {
			console.log(error);
			res.status(500).send({
				error: "An unexpected error occurred while getting video",
				errorCode: error.code,
			});
		}
	});

	app.get(`${prefix}/videos/list`, async (req, res) => {
		try {
			const page = Number.parseInt(req.query.page) || 1;
			const limit = Number.parseInt(req.query.limit) || 20;

			const skip = (page - 1) * limit;

			const totalVideos = await prisma.video.count();

			const video_list = await prisma.video.findMany({
				skip: skip,
				take: limit,
			});

			const totalPages = Math.ceil(totalVideos / limit);

			res.status(200).json({
				videos: video_list,
				pagination: {
					currentPage: page,
					totalPages: totalPages,
					totalVideos: totalVideos,
					limit: limit,
				},
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while fetching the video list",
				errorCode: error.code,
			});
		}
	});

	/**
	 * This one is important because it avoids the user from consuming the whole free version
	 * from the news API source. Additionally, the user can actually get the saved news from the
	 * database by using this endpoint.
	 */
	app.get(`${prefix}/news`, async (req, res) => {
		const source = req.query.source;

		if (!source) {
			return res.status(400).json({
				error: "The 'source' parameter must be provided.",
			});
		}

		const canRequest = await canMakeRequest(source, prisma);

		const existingSource = await prisma.newsSource.findUnique({
			where: { source: source },
		});

		const existingNews = existingSource
			? await prisma.news.findMany({
					where: { newsSourceId: existingSource.id },
				})
			: [];

		if (!canRequest) {
			return res.status(429).json({
				error: `Request limit reached for source: ${source}`,
				data: existingNews,
			});
		}

		const apiUrl = `${process.env.MEDIA_STACK_BASE_URL}?access_key=${process.env.MEDIA_STACK_API}&countries=ve`;

		try {
			const response = await fetch(apiUrl);
			const data = await response.json();
			const articles = data.data;
			let savedNewsSource;

			if (!existingSource) {
				savedNewsSource = await prisma.newsSource.create({
					data: {
						source,
					},
				});
			} else {
				savedNewsSource = existingSource;
			}

			const existingNewsUrls = await prisma.news.findMany({
				where: { newsSourceId: savedNewsSource.id },
				select: { url: true },
			});

			const existingUrls = new Set(
				existingNewsUrls.map((newsItem) => newsItem.url),
			);

			const newsData = articles
				.filter((article) => !existingUrls.has(article.url))
				.map((article) => ({
					title: article.title,
					content: article.description,
					author: article.author || "source.unknown",
					url: article.url,
					image: article.image || null,
					category: article.category || "General",
					language: article.language || "en",
					country: article.country || "us",
					publishedAt: new Date(article.published_at),
					newsSourceId: savedNewsSource.id,
				}));

			return res.status(200).json({
				message: "News obtained and saved successfully.",
				data: existingNews.concat(newsData),
			});
		} catch (error) {
			console.error("Error fetching data:", error);
			return res.status(500).json({ error: "Error retrieving news." });
		}
	});
};

export default main;
