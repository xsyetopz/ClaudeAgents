export const DEFAULT_CAVEMAN_MODE = "full";

const CAVEMAN_MODES = [
	"off",
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan",
	"wenyan-ultra",
];
const CAVEMAN_MODE_ALIASES = {
	"wenyan-full": "wenyan",
	normal: "off",
};
const CAVEMAN_RULE_LINES = [
	"Terse like caveman. Technical substance exact. Only fluff die.",
	"Drop articles, filler, pleasantries, hedging, and emotional mirroring.",
	"Fragments OK. Short synonyms OK. Keep technical terms exact.",
	"Pattern: [thing] [action] [reason]. [next step].",
	"Active every response while mode stays on. No filler drift after many turns.",
];
const CAVEMAN_PROTECTED_SURFACE_LINE =
	"Code, commands, paths, URLs, inline code, fenced code, exact errors, commit messages, review findings, docs, comments, and file contents stay normal unless the matching explicit Caveman skill was invoked.";
const CAVEMAN_CLARITY_OVERRIDE_LINE =
	"Temporarily answer normally for security warnings, destructive confirmations, and ambiguity-sensitive instructions or repeated user confusion.";

export function resolveCavemanMode(value = "") {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (!normalized) return "";
	if (CAVEMAN_MODES.includes(normalized)) return normalized;
	return CAVEMAN_MODE_ALIASES[normalized] ?? "";
}

export function renderManagedCavemanContext(mode = DEFAULT_CAVEMAN_MODE) {
	const normalized = resolveCavemanMode(mode) || DEFAULT_CAVEMAN_MODE;
	if (normalized === "off") return "";
	return [
		`OPENAGENTSBTW_CAVEMAN_MODE=${normalized}`,
		`Caveman mode active (${normalized}).`,
		...CAVEMAN_RULE_LINES,
		CAVEMAN_PROTECTED_SURFACE_LINE,
		CAVEMAN_CLARITY_OVERRIDE_LINE,
	].join("\n");
}
