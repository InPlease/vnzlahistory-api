// Dependencies
import { MeiliSearch } from "meilisearch";

// Helpers
import { deleteAllFileVersions } from "../../helpers/blackblaze.mjs";

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

	app.delete("/video/delete", async (req, res) => {
		try {
			const { file_name } = req.body;

			const video_exist = await prisma.video.findUnique({
				where: {
					bucket_file_name: file_name,
				},
			});

			if (!video_exist.id) {
				return res.json({
					message: "The video does not exist.",
					status: 404,
				});
			}

			const deletionResponse = await deleteAllFileVersions(
				process.env.BUCKET_VIDEOS_ID,
				file_name,
			);

			return res.json({
				message: deletionResponse.message,
				status: 200,
			});
		} catch (err) {
			res.status(500).send({
				error: "An unexpected error occurred while deleting the tag",
				errorCode: err.code,
			});
		}
	});

	app.delete("/news", async (req, res) => {
		const { url } = req.body;

		if (!url) {
			return res.status(400).json({ error: "URL is required" });
		}

		try {
			const newsItem = await prisma.news.findUnique({
				where: { url: url },
			});

			if (!newsItem) {
				return res.status(404).json({ error: "News item not found" });
			}

			await prisma.news.delete({
				where: { url: url },
			});

			return res
				.status(200)
				.json({ message: "News item deleted successfully" });
		} catch (error) {
			console.error("Error deleting news item:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	});

	app.delete("/folders/:id", async (req, res) => {
		const { id } = req.params;

		if (!id) {
			return res
				.status(400)
				.json({ error: "We are missing id property in body." });
		}

		try {
			const deletedFolder = await prisma.historyFolder.delete({
				where: { id },
			});
			res
				.status(200)
				.json({ message: "Carpeta eliminada correctamente.", deletedFolder });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Error al eliminar la carpeta." });
		}
	});

	app.delete("/files/:id", async (req, res) => {
		const { id } = req.params;

		if (!id) {
			return res
				.status(400)
				.json({ error: "We are missing id property in body." });
		}

		try {
			const deletedFile = await prisma.file.delete({
				where: { id },
			});
			res
				.status(200)
				.json({ message: "Archivo eliminado correctamente.", deletedFile });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Error al eliminar el archivo." });
		}
	});

	app.delete("/search/deleteAll", async (req, res) => {
		const host = process.env.MILLI_HOST_RAILWAY;
		const apiKey = process.env.MILLI_HOST_RAILWAY_API_KEY;
		const indexName = req.query.indexName;

		if (!indexName) {
			return res.status(400).json({
				success: false,
				message: "Index name is required",
			});
		}

		const client = new MeiliSearch({
			host: host,
			apiKey: apiKey,
		});

		const index = client.index(indexName);

		try {
			// Primero eliminar todos los documentos del índice
			const deleteDocsResponse = await index.deleteAllDocuments();

			// Luego eliminar el índice completo
			const deleteIndexResponse = await client.deleteIndex(indexName);

			res.status(200).json({
				success: true,
				message: `All documents and index ${indexName} have been deleted`,
				data: {
					deleteDocumentsResponse: deleteDocsResponse,
					deleteIndexResponse: deleteIndexResponse,
				},
			});
		} catch (error) {
			console.error("Error deleting documents and index:", error);
			res.status(500).json({
				success: false,
				message: "Error deleting documents and index",
				error: error.message,
			});
		}
	});

	app.delete("/search/deleteItem", async (req, res) => {
		const host = process.env.MILLI_HOST_RAILWAY;
		const apiKey = process.env.MILLI_HOST_RAILWAY_API_KEY;
		const indexName = req.query.indexName;
		const documentId = req.query.documentId;

		if (!indexName) {
			return res.status(400).json({
				success: false,
				message: "Index name is required",
			});
		}

		if (!documentId) {
			return res.status(400).json({
				success: false,
				message: "Document ID is required",
			});
		}

		const client = new MeiliSearch({
			host: host,
			apiKey: apiKey,
		});

		const index = client.index(indexName);

		try {
			const deleteResponse = await index.deleteDocument(documentId);

			res.status(200).json({
				success: true,
				message: `Document with ID ${documentId} has been deleted from index ${indexName}`,
				data: deleteResponse,
			});
		} catch (error) {
			console.error("Error deleting document:", error);
			res.status(500).json({
				success: false,
				message: "Error deleting document",
				error: error.message,
			});
		}
	});
};
export default main;
