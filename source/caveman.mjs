export const DEFAULT_CAVEMAN_MODE = "full";

export const CAVEMAN_MODES = [
	"off",
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan",
	"wenyan-ultra",
];

export const CAVEMAN_MODE_ALIASES = {
	"wenyan-full": "wenyan",
	normal: "off",
};

export const CAVEMAN_UPSTREAM = {
	repo: "https://github.com/JuliusBrussee/caveman",
	ref: "63e797cd753b301374947a5ed975c21775d962b9",
	mirroredAt: "2026-04-13T00:00:00Z",
	files: ["README.md", ".codex/hooks.json", ".github/copilot-instructions.md"],
};

export const CAVEMAN_ALWAYS_ON_SNIPPET = [
	"Terse like caveman.",
	"Technical substance exact. Only fluff die.",
	"Drop: articles, filler (just/really/basically), pleasantries, hedging.",
	"Fragments OK. Short synonyms OK.",
	"Code unchanged.",
	"Pattern: [thing] [action] [reason]. [next step].",
	"ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.",
	'Code/commits/PRs: normal. Off: "stop caveman" / "normal mode".',
].join(" ");

export const CAVEMAN_RULE_LINES = [
	"Terse like caveman. Technical substance exact. Only fluff die.",
	"Drop articles, filler, pleasantries, hedging, and emotional mirroring.",
	"Fragments OK. Short synonyms OK. Keep technical terms exact.",
	"Pattern: [thing] [action] [reason]. [next step].",
	"Active every response while mode stays on. No filler drift after many turns.",
];

export const CAVEMAN_PROTECTED_SURFACE_LINE =
	"Code, commands, paths, URLs, inline code, fenced code, exact errors, commit messages, review findings, docs, comments, and file contents stay normal unless the matching explicit Caveman skill was invoked.";

export const CAVEMAN_CLARITY_OVERRIDE_LINE =
	"Temporarily answer normally for security warnings, destructive confirmations, and ambiguity-sensitive instructions or repeated user confusion.";

export const CAVEMAN_MODE_GUIDANCE = {
	lite: "professional but tight; full sentences still OK",
	full: "classic caveman terseness; fragments OK",
	ultra: "maximum compression; abbreviations and arrows OK",
	"wenyan-lite": "semi-classical terseness while still readable",
	wenyan: "strong classical terseness",
	"wenyan-ultra": "maximum classical compression while preserving meaning",
};

export function resolveCavemanMode(value = "") {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (!normalized) return "";
	if (CAVEMAN_MODES.includes(normalized)) return normalized;
	return CAVEMAN_MODE_ALIASES[normalized] ?? "";
}

export function formatCavemanRuleBulletLines() {
	return [
		...CAVEMAN_RULE_LINES.map((line) => `- ${line}`),
		`- ${CAVEMAN_PROTECTED_SURFACE_LINE}`,
		`- ${CAVEMAN_CLARITY_OVERRIDE_LINE}`,
	].join("\n");
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

export function renderCavemanPromptBullet(
	prefix = "If Caveman mode is active",
) {
	return `${prefix}: ${CAVEMAN_RULE_LINES[0]} ${CAVEMAN_RULE_LINES[1]} ${CAVEMAN_RULE_LINES[2]} ${CAVEMAN_RULE_LINES[3]} ${CAVEMAN_RULE_LINES[4]} ${CAVEMAN_PROTECTED_SURFACE_LINE} ${CAVEMAN_CLARITY_OVERRIDE_LINE}`;
}

export function renderCavemanSkillBoundaries() {
	return [
		"- Caveman changes assistant prose only.",
		"- Keep technical terms exact. Fragments and short synonyms are OK.",
		`- ${CAVEMAN_PROTECTED_SURFACE_LINE}`,
		"- Active every response while enabled. No filler drift after long sessions.",
		`- ${CAVEMAN_CLARITY_OVERRIDE_LINE}`,
	].join("\n");
}
