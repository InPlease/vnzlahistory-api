// Dependencies
import { MeiliSearch } from "meilisearch";

// Utils
import {
	canMakeRequest,
	centralizeNewsProperties,
	newsUrls,
	formatBucketName,
} from "../../helpers/globals.mjs";

const main = ({ app, prisma }) => {
	app.get("/tag/list", async (req, res) => {
		try {
			const tagList = await prisma.tag.findMany();
			res.json({
				tagList: tagList,
				status: 200,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while getting video",
				errorCode: error.code,
			});
		}
	});

	app.get("/videos/list", async (req, res) => {
		try {
			const page = Number.parseInt(req.query.page) || 1;
			const limit = Number.parseInt(req.query.limit) || 1;
			const skip = (page - 1) * limit;

			const totalVideos = await prisma.video.count();
			const videoList = await prisma.video.findMany({
				skip: skip,
				take: limit,
			});

			const videoListWithUrls = await Promise.all(
				videoList.map(async (video) => {
					const transformName = video.bucket_file_name
						.split("_")
						.join(" ")
						.split(".")[0];
					return {
						...video,
						tags: video.tags.split(","),
						ui_title: video.ui_title || transformName,
					};
				}),
			);

			const totalPages = Math.ceil(totalVideos / limit);

			res.status(200).json({
				videos: videoListWithUrls.reverse(),
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

	app.get("/videos/specific", async (req, res) => {
		try {
			const id = Number(req.query.id);
			const video = await prisma.video.findUnique({
				where: {
					id,
				},
			});

			res.status(200).json({
				title: formatBucketName(video.bucket_file_name),
				tags: video.tags,
				description: video.description,
				createdAt: video.createdAt,
				url: video.url,
				views: video.views,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while fetching the specific video",
				errorCode: error.code,
			});
		}
	});

	/**
	 * This one is important because it avoids the user from consuming the whole free version
	 * from the news API source. Additionally, the user can actually get the saved news from the
	 * database by using this endpoint.
	 */
	app.get("/news", async (req, res) => {
		const source = req.query.source;
		const limit = req.query.limit || 30;
		const category = req.query.category;
		const reFill = req.query.reFill;

		if (!source) {
			return res.status(400).json({
				error: "The 'source' parameter must be provided.",
			});
		}

		const canRequest = await canMakeRequest(source, prisma, reFill);

		const existingSource = await prisma.newsSource.findUnique({
			where: { source: source },
		});

		const existingNews = existingSource
			? await prisma.news.findMany({
					where: { newsSourceId: existingSource.id },
				})
			: [];

		if (!canRequest) {
			const clonedExistingNews = [...existingNews];
			const spreadedExistingNews = clonedExistingNews
				.map((news) =>
					centralizeNewsProperties(news, news.newsSourceId, source),
				)
				.reverse()
				.slice(0, limit);

			return res.status(200).json({
				message: `Request limit reached for source: ${source}`,
				data: spreadedExistingNews,
			});
		}

		const apiConfig = newsUrls(category)[source];

		try {
			const response = await fetch(apiConfig.url);
			const data = await response.json();

			const articles = data[apiConfig.data_key];
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
				.map((article) =>
					centralizeNewsProperties(article, savedNewsSource.id, source),
				);

			for (const newsItem of newsData) {
				try {
					if (newsItem.image) {
						const existingNews = await prisma.news.findUnique({
							where: { url: newsItem.url },
						});

						if (!existingNews) {
							await prisma.news.create({
								data: {
									title: newsItem.title,
									content: newsItem.content,
									author: newsItem.author,
									url: newsItem.url,
									image: newsItem.image,
									category: newsItem.category,
									language: newsItem.language,
									country: newsItem.country,
									publishedAt: newsItem.publishedAt,
									newsSourceId: newsItem.newsSourceId,
								},
							});
						} else {
							console.warn(
								`News with URL ${newsItem.url} already exists, skipping...`,
							);
						}
					} else {
						console.log(
							`Skipping news item with URL ${newsItem.url} due to null image.`,
						);
					}
				} catch (error) {
					console.error("Error saving news:", error);
				}
			}

			const allNews = [...newsData, ...existingNews];
			const limitedNews = allNews.slice(0, limit).reverse();

			return res.status(200).json({
				message: "News obtained and saved successfully.",
				data: limitedNews,
			});
		} catch (error) {
			console.error(error, "DATA");
			return res.status(500).json({ error: "Error retrieving news." });
		}
	});

	app.get("/historical", async (req, res) => {
		const id = +req.query.id;

		try {
			const history = await prisma.history.findUnique({
				where: {
					id,
				},
			});

			res.status(200).json({
				message: "Folders were collected successfully",
				history,
			});
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.json({ error: "Error trying to get the historical folder" });
		}
	});

	app.get("/search", async (req, res) => {
		const host = process.env.MILLI_HOST_RAILWAY;
		const apiKey = process.env.MILLI_HOST_RAILWAY_API_KEY;

		const q = req.query.q || "";
		const lang = req.query.lang || "en";

		const indexNames = ["heroes", "videos"];

		const client = new MeiliSearch({
			host: host,
			apiKey: apiKey,
		});

		let searchResults = [];

		if (!q) {
			return res.status(500).json({
				success: false,
				message: "Results not found",
				results: [],
				total: 0,
			});
		}

		try {
			for (const indexName of indexNames) {
				const index = client.index(indexName);

				const results = await index.search(q, {
					attributesToRetrieve: [
						"id",
						"name",
						"death",
						"spouse",
						"images",
						"battles",
						"dateBirth",
						"description",
						"presidencies",
					],
				});

				const resultsWithIndex = results.hits.map((hit) => ({
					...hit,
					indexName,
				}));

				searchResults = [...searchResults, ...resultsWithIndex];
			}

			if (searchResults.length > 0) {
				res.status(200).json({
					success: true,
					message: "Results found",
					results: searchResults,
					total: searchResults.length,
				});
			} else {
				res.status(200).json({
					success: true,
					message: "No documents found",
					results: [],
					total: 0,
				});
			}
		} catch (error) {
			console.error("Error performing search:", error);
			res.status(500).json({
				success: false,
				message: "Error performing search",
				error: error.message,
			});
		}
	});

	app.get("/page/setting", async (req, res) => {
		const type = Number(req.query.type);

		if (typeof type !== "number") {
			res.status(500).json({
				message: "Error, type should a number",
			});
		}
		if (type === null || type === undefined) {
			res.status(500).json({
				message: "Error, we are missing a field",
			});
		}

		const setting = await prisma.pageSettingConfig.findUnique({
			where: {
				type,
			},
		});

		if (!setting) {
			res.status(404).json({
				message: "Record does not exist in our database",
			});
		}
		res.status(200).json({
			message: `Current configuration for type ${type}`,
			setting,
		});
	});
};

export default main;
