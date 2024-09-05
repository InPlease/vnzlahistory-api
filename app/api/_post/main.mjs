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
				message: "tag.be.tag_created",
				tag: newTag,
			});
		} catch (error) {
			console.error("Error creating tag:", error);
			res.status(500).send({
				error: "tag.be.tag_error_created",
			});
		}
	});

	app.post("/create-video", upload.single("videoFile"), async (req, res) => {
		try {
			const { title, description, tags } = req.body;
			const videoFile = req.file;

			if (!videoFile) {
				console.error("No video file uploaded or file handling failed.");
				return res.status(400).json({ error: "No video file uploaded" });
			}

			const fileName = `${Date.now()}_${videoFile.originalname}`;

			await uploadVideo(process.env.BUCKET_ID, fileName, videoFile.path);

			const newVideo = await prisma.video.create({
				data: {
					title,
					description,
					tags: {
						create: JSON.parse(tags).map((tagName) => ({
							Tag: {
								connectOrCreate: {
									where: { name: tagName },
									create: { name: tagName },
								},
							},
						})),
					},
				},
			});

			res.status(201).json({
				message: "Video was uploaded well, enjoy!",
				status: 200,
				videoInfo: newVideo,
			});
		} catch (error) {
			return res.status(500).json({
				error: "An unexpected error occurred while creating the video",
				errorCode: error.code,
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
