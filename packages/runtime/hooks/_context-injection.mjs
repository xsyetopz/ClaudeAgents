import { asString } from "./_runtime.mjs";

export function evaluateContextInjection(payload) {
	const route = asString(payload.route);
	const provider = asString(payload.provider);
	if (!(route && provider)) {
		return {
			decision: "warn",
			reason: "Context input missing route or provider.",
		};
	}
	return {
		decision: "pass",
		reason: "Context injection payload accepted.",
		details: [`provider=${provider}`, `route=${route}`],
	};
}
