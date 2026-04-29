const input = await readHookInput();
const command = String(input.tool_input?.command ?? "");
const finding = findDestructiveCommand(command);

if (finding) {
	deny(finding);
}

process.exit(0);

async function readHookInput() {
	const chunks = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	const rawInput = Buffer.concat(chunks).toString("utf8").trim();
	return rawInput ? JSON.parse(rawInput) : {};
}

function findDestructiveCommand(command) {
	for (const segment of splitShellSegments(command)) {
		const tokens = tokenizeShellSegment(segment);
		const normalized = stripPrefixCommands(tokens);
		const finding = classifyTokens(normalized);
		if (finding) {
			return finding;
		}
	}
	return undefined;
}

function splitShellSegments(command) {
	const segments = [];
	let current = "";
	let quote = "";
	let isEscaped = false;
	for (const char of command) {
		if (isEscaped) {
			current += char;
			isEscaped = false;
			continue;
		}
		if (char === "\\") {
			current += char;
			isEscaped = true;
			continue;
		}
		if (quote) {
			current += char;
			if (char === quote) {
				quote = "";
			}
			continue;
		}
		if (char === "'" || char === '"') {
			current += char;
			quote = char;
			continue;
		}
		if (char === ";" || char === "\n" || char === "|" || char === "&") {
			pushSegment(segments, current);
			current = "";
			continue;
		}
		current += char;
	}
	pushSegment(segments, current);
	return segments;
}

function pushSegment(segments, segment) {
	const trimmed = segment.trim();
	if (trimmed) {
		segments.push(trimmed);
	}
}

function tokenizeShellSegment(segment) {
	const tokens = [];
	let token = "";
	let quote = "";
	let isEscaped = false;
	for (const char of segment) {
		if (isEscaped) {
			token += char;
			isEscaped = false;
			continue;
		}
		if (char === "\\") {
			isEscaped = true;
			continue;
		}
		if (quote) {
			if (char === quote) {
				quote = "";
			} else {
				token += char;
			}
			continue;
		}
		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}
		if (isWhitespace(char)) {
			if (token) {
				tokens.push(token);
				token = "";
			}
			continue;
		}
		token += char;
	}
	if (token) {
		tokens.push(token);
	}
	return tokens;
}

function isWhitespace(char) {
	return char === " " || char === "\t" || char === "\r" || char === "\n";
}

function stripPrefixCommands(tokens) {
	let index = 0;
	let advanced = true;
	while (advanced) {
		advanced = false;
		while (tokens[index] === "sudo" || tokens[index] === "command") {
			index += 1;
			advanced = true;
		}
		if (tokens[index] === "env") {
			index += 1;
			advanced = true;
		}
		while (isAssignment(tokens[index])) {
			index += 1;
			advanced = true;
		}
	}
	return tokens.slice(index);
}

function isAssignment(token) {
	if (!token?.includes("=")) {
		return false;
	}
	const [name] = token.split("=", 1);
	return Boolean(name) && [...name].every(isAssignmentNameChar);
}

function isAssignmentNameChar(char) {
	return (
		(char >= "A" && char <= "Z") ||
		(char >= "a" && char <= "z") ||
		(char >= "0" && char <= "9") ||
		char === "_"
	);
}

function classifyTokens(tokens) {
	if (tokens.length === 0) {
		return undefined;
	}
	if (tokens[0] === "rm" && hasRecursiveRmFlag(tokens.slice(1))) {
		return "Blocked destructive command: recursive rm requires explicit user approval.";
	}
	if (tokens[0] === "git") {
		return classifyGitTokens(tokens);
	}
	if (tokens[0] === "chmod" && hasRecursiveFlag(tokens.slice(1))) {
		return "Blocked destructive command: recursive chmod requires explicit user approval.";
	}
	if (tokens[0] === "chown" && hasRecursiveFlag(tokens.slice(1))) {
		return "Blocked destructive command: recursive chown requires explicit user approval.";
	}
	if (
		tokens[0] === "dd" &&
		tokens.slice(1).some((token) => token.startsWith("of="))
	) {
		return "Blocked destructive command: dd with output target requires explicit user approval.";
	}
	if (tokens[0]?.startsWith("mkfs")) {
		return "Blocked destructive command: filesystem creation requires explicit user approval.";
	}
	if (tokens[0] === "diskutil" && tokens[1]?.startsWith("erase")) {
		return "Blocked destructive command: disk erase requires explicit user approval.";
	}
	return undefined;
}

function classifyGitTokens(tokens) {
	const command = gitCommand(tokens);
	if (!command) {
		return undefined;
	}
	const [subcommand, ...args] = command;
	if (subcommand === "reset" && args.includes("--hard")) {
		return "Blocked destructive command: git reset --hard requires explicit user approval.";
	}
	if (subcommand === "clean" && hasForceFlag(args)) {
		return "Blocked destructive command: forced git clean requires explicit user approval.";
	}
	if (subcommand === "push" && hasForceFlag(args)) {
		return "Blocked destructive command: forced git push requires explicit user approval.";
	}
	if (subcommand === "restore" && args.includes(".")) {
		return "Blocked destructive command: git restore . requires explicit user approval.";
	}
	if (subcommand === "checkout" && args[0] === "--" && args[1] === ".") {
		return "Blocked destructive command: git checkout -- . requires explicit user approval.";
	}
	return undefined;
}

function gitCommand(tokens) {
	let index = 1;
	while (index < tokens.length) {
		const token = tokens[index];
		if (!token.startsWith("-")) {
			return tokens.slice(index);
		}
		index += gitOptionWidth(token);
	}
	return undefined;
}

function gitOptionWidth(token) {
	if (
		token === "-C" ||
		token === "-c" ||
		token === "--git-dir" ||
		token === "--work-tree" ||
		token === "--namespace"
	) {
		return 2;
	}
	return 1;
}

function hasRecursiveRmFlag(tokens) {
	return tokens.some(
		(token) =>
			token === "--recursive" ||
			(token.startsWith("-") &&
				!token.startsWith("--") &&
				token.slice(1).includes("r")) ||
			(token.startsWith("-") &&
				!token.startsWith("--") &&
				token.slice(1).includes("R")),
	);
}

function hasRecursiveFlag(tokens) {
	return tokens.some(
		(token) =>
			token === "-R" ||
			token === "--recursive" ||
			(token.startsWith("-") && !token.startsWith("--") && token.includes("R")),
	);
}

function hasForceFlag(tokens) {
	return tokens.some(
		(token) =>
			token === "-f" ||
			token === "--force" ||
			token === "--force-with-lease" ||
			(token.startsWith("-") && !token.startsWith("--") && token.includes("f")),
	);
}

function deny(reason) {
	process.stdout.write(
		`${JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		})}\n`,
	);
	process.exit(0);
}
