#!/usr/bin/env node

import { isProtectedBranchMutation } from "./_command-safety.mjs";
import {
	asArray,
	asString,
	createHookRunner,
	uniqueValues,
} from "./_runtime.mjs";

const DEFAULT_PROTECTED_BRANCHES = ["main", "master", "release", "production"];

function evaluate(payload) {
	if (payload.allowProtectedBranchMutation === true) {
		return {
			decision: "warn",
			reason: "Protected branch mutation allowed by explicit override",
		};
	}

	const currentBranch =
		asString(payload.branch) || asString(payload.currentBranch);
	if (!currentBranch) {
		return {
			decision: "pass",
			reason: "Branch context absent",
		};
	}

	const protectedBranches = uniqueValues([
		...DEFAULT_PROTECTED_BRANCHES,
		...asArray(payload.protectedBranches).map((branch) => asString(branch)),
	]).filter(Boolean);

	if (!protectedBranches.includes(currentBranch)) {
		return {
			decision: "pass",
			reason: "Current branch outside protected set",
		};
	}

	if (!isProtectedBranchMutation(payload)) {
		return {
			decision: "pass",
			reason: `Protected branch (\`${currentBranch}\`) operation is non-mutating`,
		};
	}

	return {
		decision: "block",
		reason: `Protected branch mutation blocked on \`${currentBranch}\``,
		details: [
			asString(payload.command) ||
				asString(payload.toolCommand) ||
				asString(payload.operation),
		].filter(Boolean),
	};
}

createHookRunner("block-protected-branch", evaluate);
