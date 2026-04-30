export function stableJson(value: unknown): string {
	return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortJson);
	}

	if (typeof value !== "object" || value === null) {
		return value;
	}

	const record = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		sorted[key] = sortJson(record[key]);
	}
	return sorted;
}
