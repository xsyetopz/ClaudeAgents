import { expect, test } from "bun:test";
import { providerOption, scopeOption } from "../src/arguments";

test("CLI provider parser accepts OAL providers and rejects unknown providers", () => {
	expect(providerOption("codex")).toBe("codex");
	expect(providerOption("opencode")).toBe("opencode");
	expect(() => providerOption("other")).toThrow("Unsupported provider other");
});

test("CLI scope parser only accepts project scope", () => {
	expect(scopeOption("project")).toBe("project");
	expect(() => scopeOption("global")).toThrow("Unsupported scope global");
});
