import { GetBucketFiles } from "../../helpers/blackblazeIntegration.mjs";

const main = ({ app, prisma }) => {
	app.get("/tag/list", async (req, res) => {
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

	app.get("/videos/list", async (req, res) => {
		try {
			const videoUrls = await GetBucketFiles();
			res.json({
				videos: videoUrls,
				status: 200,
			});
		} catch (error) {
			console.error("Error in /videos/list:", error);
			res.status(500).send({
				error: "An unexpected error occurred while fetching the video list",
				errorCode: error.code,
			});
		}
	});
};

export default main;
