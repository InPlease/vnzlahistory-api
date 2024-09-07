import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { uploadVideo } from "../../helpers/blackblazeIntegration.mjs";
import { __dirname } from "../../helpers/ESModuleHandlers.mjs";

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
				error: "An unexpected error occurred while creating the video",
				errorCode: error.code,
			});
		}
	});

	app.post("/create-video", upload.single("videoFile"), async (req, res) => {
		try {
			const { title, description, video_tags } = req.body;
			const videoFile = req.file;

			if (!videoFile) {
				return res
					.status(400)
					.json({ error: "No video file uploaded", is_video_received: false });
			}

			const alreadyExistVideo = await prisma.video.findUnique({
				where: {
					title,
				},
			});

			if (alreadyExistVideo) {
				return res.status(409).json({
					error: "A video with this title already exists",
					already_exist: true,
				});
			}

			const urlFile = `${encodeURIComponent(title)}.${videoFile.filename.split(".")[1]}`;
			const fileName = `${title}.${videoFile.filename.split(".")[1]}`;

			await uploadVideo(process.env.BUCKET_ID, fileName, videoFile.path);

			const fileUrl = `${process.env.BLACK_BASE_URL}/${process.env.BUCKET_NAME}/${urlFile}`;

			const newVideo = await prisma.video.create({
				data: {
					title,
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

			res.status(201).json({
				message: "Video was uploaded successfully, enjoy!",
				status: 201,
				videoInfo: newVideo,
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
	});
};

export default main;
