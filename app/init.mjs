// Dependencies
import dotenv from "dotenv";
import path from "node:path";
import express from "express";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { rateLimit } from "express-rate-limit";
import apicache from "apicache";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import cors from "cors";

// Configs
import { rateLimitFunction } from "./helpers/rateLimiters.mjs";

// Routes
import MainGet from "./api/_get/main.mjs";
import MainPost from "./api/_post/main.mjs";
import MainDelete from "./api/_delete/_delete.mjs";
import MainPut from "./api/_put/_put.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ratelimitConfigs = rateLimitFunction(rateLimit);

const cache = apicache.middleware;
apicache.options({ debug: true });

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const turso = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(turso);
export const prisma = new PrismaClient({ adapter });

const app = express();
const port = process.env.PORT || 3000;

app.use(ratelimitConfigs.generalLimiter);
app.use(
	cors({
		origin: "http://localhost:3000",
	}),
);
app.use(express.json());

const params = {
	app,
	prisma,
	ratelimitConfigs,
};

app.get(
	"/",
	cache("5 minutes"),
	ratelimitConfigs.generalLimiter,
	async (req, res) => {
		res.send({
			message: "Workin well my guys",
			status: 200,
		});

		apicache.clear("/");
	},
);

MainGet(params);
MainPost(params);
MainDelete(params);
MainPut(params);

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
