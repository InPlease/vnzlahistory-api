// Dependencies
import dotenv from "dotenv";
import path from "node:path";
import express from "express";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import cors from "cors";

// Routes
import MainGet from "./api/_get/main.mjs";
import MainPost from "./api/_post/main.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const turso = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(turso);
export const prisma = new PrismaClient({ adapter });

const app = express();
const port = process.env.PORT || 3000;

app.use(
	cors({
		origin: "http://localhost:3000",
	}),
);

app.use(express.json());

const params = {
	app,
	prisma,
};

app.get("/", async (req, res) => {
	res.send({
		message: "Workin well my guys",
		status: 200,
	});
});

MainGet(params);
MainPost(params);

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
