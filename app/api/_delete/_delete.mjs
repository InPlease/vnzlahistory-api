// Helpers
import { deleteAllFileVersions } from "../../helpers/blackblaze.mjs";

const main = ({ app, prisma, prefix }) => {
	app.delete(`${prefix}/tag/delete`, async (req, res) => {
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

	app.delete(`${prefix}/video/delete`, async (req, res) => {
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
};
export default main;
