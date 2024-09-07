import { cleanedPayload } from "../../helpers/generics.mjs";

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

	app.put("/video/edit", async (req, res) => {
		try {
			/**
			 * 1. Frontend will require at minimum the title, description, and tag.
			 *    We should never receive something different.
			 */
			const { id, title, description, tags } = req.body;

			const video_exist = await prisma.video.findUnique({
				where: {
					id,
				},
			});

			if (!video_exist) {
				return res.status(400).json({
					error: "Video does not exist, please provide a correct video ID.",
					errorCode: 400,
				});
			}

			if (!title && !description && !tags) {
				return res.status(400).json({
					error:
						"At least one field must have data (title, description, or tags).",
					errorCode: 400,
				});
			}

			let parsedTags = [];

			if (tags) {
				try {
					parsedTags = JSON.parse(tags);
					if (!Array.isArray(parsedTags)) {
						throw new Error("Tags should be an array.");
					}
				} catch (err) {
					return res.status(400).json({
						error: `Invalid tags format. Expected JSON array. ${err.message}`,
						errorCode: 400,
					});
				}
			}

			const payload = {
				title,
				description,
				tags: parsedTags,
			};

			const filtered_payload = Object.entries(payload).reduce(
				(acc, [key, value]) => {
					if (value !== undefined && value !== "") {
						acc[key] = value;
					}
					return acc;
				},
				{},
			);

			await prisma.video.update({
				where: {
					id,
				},
				data: {
					...filtered_payload,
				},
			});

			return res.json({
				message: "The video was successfully edited.",
				status: 200,
			});
		} catch (error) {
			console.error("Error editing video:", error);
			res.status(500).send({
				error: "An unexpected error occurred while editing the video.",
				errorCode: error.code || error.message,
			});
		}
	});
};

export default main;
