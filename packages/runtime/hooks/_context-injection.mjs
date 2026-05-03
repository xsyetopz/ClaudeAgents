import { asString } from "./_runtime.mjs";

function hookEvent(payload) {
	return (
		asString(payload.hook_event_name) ||
		asString(payload.hookEventName) ||
		asString(payload.event) ||
		asString(process.env.OAL_HOOK_EVENT)
	);
}

function hookProvider(payload) {
	return (
		asString(payload.provider) ||
		asString(payload.hook_provider) ||
		asString(process.env.OAL_HOOK_PROVIDER)
	);
}

function isLifecycleEvent(event) {
	return (
		event === "SessionStart" ||
		event === "session.created" ||
		event === "session.idle"
	);
}

function pass(reason, details = undefined) {
	return {
		decision: "pass",
		reason,
		...(details ? { details } : {}),
	};
}

export function evaluateLifecycleContextInjection(payload) {
	const event = hookEvent(payload);
	if (isLifecycleEvent(event) || !event) {
		return pass("Lifecycle context hook has no required route metadata.");
	}
	return evaluateRouteContextInjection(payload);
}

export function evaluateRouteContextInjection(payload) {
	const route = asString(payload.route);
	const provider = hookProvider(payload);
	const event = hookEvent(payload);
	if (isLifecycleEvent(event)) {
		return pass("Route context skipped for lifecycle event.");
	}
	if (!(route && provider)) {
		return pass("Route context metadata unavailable for this provider event.");
	}
	return pass("Route context injection payload accepted.", [
		`provider=${provider}`,
		`route=${route}`,
	]);
}

export const evaluateContextInjection = evaluateLifecycleContextInjection;
