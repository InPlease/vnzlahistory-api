// Helpers
import { GetBucketFiles } from "../../helpers/blackblaze.mjs";

const main = ({ app, prisma, prefix }) => {
	app.get(`${prefix}/tag/list`, async (req, res) => {
		try {
			const tagList = await prisma.tag.findMany();

			res.json({
				tagList: tagList,
				status: 200,
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while creating the video",
				errorCode: error.code,
			});
		}
	});

	app.get(`${prefix}/videos/list`, async (req, res) => {
		try {
			const page = Number.parseInt(req.query.page) || 1;
			const limit = Number.parseInt(req.query.limit) || 20;

			const skip = (page - 1) * limit;

			const totalVideos = await prisma.video.count();

			const video_list = await prisma.video.findMany({
				skip: skip,
				take: limit,
			});

			const totalPages = Math.ceil(totalVideos / limit);

			res.status(200).json({
				videos: video_list,
				pagination: {
					currentPage: page,
					totalPages: totalPages,
					totalVideos: totalVideos,
					limit: limit,
				},
			});
		} catch (error) {
			res.status(500).send({
				error: "An unexpected error occurred while fetching the video list",
				errorCode: error.code,
			});
		}
	});
};

export default main;
