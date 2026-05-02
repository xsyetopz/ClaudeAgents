import type {
	AgentRecord,
	OalSource,
	Provider,
	RouteRecord,
	SkillRecord,
} from "@openagentlayer/source";

export function quoteToml(text: string): string {
	return JSON.stringify(text);
}

export function agentPrompt(agent: AgentRecord, source: OalSource): string {
	return `${agent.prompt}

Prompt contract:
- Success criteria: complete the owned route outcome, preserve OAL source-of-truth boundaries, and verify provider-native generated artifacts before reporting success.
- Ordered steps: inspect source and roadmap evidence, choose the smallest route, use tools instead of guessing, implement or review within the owning package, then validate with exact commands.
- Ambiguity behavior: resolve from local source, generated artifacts, manifests, and provider docs before asking; ask only when no safe local evidence can decide.
- Evidence contract: final output must name changed source records, generated artifacts, hook or command evidence, validation commands, and remaining blocker fields when blocked.
${renderProductPromptContracts(source)}

Triggers: ${agent.triggers.join("; ")}
Do not use for: ${agent.nonGoals.join("; ")}
Tool contract: ${agent.tools.join(", ")}
Skill access: ${agent.skills.join(", ")}
Owned routes: ${agent.routes.join(", ")}
Final output must include concrete evidence or a precise blocker.`;
}

export function skillMarkdown(skill: SkillRecord, source: OalSource): string {
	return `---\ndescription: ${skill.description}\n---\n# ${skill.title}\n\n${skill.body}\n\n## Prompt contract\n\n- Success criteria: apply this skill only to its stated scope and produce output that can be checked against repo evidence or provider artifacts.\n- Ordered steps: inspect relevant files first, apply the skill-specific workflow, verify the result, then report evidence.\n- Ambiguity behavior: prefer current source, generated artifacts, manifests, and official provider docs over memory or assumptions.\n- Evidence contract: cite concrete paths, commands, rendered artifacts, or blocker fields required for the route.\n${renderProductPromptContracts(source)}\n`;
}

export function commandMarkdown(route: RouteRecord, source: OalSource): string {
	return `# ${route.id}\n\nOwner: ${route.agent}\nPermissions: ${route.permissions}\nArguments: ${route.arguments}\nRequired skills: ${route.skills.join(", ")}\n\n${route.body}\n\n## Prompt contract\n\n- Success criteria: complete the route outcome with source-backed changes or a structured blocker.\n- Ordered steps: inspect route inputs, read relevant source and generated artifacts, perform the smallest safe action, run route-appropriate validation, then summarize evidence.\n- Ambiguity behavior: use tools to resolve repo or provider facts; ask only when the missing decision cannot be inferred safely.\n- Evidence contract: include touched source records, generated artifact paths, command output, validation status, and blocker fields when blocked.\n${renderProductPromptContracts(source)}\n`;
}

export function instructions(
	sourceRoutes: RouteRecord[],
	provider: Provider,
): string {
	return `# OpenAgentLayer Instructions\n\nThis project is managed by OAL for ${provider}. Treat authored source as the source of truth and generated artifacts as disposable outputs. Use provider-native capabilities only when OAL renders and validates them. Do not modify generated files by hand; update source and regenerate.\n\nRoutes:\n${sourceRoutes
		.filter((route) => route.providers.includes(provider))
		.map((route) => `- ${route.id}: ${route.body}`)
		.join("\n")}\n`;
}

export function camelCase(text: string): string {
	return text.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function renderProductPromptContracts(source: OalSource): string {
	const contracts = source.promptContracts;
	if (!contracts) return "";
	return [
		`- ${contracts.rtkEfficiency}`,
		`- ${contracts.responseBoundaries}`,
	].join("\n");
}
