import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

export interface CodeIntelligenceEngineStatus {
	treeSitter: "available" | "unavailable";
	treeSitterPath: string | null;
	treeSitterParsedFiles: number;
	treeSitterDetail: string;
	parser: "tree-sitter-cli+typescript-ast" | "typescript-ast-fallback";
	lsp: "available" | "unavailable";
	lspDetail: string;
}

export interface CodeIntelligenceFile {
	path: string;
	language: "typescript" | "javascript" | "json" | "unknown";
	imports: string[];
	exports: string[];
	publicSymbols: string[];
	entrypoints: string[];
	owners: string[];
	relatedTests: string[];
	diagnostics: string[];
}

export interface CodeIntelligenceRepoMap {
	schemaVersion: 1;
	command: "code-intelligence repo-map";
	projectRoot: string;
	generatedAt: string;
	statePath: string;
	engine: CodeIntelligenceEngineStatus;
	files: CodeIntelligenceFile[];
	packages: string[];
	moduleBoundaries: Record<string, string[]>;
	changedFiles: string[];
	diagnostics: string[];
	contextPacket: string;
}

const SOURCE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".json",
]);
const IGNORE_DIRECTORIES = new Set([
	".git",
	".pi",
	"node_modules",
	"dist",
	"coverage",
]);
const REPO_MAP_RELATIVE_PATH = ".pi/olympi/code-intelligence/repo-map.json";
const LEADING_DOT_SLASH_PATTERN = /^\.\//;

export async function buildRepoMap(
	projectRoot: string = process.cwd(),
): Promise<CodeIntelligenceRepoMap> {
	const root = path.resolve(projectRoot);
	const engine = await detectEngines();
	const changedFiles = await readChangedFiles(root);
	const sourceFiles = await listSourceFiles(root);
	const files = await Promise.all(
		sourceFiles.map((filePath) => analyzeFile(root, filePath, changedFiles)),
	);
	const treeSitterProbe = await probeTreeSitter(
		engine.treeSitterPath,
		sourceFiles,
	);
	const effectiveEngine: CodeIntelligenceEngineStatus = {
		...engine,
		...treeSitterProbe,
		parser:
			treeSitterProbe.treeSitterParsedFiles > 0
				? "tree-sitter-cli+typescript-ast"
				: "typescript-ast-fallback",
	};
	const packages = [
		...new Set(files.map((file) => ownerForPath(file.path))),
	].sort();
	const moduleBoundaries = buildModuleBoundaries(files);
	const diagnostics = files.flatMap((file) =>
		file.diagnostics.map((diagnostic) => `${file.path}: ${diagnostic}`),
	);
	const withoutPacket = {
		schemaVersion: 1 as const,
		command: "code-intelligence repo-map" as const,
		projectRoot: root,
		generatedAt: new Date().toISOString(),
		statePath: REPO_MAP_RELATIVE_PATH,
		engine: effectiveEngine,
		files: files.sort((left, right) => left.path.localeCompare(right.path)),
		packages,
		moduleBoundaries,
		changedFiles,
		diagnostics,
	};
	return {
		...withoutPacket,
		contextPacket: buildContextPacket(withoutPacket),
	};
}

export async function refreshRepoMap(
	projectRoot: string = process.cwd(),
): Promise<CodeIntelligenceRepoMap> {
	const repoMap = await buildRepoMap(projectRoot);
	const target = path.join(path.resolve(projectRoot), repoMap.statePath);
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, `${JSON.stringify(repoMap, null, 2)}\n`);
	return repoMap;
}

export async function readRepoMap(
	projectRoot: string = process.cwd(),
): Promise<CodeIntelligenceRepoMap | null> {
	try {
		return JSON.parse(
			await readFile(
				path.join(path.resolve(projectRoot), REPO_MAP_RELATIVE_PATH),
				"utf8",
			),
		) as CodeIntelligenceRepoMap;
	} catch (error) {
		if (isNotFound(error)) return null;
		throw error;
	}
}

export async function codeIntelligenceStatus(
	projectRoot: string = process.cwd(),
): Promise<{
	schemaVersion: 1;
	command: "code-intelligence status";
	present: boolean;
	statePath: string;
	engine: CodeIntelligenceEngineStatus;
}> {
	const existing = await readRepoMap(projectRoot);
	return {
		schemaVersion: 1,
		command: "code-intelligence status",
		present: existing !== null,
		statePath: REPO_MAP_RELATIVE_PATH,
		engine: existing?.engine ?? (await detectEngines()),
	};
}

export function codeContextForPaths(
	repoMap: CodeIntelligenceRepoMap,
	paths: string[],
): string[] {
	const normalized = paths.map(normalizeProjectPath);
	return repoMap.files
		.filter((file) =>
			normalized.some(
				(candidate) =>
					file.path === candidate ||
					file.path.startsWith(`${candidate}/`) ||
					candidate.startsWith(`${file.path}/`),
			),
		)
		.slice(0, 8)
		.map(
			(file) =>
				`${file.path}: owner=${file.owners.join("+")}; exports=${file.exports.slice(0, 5).join(",") || "none"}; tests=${file.relatedTests.slice(0, 3).join(",") || "none"}`,
		);
}

function analyzeSourceText(
	filePath: string,
	sourceText: string,
): Pick<
	CodeIntelligenceFile,
	"imports" | "exports" | "publicSymbols" | "entrypoints" | "diagnostics"
> {
	const source = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
			? ts.ScriptKind.TSX
			: ts.ScriptKind.TS,
	);
	const imports: string[] = [];
	const exports: string[] = [];
	const publicSymbols: string[] = [];
	const entrypoints: string[] = [];
	const parseDiagnostics =
		"parseDiagnostics" in source
			? (source as unknown as { parseDiagnostics: ts.Diagnostic[] })
					.parseDiagnostics
			: [];
	const diagnostics = parseDiagnostics.map((diagnostic) =>
		ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
	);
	const visit = (node: ts.Node): void => {
		if (
			ts.isImportDeclaration(node) &&
			ts.isStringLiteral(node.moduleSpecifier)
		)
			imports.push(node.moduleSpecifier.text);
		if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		)
			exports.push(node.moduleSpecifier.text);
		if (hasExportModifier(node)) {
			const name = namedDeclarationName(node);
			if (name !== null) {
				exports.push(name);
				publicSymbols.push(name);
			}
		}
		if (ts.isCallExpression(node)) {
			const expression = node.expression.getText(source);
			if (
				expression.includes("registerCommand") ||
				expression.includes("registerTool")
			)
				entrypoints.push(expression);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return {
		imports: sortUnique(imports),
		exports: sortUnique(exports),
		publicSymbols: sortUnique(publicSymbols),
		entrypoints: sortUnique(entrypoints),
		diagnostics,
	};
}

async function analyzeFile(
	projectRoot: string,
	absolutePath: string,
	changedFiles: string[],
): Promise<CodeIntelligenceFile> {
	const relativePath = normalizeProjectPath(
		path.relative(projectRoot, absolutePath),
	);
	const language = languageForPath(relativePath);
	const owners = [ownerForPath(relativePath)];
	const relatedTests = relatedTestsForPath(relativePath, changedFiles);
	if (language !== "typescript" && language !== "javascript") {
		return {
			path: relativePath,
			language,
			imports: [],
			exports: [],
			publicSymbols: [],
			entrypoints: relativePath.endsWith("package.json")
				? ["package.json"]
				: [],
			owners,
			relatedTests,
			diagnostics: [],
		};
	}
	const parsed = analyzeSourceText(
		relativePath,
		await readFile(absolutePath, "utf8"),
	);
	return { path: relativePath, language, owners, relatedTests, ...parsed };
}

async function listSourceFiles(projectRoot: string): Promise<string[]> {
	const files: string[] = [];
	async function visit(directory: string): Promise<void> {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (!IGNORE_DIRECTORIES.has(entry.name))
					await visit(path.join(directory, entry.name));
				continue;
			}
			if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)))
				files.push(path.join(directory, entry.name));
		}
	}
	await visit(projectRoot);
	return files.sort();
}

async function detectEngines(): Promise<CodeIntelligenceEngineStatus> {
	const treeSitterPath = await commandPath("tree-sitter");
	const lspPath =
		(await commandPath("typescript-language-server")) ??
		(await commandPath("tsserver"));
	return {
		treeSitter: treeSitterPath === null ? "unavailable" : "available",
		treeSitterPath,
		treeSitterParsedFiles: 0,
		treeSitterDetail:
			treeSitterPath === null
				? "tree-sitter CLI not found on PATH; TypeScript AST parser is used"
				: "tree-sitter CLI found; parse probe has not run yet",
		parser: "typescript-ast-fallback",
		lsp: lspPath === null ? "unavailable" : "available",
		lspDetail:
			lspPath === null
				? "no language server found on PATH; diagnostics limited to TypeScript parse diagnostics"
				: lspPath,
	};
}

async function commandPath(command: string): Promise<string | null> {
	const proc = Bun.spawn(["/bin/sh", "-lc", `command -v ${command}`], {
		stdout: "pipe",
		stderr: "ignore",
	});
	const [stdout, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		proc.exited,
	]);
	return exitCode === 0 ? stdout.trim() || null : null;
}

async function probeTreeSitter(
	treeSitterPath: string | null,
	sourceFiles: string[],
): Promise<
	Pick<
		CodeIntelligenceEngineStatus,
		"treeSitterParsedFiles" | "treeSitterDetail"
	>
> {
	if (treeSitterPath === null) {
		return {
			treeSitterParsedFiles: 0,
			treeSitterDetail:
				"tree-sitter CLI not found on PATH; TypeScript AST parser is used",
		};
	}
	let parsed = 0;
	for (const filePath of sourceFiles
		.filter((candidate) =>
			[".ts", ".tsx", ".js", ".jsx"].includes(path.extname(candidate)),
		)
		.slice(0, 12)) {
		const proc = Bun.spawn([treeSitterPath, "parse", "--quiet", filePath], {
			stdout: "ignore",
			stderr: "ignore",
		});
		if ((await proc.exited) === 0) parsed += 1;
	}
	return {
		treeSitterParsedFiles: parsed,
		treeSitterDetail:
			parsed > 0
				? `tree-sitter parsed ${parsed} sampled TypeScript/JavaScript files; symbols are extracted with TypeScript AST`
				: "tree-sitter CLI was present but no sampled TypeScript/JavaScript parse succeeded; TypeScript AST parser is used",
	};
}

async function readChangedFiles(projectRoot: string): Promise<string[]> {
	const proc = Bun.spawn(["git", "status", "--porcelain"], {
		cwd: projectRoot,
		stdout: "pipe",
		stderr: "ignore",
	});
	const [stdout, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		proc.exited,
	]);
	if (exitCode !== 0) return [];
	return stdout
		.split("\n")
		.map((line) => line.slice(3).trim())
		.filter((line) => line.length > 0)
		.map(normalizeProjectPath)
		.sort();
}

function buildModuleBoundaries(
	files: CodeIntelligenceFile[],
): Record<string, string[]> {
	const boundaries: Record<string, string[]> = {};
	for (const file of files) {
		for (const owner of file.owners)
			boundaries[owner] = sortUnique([...(boundaries[owner] ?? []), file.path]);
	}
	return boundaries;
}

function buildContextPacket(
	map: Omit<CodeIntelligenceRepoMap, "contextPacket">,
): string {
	const entrypoints = map.files
		.flatMap((file) =>
			file.entrypoints.map((entrypoint) => `${file.path}:${entrypoint}`),
		)
		.slice(0, 8);
	const changed = map.changedFiles.slice(0, 8);
	const tests = map.files
		.filter((file) => file.path.includes("test") || file.path.includes("spec"))
		.map((file) => file.path)
		.slice(0, 8);
	return [
		`Repo: ${map.files.length} files; packages=${map.packages.join(",") || "none"}`,
		`Parser: ${map.engine.parser}; LSP=${map.engine.lsp}`,
		`Changed: ${changed.join(",") || "none"}`,
		`Entrypoints: ${entrypoints.join(",") || "none"}`,
		`Tests: ${tests.join(",") || "none"}`,
		`Diagnostics: ${map.diagnostics.slice(0, 5).join(" | ") || "none"}`,
	]
		.join("\n")
		.slice(0, 1800);
}

function languageForPath(filePath: string): CodeIntelligenceFile["language"] {
	const ext = path.extname(filePath);
	switch (ext) {
		case ".ts":
		case ".tsx":
			return "typescript";
		case ".js":
		case ".jsx":
		case ".mjs":
		case ".cjs":
			return "javascript";
		case ".json":
			return "json";
		default:
			return "unknown";
	}
}

function ownerForPath(filePath: string): string {
	const parts = normalizeProjectPath(filePath).split("/");
	switch (parts[0]) {
		case "packages":
			return parts[1] ?? "packages";
		case "docs":
		case "specs":
			return parts[0];
		default:
			return parts[0] ?? "root";
	}
}

function relatedTestsForPath(
	filePath: string,
	changedFiles: string[],
): string[] {
	const owner = ownerForPath(filePath);
	return sortUnique(
		changedFiles.filter(
			(candidate) => candidate.includes("test") || candidate.includes(owner),
		),
	);
}

function hasExportModifier(node: ts.Node): boolean {
	return (
		ts.canHaveModifiers(node) &&
		(ts.getModifiers(node) ?? []).some(
			(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
		)
	);
}

function namedDeclarationName(node: ts.Node): string | null {
	if (
		(ts.isFunctionDeclaration(node) ||
			ts.isClassDeclaration(node) ||
			ts.isInterfaceDeclaration(node) ||
			ts.isTypeAliasDeclaration(node) ||
			ts.isEnumDeclaration(node)) &&
		node.name
	)
		return node.name.text;
	if (ts.isVariableStatement(node))
		return node.declarationList.declarations
			.map((declaration) => declaration.name.getText())
			.join(",");
	return null;
}

function normalizeProjectPath(value: string): string {
	return value.replaceAll("\\", "/").replace(LEADING_DOT_SLASH_PATTERN, "");
}

function sortUnique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
