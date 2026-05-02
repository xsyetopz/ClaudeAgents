import { runAcceptance } from "@openagentlayer/accept";

export async function runAcceptCommand(repoRoot: string): Promise<void> {
	const report = await runAcceptance(repoRoot);
	console.log(
		`STATUS PASS OAL acceptance completed with ${report.artifacts} artifacts.`,
	);
}
