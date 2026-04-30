import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
	countLines,
	listFiles,
	MAX_INSTALL_UNINSTALL_SCENARIO_LINES,
} from "../_helpers/package-boundaries";

describe("OAL installer uninstall threshold boundaries", () => {
	test("keeps installer uninstall scenarios split", async () => {
		const files = (await listFiles("packages/install/__tests__/src"))
			.filter((path) => path.endsWith(".test.ts"))
			.filter((path) => path.includes("uninstall"));
		const oversizedFiles: string[] = [];
		for (const path of files) {
			const lineCount = countLines(await readFile(path, "utf8"));
			if (lineCount > MAX_INSTALL_UNINSTALL_SCENARIO_LINES) {
				oversizedFiles.push(`${path}: ${lineCount}`);
			}
		}
		expect(files).not.toContain(
			"packages/install/__tests__/src/uninstall.test.ts",
		);
		expect(oversizedFiles).toEqual([]);
	});
});
