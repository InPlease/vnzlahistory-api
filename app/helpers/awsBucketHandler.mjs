import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: process.env.bucket_region });

export const handlerUploadVideo = async (fileName, videoFile) => {
	const uploadParams = {
		Bucket: process.env.BUCKET_NAME,
		Key: fileName,
		Body: videoFile.buffer,
		ContentType: videoFile.mimetype,
	};

	const uploadCommand = new PutObjectCommand(uploadParams);
	return await client.send(uploadCommand);
};
