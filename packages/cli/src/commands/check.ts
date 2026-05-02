import { assertRenderableSource } from "../source";

export async function runCheckCommand(repoRoot: string): Promise<void> {
	await assertRenderableSource(repoRoot);
	console.log("STATUS PASS OAL source and render checks passed.");
}
