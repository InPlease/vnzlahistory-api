export const cleanedPayload = (payload) =>
	Object.entries(payload).reduce((acc, [key, value]) => {
		if (value !== "" && value !== undefined) {
			acc[key] = value;
		}
		return acc;
	}, {});
