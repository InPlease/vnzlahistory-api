export const cleanedPayload = (payload) =>
	Object.entries(payload).reduce((acc, [key, value]) => {
		if (value !== "" && value !== undefined) {
			acc[key] = value;
		}
		return acc;
	}, {});

export const __dirname = import.meta.dirname;

export const cacheTime = "5 minutes";

export const NEWS_REQUEST_INTERVAL_HOURS = 1.6 * 60 * 60 * 1000; // 1.6 horas
