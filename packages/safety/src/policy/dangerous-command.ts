const DANGEROUS_FLAGS = new Set([
	"--dangerously-skip-permissions",
	"--no-sandbox",
	"--privileged",
]);

const SHELL_PIPE_INSTALL_PATTERN =
	/\b(curl|wget)\b[\s\S]*\|[\s\S]*\b(sh|bash|zsh)\b/i;
const RM_RF_PATTERN = /\brm\s+(-[^\n]*r[^\n]*f|-f[^\n]*r)\b/;
const CHMOD_OPEN_PATTERN = /\bchmod\s+777\b/;
const SUDO_PATTERN = /^\s*sudo\b/;

export function dangerousCommandReasons(
	command: string | undefined,
	argv: string[] = [],
): string[] {
	const text = [command ?? "", ...argv].join(" ").trim();
	if (text.length === 0) return [];
	const reasons: string[] = [];
	if (RM_RF_PATTERN.test(text))
		reasons.push("dangerous recursive force delete command blocked");
	if (SUDO_PATTERN.test(text))
		reasons.push("sudo command blocked by Olympi safety policy");
	if (CHMOD_OPEN_PATTERN.test(text))
		reasons.push("world-writable chmod command blocked");
	if (SHELL_PIPE_INSTALL_PATTERN.test(text))
		reasons.push("network-to-shell pipeline blocked");
	for (const token of argv) {
		if (DANGEROUS_FLAGS.has(token))
			reasons.push(`dangerous flag blocked: ${token}`);
	}
	if (text.includes("--dangerously-skip-permissions")) {
		reasons.push("dangerous skip-permissions flag blocked outside sandbox");
	}
	return [...new Set(reasons)].sort();
}
