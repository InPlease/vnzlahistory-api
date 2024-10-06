// Dependencies
import fs from "node:fs";
import multer from "multer";
import path from "node:path";

// Helpers
import { uploadVideo } from "../../helpers/blackblaze.mjs";
import {
	__dirname,
	NEWS_REQUEST_INTERVAL_HOURS,
} from "../../helpers/generics.mjs";

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

const main = ({ app, prisma, prefix }) => {
	app.post(`${prefix}/create/tag`, async (req, res) => {
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

	app.post(
		`${prefix}/create-video`,
		upload.single("videoFile"),
		async (req, res) => {
			try {
				const { bucket_file_name, description, video_tags } = req.body;
				const videoFile = req.file;

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

				const urlFile = `${encodeURIComponent(bucket_file_name)}.${videoFile.filename.split(".")[1]}`;
				const fileName = `${bucket_file_name}.${videoFile.filename.split(".")[1]}`;

				await uploadVideo(process.env.BUCKET_ID, fileName, videoFile.path);

				const fileUrl = `${process.env.BLACK_BASE_URL}/${process.env.BUCKET_NAME}/${urlFile}`;

				const newVideo = await prisma.video.create({
					data: {
						bucket_file_name,
						url: fileUrl,
						description,
						tags: {
							create: JSON.parse(video_tags).map((tagName) => ({
								tag: {
									connectOrCreate: {
										where: { name: tagName },
										create: { name: tagName },
									},
								},
							})),
						},
						createdAt: new Date(),
						is_verified: false,
						is_reported: false,
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
				return res.status(500).json({
					error: "An unexpected error occurred while creating the video",
					errorCode: error.code || error.message,
				});
			} finally {
				if (req.file?.path) {
					try {
						await fs.promises.unlink(req.file.path);
					} catch (err) {
						console.error("Error deleting temp file:", err);
					}
				}
			}
		},
	);

	app.post(`${prefix}/create/rate-limit`, async (req, res) => {
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
			console.error(error);
			res.status(500).json({ error: "Failed to create rate limit." });
		}
	});
};

export default main;
