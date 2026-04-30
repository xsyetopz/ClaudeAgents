import type {
	Diagnostic,
	EffortLevel,
	ModelId,
	SourceGraph,
	Surface,
	SurfaceConfigRecord,
	UnknownMap,
} from "@openagentlayer/types";

export interface FrontmatterValueMap {
	readonly [key: string]:
		| string
		| boolean
		| number
		| readonly string[]
		| undefined;
}

export interface TomlValueMap {
	readonly [key: string]:
		| string
		| boolean
		| number
		| readonly string[]
		| TomlValueMap
		| undefined;
}

export function compareByPath(
	left: { readonly path: string },
	right: { readonly path: string },
): number {
	return left.path.localeCompare(right.path);
}

export function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input), null, 2);
}

export function renderJsonFile(input: unknown): string {
	return `${stableJson(input)}\n`;
}

export function renderMarkdownWithFrontmatter(
	frontmatter: FrontmatterValueMap,
	body: string,
): string {
	const lines = ["---"];
	for (const key of Object.keys(frontmatter).sort()) {
		const value = frontmatter[key];
		if (value === undefined) {
			continue;
		}
		lines.push(`${key}: ${renderFrontmatterValue(value)}`);
	}
	lines.push("---", "", body.trimEnd(), "");
	return lines.join("\n");
}

export function renderTomlDocument(input: TomlValueMap): string {
	return `${renderTomlEntries(input).join("\n")}\n`;
}

export function appendSection(title: string, body: string): string {
	return `\n## ${title}\n\n${body.trim()}\n`;
}

export interface ResolvedModelAssignment {
	readonly model: ModelId | undefined;
	readonly effort: EffortLevel | undefined;
	readonly planId: string | undefined;
}

export interface ConfigValidationInput {
	readonly graph: SourceGraph;
	readonly surface: Surface;
	readonly config: UnknownMap;
	readonly artifactPath: string;
}

export function resolveModelAssignment(
	graph: SourceGraph,
	surface: Surface,
	roleId: string,
	modelPlanId?: string,
): ResolvedModelAssignment {
	const surfacePlans = graph.modelPlans
		.filter((record) => record.surfaces.includes(surface))
		.sort((left, right) => left.id.localeCompare(right.id));
	const defaultPlan = surfacePlans.find(
		(record) => record.default_plan === true,
	);
	const plan =
		modelPlanId === undefined
			? (defaultPlan ??
				(surfacePlans.length === 1 ? surfacePlans[0] : undefined))
			: surfacePlans.find((record) => record.id === modelPlanId);
	if (plan === undefined) {
		return { model: undefined, effort: undefined, planId: undefined };
	}

	const assignment = plan.role_assignments.find(
		(candidate) => candidate.role === roleId,
	);
	return {
		model: assignment?.model ?? plan.default_model,
		effort: assignment?.effort ?? plan.effort_ceiling,
		planId: plan.id,
	};
}

export function getSurfaceConfig(
	graph: SourceGraph,
	surface: Surface,
): SurfaceConfigRecord | undefined {
	return graph.surfaceConfigs.find((record) => record.surface === surface);
}

export function validateConfigObject({
	graph,
	surface,
	config,
	artifactPath,
}: ConfigValidationInput): readonly Diagnostic[] {
	const surfaceConfig = getSurfaceConfig(graph, surface);
	if (surfaceConfig === undefined) {
		return [
			{
				code: "missing-surface-config",
				level: "error",
				message: `Missing surface config for '${surface}'.`,
				path: artifactPath,
			},
		];
	}

	const diagnostics: Diagnostic[] = [];
	const emittedPaths = flattenConfigKeyPaths(config);
	for (const emittedPath of emittedPaths) {
		if (!matchesAny(emittedPath, surfaceConfig.allowed_key_paths)) {
			diagnostics.push({
				code: "unknown-config-key",
				level: "error",
				message: `Surface '${surface}' emitted non-allowlisted config key '${emittedPath}'.`,
				path: artifactPath,
			});
		}

		if (matchesAny(emittedPath, surfaceConfig.do_not_emit_key_paths)) {
			diagnostics.push({
				code: "blocked-config-key",
				level: "error",
				message: `Surface '${surface}' emitted blocked config key '${emittedPath}'.`,
				path: artifactPath,
			});
		}
	}

	for (const replacement of surfaceConfig.replacements) {
		if (
			emittedPaths.includes(replacement.from) &&
			!emittedPaths.includes(replacement.to)
		) {
			diagnostics.push({
				code: "missing-config-replacement",
				level: "error",
				message: `Surface '${surface}' emitted '${replacement.from}' without replacement '${replacement.to}'.`,
				path: artifactPath,
			});
		}
	}

	return diagnostics;
}

export function flattenConfigKeyPaths(config: unknown): readonly string[] {
	const paths: string[] = [];
	flattenIntoPaths(config, [], paths);
	return paths.sort();
}

function flattenIntoPaths(
	value: unknown,
	prefix: readonly string[],
	paths: string[],
): void {
	if (Array.isArray(value)) {
		if (
			value.length > 0 &&
			value.every(
				(item) =>
					typeof item === "object" && item !== null && !Array.isArray(item),
			)
		) {
			for (const item of value) {
				flattenIntoPaths(item, prefix, paths);
			}
			return;
		}
		if (prefix.length > 0) {
			paths.push(prefix.join("."));
		}
		return;
	}

	if (typeof value !== "object" || value === null) {
		if (prefix.length > 0) {
			paths.push(prefix.join("."));
		}
		return;
	}

	const entries = Object.entries(value);
	if (entries.length === 0 && prefix.length > 0) {
		paths.push(prefix.join("."));
		return;
	}

	for (const [key, child] of entries) {
		flattenIntoPaths(child, [...prefix, key], paths);
	}
}

function matchesAny(path: string, patterns: readonly string[]): boolean {
	return patterns.some((pattern) => matchesKeyPath(path, pattern));
}

function matchesKeyPath(path: string, pattern: string): boolean {
	const pathParts = path.split(".");
	const patternParts = pattern.split(".");
	if (pathParts.length !== patternParts.length) {
		return false;
	}

	return patternParts.every(
		(patternPart, index) =>
			patternPart === "*" || patternPart === pathParts[index],
	);
}

function renderTomlEntries(input: TomlValueMap, prefix = ""): string[] {
	const scalars: string[] = [];
	const sections: string[] = [];
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		if (value === undefined) {
			continue;
		}
		if (isTomlTable(value)) {
			const sectionName = prefix === "" ? key : `${prefix}.${key}`;
			sections.push(
				"",
				`[${sectionName}]`,
				...renderTomlEntries(value, sectionName),
			);
			continue;
		}
		scalars.push(`${key} = ${renderTomlValue(value)}`);
	}
	return [...scalars, ...sections];
}

function renderFrontmatterValue(
	value: string | boolean | number | readonly string[],
): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	return String(value);
}

function renderTomlValue(
	value: string | boolean | number | readonly string[],
): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	return String(value);
}

function isTomlTable(value: unknown): value is TomlValueMap {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson);
	}

	if (typeof input !== "object" || input === null) {
		return input;
	}

	const source = input as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(source).sort()) {
		sorted[key] = sortJson(source[key]);
	}
	return sorted;
}
