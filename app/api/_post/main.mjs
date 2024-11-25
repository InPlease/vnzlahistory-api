// Dependencies
import fs from "node:fs";
import multer from "multer";
import path from "node:path";

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
				const { bucket_file_name, description, video_tags } = req.body;
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
							message: "Skip the the thumbnail creating since it already exist",
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

				console.log(thumbnailUrl);
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
					},
				});

				const response = {
					...newVideo,
					video_tags,
				};

				res.status(201).json({
					message: "Video was uploaded successfully, enjoy!",
					status: 201,
					videoInfo: response,
					is_video_received: true,
				});
			} catch (error) {
				console.log(error);
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
};

export default main;
