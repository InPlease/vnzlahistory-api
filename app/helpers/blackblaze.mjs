// Dependencies
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

export async function GetBucketFiles() {
	let videoFiles = [];
	let nextFileName = null;

	try {
		await b2.authorize();

		do {
			const response = await b2.listFileNames({
				bucketId: process.env.BUCKET_ID,
				startFileName: nextFileName,
				maxFileCount: 20,
			});

			const files = response.data.files.map((file) => ({
				fileName: file.fileName,
				url: `${process.env.BLACK_BASE_URL}/${process.env.BUCKET_NAME}/${encodeURIComponent(file.fileName)}`,
			}));

			videoFiles = [...videoFiles, ...files];

			nextFileName = response.data.nextFileName;
		} while (nextFileName);

		return videoFiles;
	} catch (err) {
		console.error("Error fetching video URLs:", err);
		throw err;
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

/**
 * @param {string} bucketId
 * @param {string} videoName
 * @param {string} videoPath
 */
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

/**
 * @why Right now in the B2 documentation we don't have a quick way to delete
 * a file with all its versins, we are force to make it using loops
 * @param {string} bucketId
 * @param {string} fileName
 */
export async function deleteAllFileVersions(bucketId, fileName) {
	try {
		await b2.authorize();

		let fileVersions = [];
		let nextFileName = null;
		let nextFileId = null;

		do {
			const response = await b2.listFileVersions({
				bucketId: bucketId,
				startFileName: nextFileName,
				startFileId: nextFileId,
				maxFileCount: 100,
			});

			const {
				files,
				nextFileName: nextFile,
				nextFileId: nextId,
			} = response.data;
			fileVersions = [...fileVersions, ...files];
			nextFileName = nextFile;
			nextFileId = nextId;
		} while (nextFileName && nextFileId);

		for (const file of fileVersions) {
			if (file.fileName === fileName) {
				await b2.deleteFileVersion({
					fileId: file.fileId,
					fileName: file.fileName,
				});
			}
		}

		console.log(`All versions of file '${fileName}' deleted successfully.`);
	} catch (err) {
		console.error(
			`Error deleting versions of file '${fileName}':`,
			err.message,
		);
		throw err;
	}
}
