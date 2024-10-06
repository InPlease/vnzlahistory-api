export const cleanedPayload = (payload) =>
	Object.entries(payload).reduce((acc, [key, value]) => {
		if (value !== "" && value !== undefined) {
			acc[key] = value;
		}
		return acc;
	}, {});

export const __dirname = import.meta.dirname;

export const cacheTime = "5 minutes";

export const NEWS_REQUEST_INTERVAL_HOURS = 1.6 * 60 * 60 * 1000;

export async function canMakeRequest(source, prisma) {
	const rateLimit = await prisma.rateLimit.findFirst({
		where: { source: source },
	});

	if (!rateLimit) {
		throw new Error(`No se encontró el rate limit para la fuente: ${source}`);
	}

	const currentDate = new Date();
	const lastResetDate = new Date(rateLimit.lastReset);

	// Resetear los contadores si es un nuevo día
	if (currentDate.getDate() !== lastResetDate.getDate()) {
		await prisma.rateLimit.update({
			where: { id: rateLimit.id },
			data: {
				totalRequests: 0,
				totalHourlyRequests: 0,
				lastReset: currentDate,
			},
		});
	}

	const hourlyLimit = Math.ceil(rateLimit.maxRequestsPerDay / 24);
	const currentHour = currentDate.getHours();

	if (currentHour !== lastResetDate.getHours()) {
		await prisma.rateLimit.update({
			where: { id: rateLimit.id },
			data: {
				totalHourlyRequests: 0,
			},
		});
	}

	const lastRequestLog = await prisma.requestLog.findFirst({
		where: { source: source },
		orderBy: { createdAt: "desc" },
	});

	if (!lastRequestLog) {
		return true;
	}

	const timeSinceLastRequest = currentDate - new Date(lastRequestLog.createdAt);
	const requiredInterval = (24 * 60 * 60 * 1000) / rateLimit.maxRequestsPerDay;

	if (timeSinceLastRequest >= requiredInterval) {
		const requestsThisHour = await prisma.requestLog.count({
			where: {
				source: source,
				createdAt: {
					gte: new Date(currentDate.setHours(currentHour, 0, 0, 0)),
					lt: new Date(currentDate.setHours(currentHour + 1, 0, 0, 0)),
				},
			},
		});

		if (requestsThisHour < hourlyLimit) {
			await prisma.rateLimit.update({
				where: { id: rateLimit.id },
				data: {
					totalRequests: rateLimit.totalRequests + 1,
					totalHourlyRequests: rateLimit.totalHourlyRequests + 1,
				},
			});

			await prisma.requestLog.create({
				data: {
					source: source,
					createdAt: currentDate,
				},
			});

			return true;
		}
	}

	return false;
}
