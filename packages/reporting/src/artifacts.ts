import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCurrentHandoff } from "authoring";
import { appendAuditEvent, auditPath, olympiDirectory } from "lifecycle";
import {
	buildContextCompactionAdvice,
	type ContextCompactionAdvice,
} from "./context.js";
import { asJson } from "./report.js";
import { buildAcceptanceReport } from "./reports/acceptance.js";
import { deterministicDigest } from "./reports/schema.js";
import {
	buildHandoffReport,
	buildStatusReport,
	formatHandoffMarkdown,
} from "./reports/status.js";

export type ArtifactKind =
	| "status"
	| "handoff"
	| "acceptance"
	| "current-handoff"
	| "audit";

export interface ArtifactWriteReport {
	schemaVersion: 1;
	command: "artifact write";
	artifact: ArtifactKind;
	projectRoot: string;
	path: string;
	bytes: number;
	digest: string;
	compactAdvice: ContextCompactionAdvice | null;
	reason: string;
}

export async function writeStatusArtifact(
	projectRoot: string = process.cwd(),
): Promise<ArtifactWriteReport> {
	const report = await buildStatusReport(projectRoot);
	return writeArtifact({
		artifact: "status",
		projectRoot,
		relativePath: "reports/status.json",
		content: asJson(report),
		reason: "wrote explicit project-local status report artifact",
		compactAdvice: null,
	});
}

export async function writeAcceptanceArtifact(
	projectRoot: string = process.cwd(),
): Promise<ArtifactWriteReport> {
	const report = await buildAcceptanceReport(projectRoot);
	return writeArtifact({
		artifact: "acceptance",
		projectRoot,
		relativePath: "reports/acceptance.json",
		content: asJson(report),
		reason: "wrote explicit project-local acceptance report artifact",
		compactAdvice: null,
	});
}

export async function writeHandoffArtifact(
	options: {
		projectRoot?: string;
		statusline?: string;
		thresholdPercent?: number;
	} = {},
): Promise<ArtifactWriteReport> {
	const projectRoot = options.projectRoot ?? process.cwd();
	const report = await buildHandoffReport(projectRoot);
	const compactAdvice = adviceFromOptions(options, true);
	return writeArtifact({
		artifact: "handoff",
		projectRoot,
		relativePath: "handoff/current.md",
		content: appendCompactionAdvice(
			formatHandoffMarkdown(report),
			compactAdvice,
		),
		reason: "wrote explicit project-local handoff artifact",
		compactAdvice,
	});
}

export async function writeCurrentHandoffArtifact(
	options: {
		projectRoot?: string;
		statusline?: string;
		thresholdPercent?: number;
	} = {},
): Promise<ArtifactWriteReport> {
	const projectRoot = options.projectRoot ?? process.cwd();
	const report = await buildCurrentHandoff(projectRoot);
	const compactAdvice = adviceFromOptions(options, true);
	return writeArtifact({
		artifact: "current-handoff",
		projectRoot,
		relativePath: "handoff/current.md",
		content: appendCompactionAdvice(report.markdown, compactAdvice),
		reason: "wrote explicit project-local Hermes current handoff artifact",
		compactAdvice,
	});
}

export async function appendAuditArtifact(options: {
	event: string;
	detail: string;
	ok: boolean;
	projectRoot?: string;
}): Promise<ArtifactWriteReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	await appendAuditEvent(projectRoot, {
		event: options.event,
		ok: options.ok,
		detail: options.detail,
	});
	const relativePath = path.relative(projectRoot, auditPath(projectRoot));
	const contentDigest = deterministicDigest({
		event: options.event,
		detail: options.detail,
		ok: options.ok,
		projectRoot,
	});
	return {
		schemaVersion: 1,
		command: "artifact write",
		artifact: "audit",
		projectRoot,
		path: toPosix(relativePath),
		bytes: Buffer.byteLength(options.detail, "utf8"),
		digest: contentDigest,
		compactAdvice: null,
		reason: "appended explicit project-local Olympi audit event",
	};
}

function adviceFromOptions(
	options: { statusline?: string; thresholdPercent?: number },
	afterHandoff: boolean,
): ContextCompactionAdvice | null {
	if (options.statusline === undefined) return null;
	const thresholdPercent = options.thresholdPercent;
	return buildContextCompactionAdvice({
		statusline: options.statusline,
		afterHandoff,
		...(thresholdPercent === undefined ? {} : { thresholdPercent }),
	});
}

async function writeArtifact(options: {
	artifact: ArtifactKind;
	projectRoot: string;
	relativePath: string;
	content: string;
	reason: string;
	compactAdvice: ContextCompactionAdvice | null;
}): Promise<ArtifactWriteReport> {
	const projectRoot = path.resolve(options.projectRoot);
	const target = path.join(olympiDirectory(projectRoot), options.relativePath);
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, options.content);
	return {
		schemaVersion: 1,
		command: "artifact write",
		artifact: options.artifact,
		projectRoot,
		path: toPosix(path.relative(projectRoot, target)),
		bytes: Buffer.byteLength(options.content, "utf8"),
		digest: deterministicDigest(options.content),
		compactAdvice: options.compactAdvice,
		reason: options.reason,
	};
}

function appendCompactionAdvice(
	markdown: string,
	advice: ContextCompactionAdvice | null,
): string {
	if (advice === null) return markdown;
	const lines = [
		markdown.trimEnd(),
		"",
		"## Post-handoff compaction",
		`- Statusline context: ${advice.statusline.contextPercent ?? "unknown"}%/${advice.statusline.contextWindowTokens ?? "unknown"} tokens`,
		`- Threshold: ${advice.thresholdPercent}%`,
		`- Recommendation: ${advice.shouldRunPiCompact ? "run `/compact` now" : "do not run `/compact` yet"}`,
	];
	if (advice.nextCommand !== null) {
		lines.push(`- Next Pi command: \`${advice.nextCommand}\``);
	}
	for (const reason of advice.reasons) lines.push(`- Reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}

function toPosix(filePath: string): string {
	return filePath.split(path.sep).join("/");
}
