import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./hashing.js";
import { relativeToProject } from "./manifest.js";

export type MemorySplitId =
	| "binding-constraints"
	| "challenge-correction"
	| "sourced-facts"
	| "fact-vs-proposal"
	| "status-authority"
	| "fragmentation"
	| "correction-scope"
	| "borrowed-patterns"
	| "examples-risk"
	| "proposals"
	| "mutation-authority";

export interface MemorySplit {
	id: MemorySplitId;
	text: string;
}

export interface MemoryEntry extends MemorySplit {
	enabled: boolean;
	source: "user-provided";
	order: number;
}

export interface MemoryStatusReport {
	schemaVersion: 1;
	command: "memory status";
	path: ".pi/olympi/memory/memory.sqlite";
	initialized: boolean;
	enabled: boolean;
	entries: MemoryEntry[];
}

export interface MemoryInitReport {
	schemaVersion: 1;
	command: "memory init";
	apply: boolean;
	path: ".pi/olympi/memory/memory.sqlite";
	enabled: boolean;
	wouldWrite: string[];
	written: string[];
	entries: MemorySplit[];
}

export interface MemorySetEnabledReport {
	schemaVersion: 1;
	command: "memory enable" | "memory disable";
	apply: boolean;
	path: ".pi/olympi/memory/memory.sqlite";
	enabled: boolean;
	wouldWrite: string[];
	written: string[];
}

const MEMORY_RELATIVE_PATH = ".pi/olympi/memory/memory.sqlite" as const;
const MEMORY_ENABLED_KEY = "enabled";

export const DEFAULT_MEMORY_SPLITS: MemorySplit[] = [
	{
		id: "binding-constraints",
		text: "Keep user constraints binding across all topics. Do not overgeneralize from familiar external models into the user’s project, wording, goals, or context.",
	},
	{
		id: "challenge-correction",
		text: "When challenged, re-check and correct directly. Do not defend mistakes, rationalize them, or repeat the pattern with a different label.",
	},
	{
		id: "sourced-facts",
		text: "When citing or grounding facts, use only checked sources or user-provided material. Do not fabricate claims, references, syntax, documentation, research, dates, prices, APIs, or implementation details.",
	},
	{
		id: "fact-vs-proposal",
		text: "In technical, specification, or design work, distinguish existing facts, direct consequences, assumptions, proposals, unknowns, and external metalanguage. Never blur semantic discussion with surface syntax.",
	},
	{
		id: "status-authority",
		text: "Do not use deferral or status language without authority. Avoid “later,” “for now,” “initially,” “not yet,” “current candidate,” or “undecided” unless the user or source establishes that status.",
	},
	{
		id: "fragmentation",
		text: "Do not fragment work unnecessarily. Merge related issues into the smallest coherent set; avoid turning one resolved question into many new subproblems unless the user asks for a roadmap.",
	},
	{
		id: "correction-scope",
		text: "Do not over-expand after correction. If the user flags an overreach, reduce assumptions and answer narrowly; do not fix it by adding more structure, options, statuses, or actions.",
	},
	{
		id: "borrowed-patterns",
		text: "Do not use borrowed notation or external patterns casually. Avoid importing syntax, categories, naming conventions, operators, or design habits from familiar languages/tools unless the user asked for comparison or the pattern is explicitly justified.",
	},
	{
		id: "examples-risk",
		text: "Treat examples as risky. Do not provide placeholder or pseudo-examples unless useful and explicitly labeled. If examples look like source, API, config, or command syntax, mark whether they are existing verified syntax or candidate/non-source notation.",
	},
	{
		id: "proposals",
		text: "When proposing is requested, label it as a proposal or candidate, explain why it is introduced, keep it separate from existing facts, and avoid smuggling extra decisions into summaries.",
	},
	{
		id: "mutation-authority",
		text: "Before acting or mutating anything, verify explicit instruction. Do not save/delete/update memory, edit files, change settings, create artifacts, schedule tasks, send emails, or change external state unless the user clearly asked for that exact action.",
	},
];

export async function readMemoryStatus(
	projectRoot: string = process.cwd(),
): Promise<MemoryStatusReport> {
	const dbPath = memoryPath(projectRoot);
	if (!(await fileExists(dbPath))) {
		return {
			schemaVersion: 1,
			command: "memory status",
			path: MEMORY_RELATIVE_PATH,
			initialized: false,
			enabled: false,
			entries: [],
		};
	}
	const db = openMemoryDatabase(projectRoot);
	try {
		ensureSchema(db);
		return {
			schemaVersion: 1,
			command: "memory status",
			path: MEMORY_RELATIVE_PATH,
			initialized: true,
			enabled: readEnabled(db),
			entries: readEntries(db),
		};
	} finally {
		db.close();
	}
}

export async function initializeMemoryStore(options: {
	projectRoot?: string;
	apply: boolean;
	enabled?: boolean;
}): Promise<MemoryInitReport> {
	const projectRoot = options.projectRoot ?? process.cwd();
	const enabled = options.enabled ?? true;
	const writePath = relativeToProject(projectRoot, memoryPath(projectRoot));
	if (!options.apply) {
		return {
			schemaVersion: 1,
			command: "memory init",
			apply: false,
			path: MEMORY_RELATIVE_PATH,
			enabled,
			wouldWrite: [writePath],
			written: [],
			entries: DEFAULT_MEMORY_SPLITS,
		};
	}
	await mkdir(path.dirname(memoryPath(projectRoot)), { recursive: true });
	const db = openMemoryDatabase(projectRoot);
	try {
		ensureSchema(db);
		writeDefaultEntries(db);
		writeEnabled(db, enabled);
	} finally {
		db.close();
	}
	return {
		schemaVersion: 1,
		command: "memory init",
		apply: true,
		path: MEMORY_RELATIVE_PATH,
		enabled,
		wouldWrite: [],
		written: [writePath],
		entries: DEFAULT_MEMORY_SPLITS,
	};
}

export async function setMemoryEnabled(options: {
	projectRoot?: string;
	apply: boolean;
	enabled: boolean;
}): Promise<MemorySetEnabledReport> {
	const projectRoot = options.projectRoot ?? process.cwd();
	const writePath = relativeToProject(projectRoot, memoryPath(projectRoot));
	if (!options.apply) {
		return {
			schemaVersion: 1,
			command: options.enabled ? "memory enable" : "memory disable",
			apply: false,
			path: MEMORY_RELATIVE_PATH,
			enabled: options.enabled,
			wouldWrite: [writePath],
			written: [],
		};
	}
	await mkdir(path.dirname(memoryPath(projectRoot)), { recursive: true });
	const db = openMemoryDatabase(projectRoot);
	try {
		ensureSchema(db);
		writeDefaultEntries(db);
		writeEnabled(db, options.enabled);
	} finally {
		db.close();
	}
	return {
		schemaVersion: 1,
		command: options.enabled ? "memory enable" : "memory disable",
		apply: true,
		path: MEMORY_RELATIVE_PATH,
		enabled: options.enabled,
		wouldWrite: [],
		written: [writePath],
	};
}

export async function readEnabledMemoryText(
	projectRoot: string = process.cwd(),
): Promise<string[]> {
	const status = await readMemoryStatus(projectRoot);
	if (!(status.initialized && status.enabled)) return [];
	return status.entries
		.filter((entry) => entry.enabled)
		.sort((left, right) => left.order - right.order)
		.map((entry) => entry.text);
}

function memoryPath(projectRoot: string): string {
	return path.join(projectRoot, MEMORY_RELATIVE_PATH);
}

function openMemoryDatabase(projectRoot: string): Database {
	return new Database(memoryPath(projectRoot));
}

function ensureSchema(db: Database): void {
	db.exec(`
CREATE TABLE IF NOT EXISTS memory_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL
);
`);
}

function writeDefaultEntries(db: Database): void {
	const insert = db.prepare(
		"INSERT OR IGNORE INTO memory_entries (id, body, source, enabled, order_index) VALUES (?, ?, 'user-provided', 1, ?)",
	);
	for (const [index, entry] of DEFAULT_MEMORY_SPLITS.entries()) {
		insert.run(entry.id, entry.text, index);
	}
}

function writeEnabled(db: Database, enabled: boolean): void {
	db.prepare(
		"INSERT INTO memory_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
	).run(MEMORY_ENABLED_KEY, enabled ? "true" : "false");
}

function readEnabled(db: Database): boolean {
	const row = db
		.prepare("SELECT value FROM memory_config WHERE key = ?")
		.get(MEMORY_ENABLED_KEY) as { value?: string } | null;
	return row?.value === "true";
}

function readEntries(db: Database): MemoryEntry[] {
	const rows = db
		.prepare(
			"SELECT id, body, source, enabled, order_index FROM memory_entries ORDER BY order_index ASC, id ASC",
		)
		.all() as Array<{
		id: string;
		body: string;
		source: "user-provided";
		enabled: number;
		order_index: number;
	}>;
	return rows.map((row) => ({
		id: row.id as MemorySplitId,
		text: row.body,
		source: row.source,
		enabled: row.enabled === 1,
		order: row.order_index,
	}));
}
