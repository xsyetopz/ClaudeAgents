import { describe, expect, test } from "bun:test";
import { renderAllBundles, runHookArtifact } from "../_helpers/registry";

describe("OAL rendered hook bundles", () => {
	test("renders self-contained hook scripts", async () => {
		for (const bundle of await renderAllBundles()) {
			for (const artifact of bundle.artifacts) {
				if (artifact.kind !== "hook" || !artifact.path.endsWith(".mjs")) {
					continue;
				}
				const decision = await runHookArtifact(artifact.content);
				expect(
					typeof (decision as { readonly decision?: unknown }).decision,
				).toBe("string");
			}
		}
	});
});
