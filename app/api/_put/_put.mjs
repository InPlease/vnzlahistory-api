// Helpers
import { cleanedPayload } from "../../helpers/globals.mjs";

const main = ({ app, prisma, prefix }) => {
	app.put(`${prefix}/tag/edit`, async (req, res) => {
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

	app.put(`${prefix}/video/edit`, async (req, res) => {
		try {
			const { id, ui_title, description, tags } = req.body;

			const video_exist = await prisma.video.findUnique({
				where: {
					id,
				},
				include: {
					tags: true,
				},
			});

			if (!video_exist) {
				return res.status(400).json({
					error: "Video does not exist, please provide a correct video ID.",
					errorCode: 400,
				});
			}

			if (!ui_title && !description && !tags) {
				return res.status(400).json({
					error:
						"At least one field must have data (ui_title, description, or tags).",
					errorCode: 400,
				});
			}

			const payload = { description, ui_title };
			const filtered_payload = cleanedPayload(payload);

			if (tags && Array.isArray(tags)) {
				await prisma.video.update({
					where: { id },
					data: {
						tags: {
							deleteMany: {},
						},
					},
				});

				await prisma.video.update({
					where: { id },
					data: {
						tags: {
							create: tags.map((tagId) => ({
								tag: {
									connect: { id: tagId },
								},
							})),
						},
					},
				});
			}

			if (Object.keys(filtered_payload).length > 0) {
				await prisma.video.update({
					where: { id },
					data: {
						...filtered_payload,
					},
				});
			}

			return res.json({
				message: "The video was successfully edited.",
				status: 200,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while editing the video.",
				errorCode: error.code || error.message,
			});
		}
	});
};

export default main;
