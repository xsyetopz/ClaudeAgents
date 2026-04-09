function q(value) {
	return JSON.stringify(value);
}

export function renderOpenCodePlugin(policies) {
	const beforeRules = policies
		.filter(
			(policy) => policy.opencode?.plugin?.event === "tool.execute.before",
		)
		.map((policy) => ({
			id: policy.id,
			tools: policy.opencode.plugin.tools,
			field: policy.opencode.plugin.field,
			kind: policy.opencode.plugin.kind || "pattern-block",
			message: policy.opencode.plugin.message,
			patterns: policy.opencode.plugin.patterns || [],
		}));

	const ruleRows = beforeRules
		.map(
			(rule) => `  {
    id: ${q(rule.id)},
    tools: ${JSON.stringify(rule.tools)},
    field: ${q(rule.field)},
    kind: ${q(rule.kind)},
    message: ${q(rule.message)},
    patterns: [${rule.patterns.map((pattern) => pattern).join(", ")}],
  },`,
		)
		.join("\n");

	return `import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";

const BEFORE_RULES = [
${ruleRows}
];

const RTK_HOME_PATHS = [".config/openagentsbtw/RTK.md", ".codex/RTK.md", ".claude/RTK.md"];

function resolveFieldValue(rule: { field: string }, output: Record<string, unknown>): string | null {
  const args =
    output.args && typeof output.args === "object"
      ? (output.args as Record<string, unknown>)
      : null;
  if (!args) {
    return null;
  }
  const value = args[rule.field];
  return typeof value === "string" ? value : null;
}

function resolveCommandCwd(output: Record<string, unknown>): string {
  const args =
    output.args && typeof output.args === "object"
      ? (output.args as Record<string, unknown>)
      : null;
  const cwd = args?.cwd;
  return typeof cwd === "string" && cwd ? cwd : process.cwd();
}

function hasRtkBinary(): boolean {
  try {
    const result = spawnSync("rtk", ["--version"], { encoding: "utf8", timeout: 3000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

function findRepoRtkMd(startCwd: string): string {
  let current = resolve(startCwd || process.cwd());
  while (true) {
    const candidate = join(current, "RTK.md");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return "";
}

function findHomeRtkMd(): string {
  const home = process.env.HOME || "";
  if (!home) return "";
  for (const relativePath of RTK_HOME_PATHS) {
    const candidate = join(home, relativePath);
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

function getRtkRewrite(command: string, cwd: string): string | null {
  if (!command || /^\\s*rtk\\b/.test(command)) return null;
  if (!(findRepoRtkMd(cwd) || findHomeRtkMd())) return null;
  if (!hasRtkBinary()) return null;
  try {
    const result = spawnSync("rtk", ["rewrite", command], {
      cwd,
      encoding: "utf8",
      timeout: 3000,
    });
    const rewritten = (result.stdout || "").trim();
    return result.status === 0 && rewritten && rewritten !== command ? rewritten : null;
  } catch {
    return null;
  }
}

const openAgentsPlugin: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    for (const rule of BEFORE_RULES) {
      if (!rule.tools.includes(input.tool)) {
        continue;
      }
      const value = resolveFieldValue(rule, output);
      if (!value) {
        continue;
      }
      const normalized = rule.field === "command" ? value.trim() : value;
      if (rule.kind === "rtk-rewrite") {
        const rewritten = getRtkRewrite(normalized, resolveCommandCwd(output));
        if (rewritten) {
          throw new Error(\`\${rule.message}. Use: \${rewritten}\`);
        }
        continue;
      }
      if (rule.patterns.some((pattern) => pattern.test(normalized))) {
        throw new Error(rule.message);
      }
    }
  },
});

export default openAgentsPlugin;
`;
}
