const main = ({ app, prisma }) => {
	app.put("/tag/edit", async (req, res) => {
		try {
			const { id, new_name } = req.body;

			const tagToUpdate = await prisma.tag.findUnique({
				where: {
					id,
				},
			});

			if (!tagToUpdate) {
				return res.status(404).json({
					error: "Tag ID does not exist",
				});
			}

			const existingTag = await prisma.tag.findUnique({
				where: {
					name: new_name,
				},
			});

			if (existingTag) {
				return res.status(400).json({
					error: "The new tag name is already in use",
				});
			}

			const updatedTag = await prisma.tag.update({
				where: {
					id,
				},
				data: {
					name: new_name,
				},
			});

			res.json({
				message: "Tag was updated successfully",
				status: 200,
				updatedTag,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while editing the tag",
				errorCode: error.code,
			});
		}
	});
};

export default main;
