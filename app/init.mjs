// Dependencies
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { rateLimit } from "express-rate-limit";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import apicache from "apicache";
import express from "express";
import cors from "cors";

// Configs
import { rateLimitFunction } from "./helpers/rateLimiters.mjs";

// Helpers
import { cacheTime } from "./helpers/globals.mjs";

// Routes
import MainGet from "./api/_get/main.mjs";
import MainPost from "./api/_post/main.mjs";
import MainDelete from "./api/_delete/_main.mjs";
import MainPut from "./api/_put/_main.mjs";

const ratelimitConfigs = rateLimitFunction(rateLimit);

const cache = apicache.middleware;
apicache.options({ debug: true });

const turso = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSQL(turso);
const prisma = new PrismaClient({ adapter });

const app = express();
const port = process.env.PORT;

app.use(ratelimitConfigs.generalLimiter);
app.use(
	cors({
		origin: process.env.UI_URL,
	}),
);
app.use(express.json());
const params = {
	app,
	prisma,
	ratelimitConfigs,
	prefix: process.env.BASE_URL,
};

app.get(
	`${process.env.BASE_URL}/`,
	cache(cacheTime),
	ratelimitConfigs.generalLimiter,
	async (req, res) => {
		res.send({
			message: "Going great, 🇻🇪 Let's Dance Joropo!",
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
	console.log(
		`Welcome! The backend is working well, and all endpoints will be listening locally on this port → ${port} 🚀`,
	);
});

export default app;
