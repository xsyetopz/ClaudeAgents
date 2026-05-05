import { GITLEAKS_RULES } from "./_gitleaks-rules.mjs";
import { extractCommands, extractPaths, extractText } from "./_payload.mjs";
import { asArray, asObject, uniqueValues } from "./_runtime.mjs";

const BASE64_CANDIDATE_PATTERN = /\b[A-Za-z0-9+/]{32,}={0,2}\b/g;
const MIN_DECODED_LENGTH = 12;
const MAX_DECODE_DEPTH = 2;

function structuredObjects(payload) {
	const objects = [asObject(payload)];
	for (const key of ["tool_input", "toolInput", "args", "arguments", "env"]) {
		const object = asObject(payload[key]);
		if (Object.keys(object).length > 0) objects.push(object);
	}
	for (const entry of asArray(payload.files)) {
		const file = asObject(entry);
		if (Object.keys(file).length > 0) objects.push(file);
	}
	return objects;
}

function textCorpus(payload) {
	return [
		extractText(payload),
		...extractCommands(payload),
		...structuredObjects(payload).map((object) => JSON.stringify(object)),
	]
		.filter(Boolean)
		.join("\n");
}

function pathFindings(paths) {
	const findings = [];
	for (const path of paths) {
		for (const rule of GITLEAKS_RULES) {
			if (!rule.path) continue;
			const pattern = new RegExp(rule.path.source, rule.path.flags);
			if (pattern.test(path)) findings.push(`${rule.id}:${path}`);
		}
	}
	return findings;
}

function textFindings(text, depth = 0) {
	const findings = [];
	for (const rule of GITLEAKS_RULES) {
		if (!rule.regex) continue;
		if (!keywordMatch(rule, text)) continue;
		const pattern = new RegExp(rule.regex.source, rule.regex.flags);
		for (const match of text.matchAll(pattern)) {
			findings.push(`${rule.id}:${match[1] ?? match[0]}`);
		}
	}
	if (depth < MAX_DECODE_DEPTH) {
		for (const candidate of text.match(BASE64_CANDIDATE_PATTERN) ?? []) {
			const decoded = decodeBase64(candidate);
			if (!decoded) continue;
			const decodedFindings = textFindings(decoded, depth + 1);
			if (decodedFindings.length > 0)
				findings.push(`base64:${candidate.slice(0, 8)}…`);
		}
	}
	return uniqueValues(findings);
}

function keywordMatch(rule, text) {
	if (!Array.isArray(rule.keywords) || rule.keywords.length === 0) return true;
	const lowerText = text.toLowerCase();
	return rule.keywords.some((keyword) =>
		lowerText.includes(keyword.toLowerCase()),
	);
}

function decodeBase64(candidate) {
	try {
		const decoded = Buffer.from(candidate, "base64").toString("utf8");
		if (decoded.length < MIN_DECODED_LENGTH || !isPrintable(decoded)) return "";
		return decoded;
	} catch {
		return "";
	}
}

function isPrintable(value) {
	return [...value].every((char) => {
		const code = char.charCodeAt(0);
		return (
			code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)
		);
	});
}

function redact(value) {
	return `${value.slice(0, 80)}${value.length > 80 ? "…" : ""}`;
}

export function evaluateSecretGuard(payload) {
	if (payload.allowSecretAccess === true) {
		return {
			decision: "warn",
			reason: "Secret access allowed by explicit override",
		};
	}

	const findings = uniqueValues([
		...pathFindings(extractPaths(payload)),
		...textFindings(textCorpus(payload)),
	]);
	if (findings.length > 0) {
		return {
			decision: "block",
			reason: "Potential secret detected by Gitleaks rules",
			details: findings.map(redact),
		};
	}

	return {
		decision: "pass",
		reason: "Gitleaks secret rules found no match",
	};
}
