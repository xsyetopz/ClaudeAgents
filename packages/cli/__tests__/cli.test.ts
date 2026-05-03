import { expect, test } from "bun:test";
import { providerOption, scopeOption } from "../src/arguments";

test("CLI provider parser accepts OAL providers and rejects unknown providers", () => {
	expect(providerOption("codex")).toBe("codex");
	expect(providerOption("opencode")).toBe("opencode");
	expect(() => providerOption("other")).toThrow("Unsupported provider other");
});

test("CLI scope parser accepts deploy scopes and rejects unknown scopes", () => {
	expect(scopeOption("project")).toBe("project");
	expect(scopeOption("global")).toBe("global");
	expect(() => scopeOption("workspace")).toThrow("Unsupported scope workspace");
});
