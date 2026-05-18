import { redactSecrets } from "../reports/schema";

export interface SecretSafetyResult {
	text: string;
	redactions: string[];
	hasSecrets: boolean;
}

export function redactPolicySecrets(text: string): SecretSafetyResult {
	const result = redactSecrets(text);
	return {
		text: result.text,
		redactions: result.redactions,
		hasSecrets: result.redactions.length > 0,
	};
}
