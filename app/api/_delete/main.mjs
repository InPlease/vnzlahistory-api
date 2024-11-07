// Helpers
import { deleteAllFileVersions } from "../../helpers/blackblaze.mjs";

const main = ({ app, prisma }) => {
	app.delete("/tag/delete", async (req, res) => {
		try {
			const { tag_name } = req.body;

			await prisma.tag.delete({
				where: {
					name: tag_name,
				},
			});

			res.json({
				message: "Tag was deleted successfully",
				status: 200,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while deleting the tag",
				errorCode: error.code,
			});
		}
	});

	app.delete("/video/delete", async (req, res) => {
		try {
			const { file_name } = req.body;

			const video_exist = await prisma.video.findUnique({
				where: {
					bucket_file_name: file_name,
				},
			});

			if (!video_exist.id) {
				return res.json({
					message: "The video does not exist.",
					status: 404,
				});
			}

			const deletionResponse = await deleteAllFileVersions(
				process.env.BUCKET_ID,
				file_name,
			);

			return res.json({
				message: deletionResponse.message,
				status: 200,
			});
		} catch (err) {
			res.status(500).send({
				error: "An unexpected error occurred while deleting the tag",
				errorCode: err.code,
			});
		}
	});

	app.delete("/news", async (req, res) => {
		const { url } = req.body;

		if (!url) {
			return res.status(400).json({ error: "URL is required" });
		}

		try {
			const newsItem = await prisma.news.findUnique({
				where: { url: url },
			});

			if (!newsItem) {
				return res.status(404).json({ error: "News item not found" });
			}

			await prisma.news.delete({
				where: { url: url },
			});

			return res
				.status(200)
				.json({ message: "News item deleted successfully" });
		} catch (error) {
			console.error("Error deleting news item:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	});
};
export default main;
