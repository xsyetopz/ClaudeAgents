import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { assertRuntimeHooksExecutable, runtimeHooks } from "../src";

test("runtime hook inventory uses executable mjs scripts", async () => {
	expect(runtimeHooks.every((hook) => hook.endsWith(".mjs"))).toBe(true);
	await assertRuntimeHooksExecutable(resolve(import.meta.dir, "../../.."));
});
