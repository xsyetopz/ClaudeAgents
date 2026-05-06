import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type {
	Issue,
	SymphonyConfig,
	WorkflowDefinition,
	WorkspaceHooks,
} from "./types";
import { SymphonyConfigError } from "./types";

const LINE_SPLIT_PATTERN = /\r?\n/;
const INDENT_PATTERN = /^ */;
const INTEGER_PATTERN = /^-?\d+$/;
const TEMPLATE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export async function loadWorkflow(
	path = resolve(process.cwd(), "WORKFLOW.md"),
): Promise<WorkflowDefinition> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		throw new SymphonyConfigError(
			"missing_workflow_file",
			`Cannot read workflow file: ${String(error)}`,
		);
	}
	const parsed = parseWorkflow(text);
	return { ...parsed, path };
}

export function parseWorkflow(text: string): Omit<WorkflowDefinition, "path"> {
	if (!text.startsWith("---"))
		return { config: {}, prompt_template: text.trim() };
	const lines = text.split(LINE_SPLIT_PATTERN);
	const end = lines.findIndex((line, index) => index > 0 && line === "---");
	if (end < 0)
		throw new SymphonyConfigError(
			"workflow_parse_error",
			"WORKFLOW.md front matter is not closed",
		);
	const config = parseYamlMap(lines.slice(1, end));
	return {
		config,
		prompt_template: lines
			.slice(end + 1)
			.join("\n")
			.trim(),
	};
}

export function resolveConfig(
	workflow: WorkflowDefinition | Omit<WorkflowDefinition, "path">,
	env: Record<string, string | undefined> = process.env,
): SymphonyConfig {
	const config = workflow.config;
	const workflowDir =
		"path" in workflow ? resolve(workflow.path, "..") : process.cwd();
	const tracker = asRecord(config["tracker"], "tracker");
	const polling = asRecord(config["polling"], "polling", true);
	const workspace = asRecord(config["workspace"], "workspace", true);
	const hooks = asRecord(config["hooks"], "hooks", true);
	const agent = asRecord(config["agent"], "agent", true);
	const codex = asRecord(config["codex"], "codex", true);
	const kind = stringValue(tracker["kind"], "tracker.kind");
	if (kind !== "linear")
		throw new SymphonyConfigError(
			"workflow_parse_error",
			"tracker.kind must be linear",
		);
	const apiKey = resolveEnvString(
		optionalString(tracker["api_key"]) ?? "$LINEAR_API_KEY",
		env,
	);
	const projectSlug = stringValue(
		tracker["project_slug"],
		"tracker.project_slug",
	);
	if (!apiKey)
		throw new SymphonyConfigError(
			"workflow_parse_error",
			"tracker.api_key is required",
		);
	return {
		tracker: {
			kind,
			endpoint:
				optionalString(tracker["endpoint"]) ?? "https://api.linear.app/graphql",
			api_key: apiKey,
			project_slug: projectSlug,
			active_states: stringList(tracker["active_states"], [
				"Todo",
				"In Progress",
			]),
			terminal_states: stringList(tracker["terminal_states"], [
				"Closed",
				"Cancelled",
				"Canceled",
				"Duplicate",
				"Done",
			]),
		},
		polling: { interval_ms: positiveInteger(polling["interval_ms"], 30000) },
		workspace: {
			root: normalizePath(
				resolveEnvString(
					optionalString(workspace["root"]) ?? "/symphony_workspaces",
					env,
				),
				workflowDir,
			),
		},
		hooks: workspaceHooks(hooks),
		agent: {
			max_concurrent_agents: positiveInteger(
				agent["max_concurrent_agents"],
				10,
			),
			max_turns: positiveInteger(agent["max_turns"], 20),
			max_retry_backoff_ms: positiveInteger(
				agent["max_retry_backoff_ms"],
				300000,
			),
			max_concurrent_agents_by_state: positiveIntegerMap(
				agent["max_concurrent_agents_by_state"],
			),
		},
		codex: {
			command: optionalString(codex["command"]) ?? "codex app-server",
			...(codex["approval_policy"] === undefined
				? {}
				: { approval_policy: codex["approval_policy"] }),
			...(codex["thread_sandbox"] === undefined
				? {}
				: { thread_sandbox: codex["thread_sandbox"] }),
			...(codex["turn_sandbox_policy"] === undefined
				? {}
				: { turn_sandbox_policy: codex["turn_sandbox_policy"] }),
			turn_timeout_ms: positiveInteger(codex["turn_timeout_ms"], 3600000),
			read_timeout_ms: positiveInteger(codex["read_timeout_ms"], 5000),
			stall_timeout_ms: integer(codex["stall_timeout_ms"], 300000),
		},
	};
}

export function renderPrompt(
	template: string,
	issue: Issue,
	attempt: number | null,
): string {
	const context = { issue, attempt };
	return template.replaceAll(TEMPLATE_PATTERN, (_match, path: string) => {
		const value = path.split(".").reduce((current: unknown, key: string) => {
			if (current && typeof current === "object" && key in current)
				return (current as Record<string, unknown>)[key];
			throw new SymphonyConfigError(
				"template_render_error",
				`Unknown template variable: ${path}`,
			);
		}, context);
		return value == null ? "" : String(value);
	});
}

function parseYamlMap(lines: string[]): Record<string, unknown> {
	const root: Record<string, unknown> = {};
	const stack: Array<{ indent: number; value: Record<string, unknown> }> = [
		{ indent: -1, value: root },
	];
	for (let index = 0; index < lines.length; index += 1) {
		const raw = lines[index] ?? "";
		if (raw.trim().length === 0 || raw.trimStart().startsWith("#")) continue;
		const indent = raw.match(INDENT_PATTERN)?.[0].length ?? 0;
		const line = raw.trim();
		const [key, rawValue = ""] = splitYamlPair(line);
		while (stack.length > 1 && indent <= stack[stack.length - 1].indent)
			stack.pop();
		const parent = stack[stack.length - 1].value;
		if (rawValue === "") {
			const child: Record<string, unknown> = {};
			parent[key] = child;
			stack.push({ indent, value: child });
		} else if (rawValue === "|") {
			const block: string[] = [];
			const blockIndent = indent + 2;
			while (
				(lines[index + 1]?.match(INDENT_PATTERN)?.[0].length ?? 0) >=
				blockIndent
			) {
				index += 1;
				block.push((lines[index] ?? "").slice(blockIndent));
			}
			parent[key] = block.join("\n");
		} else {
			parent[key] = parseScalar(rawValue);
		}
	}
	return root;
}

function splitYamlPair(line: string): [string, string?] {
	const index = line.indexOf(":");
	if (index < 1)
		throw new SymphonyConfigError(
			"workflow_parse_error",
			`Invalid YAML front matter line: ${line}`,
		);
	return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}

function parseScalar(value: string): unknown {
	if (value.startsWith("[") && value.endsWith("]"))
		return value
			.slice(1, -1)
			.split(",")
			.map((entry) => parseScalar(entry.trim()));
	if (value === "true") return true;
	if (value === "false") return false;
	if (INTEGER_PATTERN.test(value)) return Number(value);
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	)
		return value.slice(1, -1);
	return value;
}

function asRecord(
	value: unknown,
	label: string,
	optional = false,
): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value))
		return value as Record<string, unknown>;
	if (optional || value == null) return {};
	throw new SymphonyConfigError(
		"workflow_parse_error",
		`${label} must be an object`,
	);
}

function stringValue(value: unknown, label: string): string {
	if (typeof value === "string" && value.length > 0) return value;
	throw new SymphonyConfigError("workflow_parse_error", `${label} is required`);
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringList(value: unknown, fallback: string[]): string[] {
	if (value == null) return fallback;
	if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
		return value;
	throw new SymphonyConfigError("workflow_parse_error", "Expected string list");
}

function positiveInteger(value: unknown, fallback: number): number {
	const parsed = integer(value, fallback);
	if (parsed <= 0)
		throw new SymphonyConfigError(
			"workflow_parse_error",
			"Expected positive integer",
		);
	return parsed;
}

function integer(value: unknown, fallback: number): number {
	if (value == null) return fallback;
	if (typeof value === "number" && Number.isInteger(value)) return value;
	throw new SymphonyConfigError("workflow_parse_error", "Expected integer");
}

function positiveIntegerMap(value: unknown): Record<string, number> {
	if (value == null) return {};
	const record = asRecord(value, "agent.max_concurrent_agents_by_state");
	const result: Record<string, number> = {};
	for (const [key, entry] of Object.entries(record))
		if (typeof entry === "number" && Number.isInteger(entry) && entry > 0)
			result[key.toLowerCase()] = entry;
	return result;
}

function resolveEnvString(
	value: string,
	env: Record<string, string | undefined>,
): string {
	if (!value.startsWith("$")) return value;
	return env[value.slice(1)] ?? "";
}

function normalizePath(path: string, base: string): string {
	const expanded = path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
	return isAbsolute(expanded) ? resolve(expanded) : resolve(base, expanded);
}

function workspaceHooks(record: Record<string, unknown>): WorkspaceHooks {
	const hooks: WorkspaceHooks = {
		timeout_ms: positiveInteger(record["timeout_ms"], 60000),
	};
	const afterCreate = optionalString(record["after_create"]);
	const beforeRun = optionalString(record["before_run"]);
	const afterRun = optionalString(record["after_run"]);
	const beforeRemove = optionalString(record["before_remove"]);
	if (afterCreate !== undefined) hooks.after_create = afterCreate;
	if (beforeRun !== undefined) hooks.before_run = beforeRun;
	if (afterRun !== undefined) hooks.after_run = afterRun;
	if (beforeRemove !== undefined) hooks.before_remove = beforeRemove;
	return hooks;
}
