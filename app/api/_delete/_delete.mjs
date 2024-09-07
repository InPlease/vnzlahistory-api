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
			const { file_name } = res;

			await deleteAllFileVersions(process.env.BUCKET_ID, file_name);
			res.json({
				message: "Video was deleted.",
				status: 200,
			});
		} catch (err) {
			res.status(500).send({
				error: "An unexpected error occurred while deleting the tag",
				errorCode: error.code,
			});
		}
	});
};
export default main;
