import multer from "multer";
import { handlerUploadVideo } from "../../helpers/awsBucketHandler.mjs";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const main = ({ app, prisma }) => {
	app.post("/create/tag", async (req, res) => {
		try {
			const { tag_name } = res;

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
			console.error("Error creating video:", error);
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
				return res.status(400).send("No video videoFile uploaded");
			}

			const fileName = `${Date.now()}_${videoFile.originalname}`;

			await handlerUploadVideo(fileName, videoFile.buffer); // Use buffer for in-memory storage

			const s3Url = `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${fileName}`;

			const newVideo = await prisma.video.create({
				data: {
					title,
					description,
					url: s3Url,
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

			res.json(newVideo);
		} catch (error) {
			console.error("Error creating video:", error);
			res.status(500).send("Error creating video");
		}
	});
};

export default main;
