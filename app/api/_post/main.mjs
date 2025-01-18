// Dependencies
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { MeiliSearch } from "meilisearch";

// Helpers
import { uploadVideo, uploadImage } from "../../helpers/blackblaze.mjs";
import { formatFileName } from "../../helpers/globals.mjs";

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads/");

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});
const upload = multer({ storage: storage });

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
				error: "An unexpected error occurred while creating the tag",
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

	app.post(
		"/create-video",
		upload.fields([
			{ name: "videoFile", maxCount: 1 },
			{ name: "thumbnail", maxCount: 1 },
		]),
		async (req, res) => {
			try {
				const host = process.env.MILLI_HOST_RAILWAY;
				const apiKey = process.env.MILLI_HOST_RAILWAY_API_KEY;

				const { bucket_file_name, description, video_tags, indexName } =
					req.body;

				if (!indexName) {
					return res.status(400).json({
						success: false,
						message: "Index name is required",
					});
				}

				const client = new MeiliSearch({
					host: host,
					apiKey: apiKey,
				});

				const videoFile = req.files?.videoFile?.[0];
				const thumbnailFile = req.files?.thumbnail?.[0];

				if (!videoFile) {
					return res.status(400).json({
						error: "No video file uploaded",
						is_video_received: false,
					});
				}

				const alreadyExistVideo = await prisma.video.findUnique({
					where: {
						bucket_file_name,
					},
				});
				if (alreadyExistVideo) {
					return res.status(409).json({
						error: "A video with this file name already exists",
						already_exist: true,
					});
				}

				const formattedName = formatFileName(bucket_file_name);
				const urlFile = `${formattedName}.${videoFile.filename.split(".")[1]}`;
				const fileName = `${formattedName}.${videoFile.filename.split(".")[1]}`;
				const uploadVideoToBucket = await uploadVideo(
					process.env.BUCKET_ID,
					"videos",
					fileName,
					videoFile.path,
				);

				if (uploadVideoToBucket?.status !== 201) {
					return res.status(uploadVideoToBucket.status).json({
						error: uploadVideoToBucket.error_message,
						status: uploadVideoToBucket.status,
					});
				}

				let thumbnailUrl = null;

				if (thumbnailFile) {
					const thumbnailFormattedName = formatFileName(
						`thumbnail-${bucket_file_name}`,
					);
					const thumbnailFileName = `${thumbnailFormattedName}.${thumbnailFile.filename.split(".")[1]}`;

					thumbnailUrl = `${process.env.BLACKBLAZE_BASE_URL}/thumbnails/${thumbnailFileName}`;

					const thumbnailExist = await prisma.image.findUnique({
						where: {
							url: thumbnailUrl,
						},
					});

					if (!thumbnailExist?.url) {
						await uploadImage(
							process.env.BUCKET_ID,
							"thumbnails",
							thumbnailFileName,
							thumbnailFile.path,
						);

						await prisma.image.create({
							data: {
								url: thumbnailUrl,
							},
						});
					} else {
						console.warn({
							message: "Skipping thumbnail creation since it already exists",
							status: 200,
						});
					}
				}

				const currTags = await prisma.tag.findMany({});
				const tagsMap = currTags.reduce((acc, tag) => {
					acc[tag.id] = tag.name;
					return acc;
				}, {});
				const getTagsNames = JSON.parse(video_tags).map(
					(tagId) => tagsMap[tagId],
				);

				const newVideo = await prisma.video.create({
					data: {
						bucket_file_name: urlFile,
						url: `${process.env.BLACKBLAZE_BASE_URL}/videos/${urlFile}`,
						description,
						tags: getTagsNames.join(","),
						createdAt: new Date(),
						is_verified: false,
						is_reported: false,
						views: 0,
						thumbnailUrl,
						ui_title: bucket_file_name,
					},
				});

				const documents = [
					{
						id: newVideo.id,
						images: thumbnailUrl ? [thumbnailUrl] : [],
						name: urlFile,
						description,
						createdAt: newVideo.createdAt.toISOString(),
						updatedAt: newVideo.createdAt.toISOString(),
						tags: getTagsNames,
						views: 0,
					},
				];

				const index = client.index(indexName);

				try {
					await index.addDocuments(documents);
				} catch (meiliError) {
					return res.status(500).json({
						success: false,
						message: "Failed to add video to search index",
						error: meiliError.message,
					});
				}

				res.status(201).json({
					message: "Video was uploaded successfully, enjoy!",
					status: 201,
					videoInfo: {
						...newVideo,
						video_tags,
					},
					is_video_received: true,
				});
			} catch (error) {
				return res.status(500).json({
					error: "An unexpected error occurred while creating the video",
					errorCode: error.code || error.message,
				});
			} finally {
				if (req.files?.videoFile?.[0]?.path) {
					try {
						await fs.promises.unlink(req.files.videoFile[0].path);
					} catch (err) {
						console.error("Error deleting temp video file:", err);
					}
				}

				if (req.files?.thumbnail?.[0]?.path) {
					try {
						await fs.promises.unlink(req.files.thumbnail[0].path);
					} catch (err) {
						console.error("Error deleting temp thumbnail file:", err);
					}
				}
			}
		},
	);

	app.post(
		"/create/image",
		upload.fields([{ name: "historyImage", maxCount: 1 }]),
		async ({ req }) => {
			const { description, altText } = req.body;
			const historyImages = req.files?.history_images?.[0];

			const client = new MeiliSearch({
				host: host,
				apiKey: apiKey,
			});

			const index = client.index(indexName);

			let historyImagesUrl = null;

			const newVideo = await prisma.Image.create({
				data: {
					url: `${process.env.BLACKBLAZE_BASE_URL}/videos/${urlFile}`,
					description,
					altText,
				},
			});

			const historyImageDocument = [
				{
					id: newVideo.id,
					url: history_images,
					description,
					altText,
				},
			];

			if (historyImages) {
				const thumbnailFormattedName = formatFileName(
					`history_images-${bucket_file_name}`,
				);
				const historyImageName = `${thumbnailFormattedName}.${thumbnailFile.filename.split(".")[1]}`;

				historyImagesUrl = `${process.env.BLACKBLAZE_BASE_URL}/history_images/${historyImageName}`;

				const history_image = await prisma.image.findUnique({
					where: {
						url: historyImagesUrl,
					},
				});

				if (!history_image) {
					const response = await index.addDocuments(documents);

					await uploadImage(
						process.env.BUCKET_ID,
						"historyImage",
						historyImageName,
						historyImages.path,
					);
				}
			}
		},
	);

	app.post("/create/historical/folder", async (req, res) => {
		const { name } = req.body;

		if (!name) {
			return res.status(404).json({
				error: "We are missing a parameter, pelase check for folder_name",
			});
		}

		try {
			const folder = await prisma.historyFolder.create({
				data: {
					type: "folder",
					content: "",
					name,
				},
			});
			res.status(201).json(folder);
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: "Error, there was an issue trying to create a historical folder",
			});
		}
	});

	app.post("/create/historical/file", async (req, res) => {
		const { name, content, folderId } = req.body;

		if (!name || !folderId) {
			return res.status(404).json({
				error:
					"We are missing a parameter, please check for name, content or folderIs.",
			});
		}

		try {
			const folder = await prisma.historyFolder.findUnique({
				where: { id: folderId },
			});

			if (!folder) {
				return res.status(404).json({ error: "Folder was not found" });
			}

			const file = await prisma.file.create({
				data: {
					type: "file",
					name,
					content,
					folderId,
				},
			});
			res.status(201).json(file);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Error creating the historical file" });
		}
	});

	app.post("/search/add", async (req, res) => {
		const host = process.env.MILLI_HOST_RAILWAY;
		const apiKey = process.env.MILLI_HOST_RAILWAY_API_KEY;

		const indexName = req.body.indexName;
		const documents = req.body.documents;
		const type = req.body.type;

		if (!indexName || !documents) {
			return res.status(400).json({
				success: false,
				message: "Index name and documents are required",
			});
		}

		const client = new MeiliSearch({
			host: host,
			apiKey: apiKey,
		});

		const index = client.index(indexName);

		try {
			const response = await index.addDocuments(documents);

			await prisma.history.create({
				data: {
					content: "",
					type,
				},
			});

			res.status(200).json({
				success: true,
				message: "Documents added successfully",
				data: response,
			});
		} catch (error) {
			console.error("Error adding documents:", error);
			res.status(500).json({
				success: false,
				message: "Error adding documents",
				error: error.message,
			});
		}
	});

	app.post("/create/config", async (req, res) => {
		/**
		 * Just to let you know this is the first one where I create a isUpdate property to update
		 * the config if needed, usually we create edits inside of the _put, but didn't want to
		 * create another endpoint for it.
		 *
		 * Type (Number)
		 *
		 * 1 - Header Ads Left
		 * 2 - Header Ads Right
		 *
		 * Coming soon
		 */
		const { type, url, section, isUpdate } = req.body;

		if (typeof type !== "number") {
			return res.status(500).json({
				error: "Error, the type should be a valid number",
			});
		}

		if (!type || !url || !section) {
			return res.status(500).json({
				error: "Error, we are missing some fields in body",
			});
		}

		try {
			const existType = await prisma.pageSettingConfig.findUnique({
				where: {
					type,
				},
			});

			if (existType && !isUpdate) {
				return res.status(403).json({
					error:
						"This setting already exists. If you want to update it, please send isUpdate (true) as a body property.",
				});
			}

			if (existType && isUpdate) {
				const updatedConfig = await prisma.pageSettingConfig.update({
					where: {
						type,
					},
					data: {
						configs: JSON.stringify({ url, section }),
					},
				});

				return res.status(200).json({
					message: "Configuration updated successfully",
					data: updatedConfig,
				});
			}

			const newConfig = await prisma.pageSettingConfig.create({
				data: {
					type,
					configs: JSON.stringify({ url, section }),
				},
			});

			return res.status(201).json({
				message: "Configuration created successfully",
				data: newConfig,
			});
		} catch (error) {
			console.error("Error creating or updating configuration:", error);
			return res.status(500).json({
				error:
					"An error occurred while creating or updating the configuration.",
			});
		}
	});

	app.post("/video/related", async (req, res) => {
		const { videoId, relatedVideoIds } = req.body;

		if (
			!videoId ||
			!Array.isArray(relatedVideoIds) ||
			relatedVideoIds.length === 0
		) {
			return res.status(400).json({
				message: "Both videoId and relatedVideoIds array are required",
			});
		}

		try {
			const filteredRelatedVideoIds = relatedVideoIds.filter(
				(id) => id !== videoId,
			);

			if (filteredRelatedVideoIds.length === 0) {
				return res.status(400).json({
					message: "No valid related videos found after filtering",
				});
			}

			const video = await prisma.video.findUnique({ where: { id: videoId } });

			if (!video) {
				return res.status(404).json({ message: "Video not found" });
			}

			const existingRelations = await prisma.relatedInfo.findMany({
				where: {
					idEntity: videoId,
					relatedEntityId: {
						in: filteredRelatedVideoIds,
					},
				},
			});

			const existingRelatedIds = existingRelations.map(
				(relation) => relation.relatedEntityId,
			);

			const newRelatedVideoIds = filteredRelatedVideoIds.filter(
				(id) => !existingRelatedIds.includes(id),
			);

			if (newRelatedVideoIds.length === 0) {
				return res.status(200).json({
					message: "All provided related videos are already linked",
				});
			}

			const relatedInfoData = newRelatedVideoIds.map((relatedVideoId) => ({
				idEntity: videoId,
				relatedEntityId: relatedVideoId,
			}));

			const newRelatedInfos = await prisma.relatedInfo.createMany({
				data: relatedInfoData,
			});

			return res.status(201).json({
				message: "Related videos added successfully",
				data: newRelatedInfos,
			});
		} catch (error) {
			console.error("Error creating related videos:", error);
			return res.status(500).json({
				message: "An error occurred while creating the related videos",
			});
		}
	});
};

export default main;
