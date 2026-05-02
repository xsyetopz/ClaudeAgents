import { assertRtkGainThreshold } from "@openagentlayer/accept";

export async function runRtkGainCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const allowEmptyHistory = args.includes("--allow-empty-history");
	const result = await assertRtkGainThreshold(repoRoot, { allowEmptyHistory });
	if (result.status === "empty") {
		console.log(`STATUS PASS ${result.message}`);
		return;
	}
	console.log(`STATUS PASS ${result.message}`);
}
