import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function createBackupIfNeeded(
	targetRoot: string,
	artifactPath: string,
	target: string,
): Promise<void> {
	try {
		const current = await readFile(target, "utf8");
		const backupPath = join(
			targetRoot,
			".oal",
			"backups",
			`${artifactPath.replaceAll("/", "__")}.bak`,
		);
		await mkdir(dirname(backupPath), { recursive: true });
		await writeFile(backupPath, current);
	} catch {
		return;
	}
}
