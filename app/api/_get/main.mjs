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
			console.log(error);
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
		try {
			const folders = await prisma.historyFolder.findMany({
				include: {
					files: {
						select: {
							id: true,
							name: true,
							type: true,
						},
					},
				},
			});
			res.status(200).json({
				message: "Folders were collected successfully",
				folders,
			});
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.json({ error: "Error trying to get the historical folder" });
		}
	});

	app.get("/historical/files", async (req, res) => {
		const { id, type } = req.query;

		if (!id) {
			return res
				.status(400)
				.json({ error: "Missing 'id' parameter in the query." });
		}

		const validTypes = ["file", "folder"];
		if (type && !validTypes.includes(type.toLowerCase())) {
			return res.status(400).json({
				error: `Invalid type. Valid types are: ${validTypes.join(", ")}.`,
			});
		}

		try {
			if (type === "folder") {
				const folder = await prisma.historyFolder.findUnique({
					where: { id },
				});

				if (!folder) {
					return res.status(404).json({ error: "Folder not found." });
				}

				return res.status(200).json({
					message: "Folder retrieved successfully.",
					folder,
				});
			}

			const file = await prisma.file.findUnique({
				where: { id },
			});

			if (!file) {
				return res.status(404).json({ error: "File not found." });
			}

			return res.status(200).json({
				message: "File retrieved successfully.",
				file,
			});
		} catch (error) {
			console.error("Error retrieving historical file:", error);
			return res.status(500).json({
				error: "Internal server error while retrieving the historical file.",
			});
		}
	});

	app.get("/search", async (req, res) => {
		const host = process.env.MILLI_HOST_RAILWAY;
		const apiKey = process.env.MILLI_HOST_RAILWAY_API_KEY;

		const q = req.query.q || "";
		const lang = req.query.lang || "en";

		const indexNames = ["heroes", "battles"];

		const client = new MeiliSearch({
			host: host,
			apiKey: apiKey,
		});

		let searchResults = [];

		try {
			for (const indexName of indexNames) {
				const index = client.index(indexName);

				let results;
				if (lang === "es") {
					results = await index.search(q, {
						attributesToRetrieve: [
							"id",
							"birth",
							"title_es",
							"description_es",
							"tags",
							"related_battles",
							"biography",
							"achievements",
							"related_battles",
						],
					});
				} else {
					results = await index.search(q, {
						attributesToRetrieve: [
							"id",
							"birth",
							"title_es",
							"description_es",
							"tags",
							"related_battles",
							"biography",
							"achievements",
							"related_battles",
						],
					});
				}

				searchResults = [...searchResults, ...results.hits];
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
};

export default main;
