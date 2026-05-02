import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildRoadmapEvidence } from "../src";

test("roadmap evidence has no uncovered entries", async () => {
	const evidence = await buildRoadmapEvidence(
		resolve(import.meta.dir, "../../.."),
	);
	expect(evidence.filter((entry) => entry.status === "uncovered")).toEqual([]);
});
