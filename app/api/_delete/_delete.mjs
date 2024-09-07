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
};
export default main;
