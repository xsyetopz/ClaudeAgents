import { deterministicDigest, sortStrings } from "reporting";
import { decidePolicy } from "../policy/themis.js";
import type { PolicyEvent, PolicyEventType } from "../policy/types.js";

export type OlympusHookPhase =
	| "pre-action"
	| "post-action"
	| "pre-commit"
	| "post-commit"
	| "stop"
	| "validation"
	| "architecture-boundary"
	| "blocked-state";

export type OlympusHookDecisionKind = "allow" | "warn" | "veto";

export interface OlympusHookContext {
	schemaVersion: 1;
	phase: OlympusHookPhase;
	action?: string;
	command?: string;
	toolName?: string;
	operation?: PolicyEvent["operation"];
	path?: string;
	paths?: string[];
	packageName?: string;
	status?: string;
	validationPassed?: boolean;
	blockedReason?: string;
	manifestOwned?: boolean;
	requiresPlanApproval?: boolean;
	planApproved?: boolean;
}

export interface OlympusHookDecision {
	schemaVersion: 1;
	hookId: string;
	phase: OlympusHookPhase;
	decision: OlympusHookDecisionKind;
	reasons: string[];
	requiredNextAction: string | null;
	digest: string;
}

export interface OlympusHook {
	id: string;
	phase: OlympusHookPhase;
	description: string;
	run(context: OlympusHookContext): OlympusHookDecision;
}

export interface OlympusHookPipelineResult {
	schemaVersion: 1;
	phase: OlympusHookPhase;
	decision: OlympusHookDecisionKind;
	vetoed: boolean;
	decisions: OlympusHookDecision[];
	reasons: string[];
	requiredNextAction: string | null;
	digest: string;
}

export function runHookPipeline(
	context: OlympusHookContext,
	hooks: OlympusHook[],
): OlympusHookPipelineResult {
	const matching = hooks.filter((hook) => hook.phase === context.phase);
	const decisions: OlympusHookDecision[] = [];
	for (const hook of matching) {
		const decision = hook.run(context);
		decisions.push(decision);
		if (decision.decision === "veto") break;
	}
	const veto = decisions.find((decision) => decision.decision === "veto");
	const warning = decisions.find((decision) => decision.decision === "warn");
	const decisionKind: OlympusHookDecisionKind = veto
		? "veto"
		: warning
			? "warn"
			: "allow";
	const reasons = sortStrings(
		decisions.flatMap((decision) => decision.reasons),
	);
	const withoutDigest = {
		schemaVersion: 1 as const,
		phase: context.phase,
		decision: decisionKind,
		vetoed: decisionKind === "veto",
		decisions,
		reasons,
		requiredNextAction:
			veto?.requiredNextAction ?? warning?.requiredNextAction ?? null,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

export function policyPreActionHook(id = "themis-pre-action"): OlympusHook {
	return {
		id,
		phase: "pre-action",
		description: "Veto unsafe tool actions through Themis policy",
		run(context) {
			const event = policyEventFromHookContext(context, "tool_call");
			const policy = decidePolicy(event);
			return hookDecision({
				hookId: id,
				phase: context.phase,
				decision: policy.blocked
					? "veto"
					: policy.decision === "warn"
						? "warn"
						: "allow",
				reasons: policy.reasons,
				requiredNextAction: policy.requiredNextAction,
			});
		},
	};
}

export function verificationHook(id = "apollo-validation-gate"): OlympusHook {
	return {
		id,
		phase: "validation",
		description: "Veto completion when validation evidence is absent or failed",
		run(context) {
			const reasons =
				context.validationPassed === true
					? []
					: ["validation hook requires explicit passing evidence"];
			return hookDecision({
				hookId: id,
				phase: context.phase,
				decision: reasons.length === 0 ? "allow" : "veto",
				reasons,
				requiredNextAction:
					reasons.length === 0
						? null
						: "run the required validation command or report the blocker",
			});
		},
	};
}

export function blockedStateHook(id = "hestia-blocked-state"): OlympusHook {
	return {
		id,
		phase: "blocked-state",
		description:
			"Pause loops that have a concrete blocker instead of doing unrelated work",
		run(context) {
			const reasons =
				context.blockedReason === undefined ||
				context.blockedReason.length === 0
					? []
					: [`blocked state requires pause: ${context.blockedReason}`];
			return hookDecision({
				hookId: id,
				phase: context.phase,
				decision: reasons.length === 0 ? "allow" : "veto",
				reasons,
				requiredNextAction:
					reasons.length === 0
						? null
						: "pause and report Attempted, Evidence, and Need",
			});
		},
	};
}

export function architectureBoundaryHook(options: {
	id?: string;
	allowedPackageNames: string[];
}): OlympusHook {
	const allowed = new Set(options.allowedPackageNames);
	const id = options.id ?? "athena-architecture-boundary";
	return {
		id,
		phase: "architecture-boundary",
		description: "Veto package-boundary mutations outside the approved domain",
		run(context) {
			const packageName = context.packageName;
			const reasons =
				packageName !== undefined && !allowed.has(packageName)
					? [`package ${packageName} is outside approved architecture boundary`]
					: [];
			return hookDecision({
				hookId: id,
				phase: context.phase,
				decision: reasons.length === 0 ? "allow" : "veto",
				reasons,
				requiredNextAction:
					reasons.length === 0
						? null
						: "move the work to the owning domain package or update the approved plan",
			});
		},
	};
}

function policyEventFromHookContext(
	context: OlympusHookContext,
	eventType: PolicyEventType,
): PolicyEvent {
	return {
		schemaVersion: 1,
		eventType,
		...(context.toolName === undefined ? {} : { toolName: context.toolName }),
		...(context.operation === undefined
			? {}
			: { operation: context.operation }),
		...(context.command === undefined ? {} : { command: context.command }),
		...(context.path === undefined ? {} : { path: context.path }),
		...(context.paths === undefined ? {} : { paths: context.paths }),
		...(context.manifestOwned === undefined
			? {}
			: { manifestOwned: context.manifestOwned }),
		...(context.requiresPlanApproval === undefined
			? {}
			: { requiresPlanApproval: context.requiresPlanApproval }),
		...(context.planApproved === undefined
			? {}
			: { planApproved: context.planApproved }),
	};
}

function hookDecision(options: {
	hookId: string;
	phase: OlympusHookPhase;
	decision: OlympusHookDecisionKind;
	reasons: string[];
	requiredNextAction: string | null;
}): OlympusHookDecision {
	const reasons = sortStrings(options.reasons);
	const withoutDigest = {
		schemaVersion: 1 as const,
		hookId: options.hookId,
		phase: options.phase,
		decision: options.decision,
		reasons,
		requiredNextAction: options.requiredNextAction,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}
