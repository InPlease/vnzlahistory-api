import B2 from "backblaze-b2";
import { promises as fs } from "node:fs";

export const b2 = new B2({
	applicationKeyId: process.env.APP_KEY_ID,
	applicationKey: process.env.APP_KEY,
});

export async function GetBucket() {
	try {
		await b2.authorize();
		const response = await b2.getBucket({
			bucketName: process.env.BUCKET_NAME,
		});
		console.log(response.data);
	} catch (err) {
		console.log("Error getting bucket:", err);
	}
}

export async function authenticate() {
	try {
		await b2.authorize();
		console.log("Successfully authenticated with Backblaze B2");
	} catch (err) {
		console.error("Error authenticating with Backblaze B2:", err);
	}
}

export async function uploadVideo(bucketId, videoName, videoPath) {
	try {
		await b2.authorize();

		const uploadUrlResponse = await b2.getUploadUrl({ bucketId });

		const videoBuffer = await fs.readFile(videoPath);

		const uploadResponse = await b2.uploadFile({
			uploadUrl: uploadUrlResponse.data.uploadUrl,
			uploadAuthToken: uploadUrlResponse.data.authorizationToken,
			fileName: videoName,
			data: videoBuffer,
		});

		console.log("Video uploaded successfully:", uploadResponse.data);
	} catch (err) {
		console.error("Error uploading video:", err.message, err.stack);
	}
}
