#!/usr/bin/env bun
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const targets = JSON.parse(
	await readFile(
		join(root, "packages/adapter/src/schemas/upstreams.json"),
		"utf8",
	),
);
if (!Array.isArray(targets) || targets.length === 0)
	throw new Error("provider schema upstream manifest is empty");

const check = process.argv.includes("--check");
let drift = false;
for (const target of targets) {
	const response = await fetch(target.url, {
		headers: { "user-agent": "OpenAgentLayer schema sync" },
	});
	if (!response.ok)
		throw new Error(
			`${target.name} schema fetch failed: ${response.status} ${response.statusText}`,
		);
	const content = `${JSON.stringify(await response.json(), null, 2)}\n`;
	const path = join(root, target.path);
	if (check) {
		const current = await readFile(path, "utf8");
		if (current !== content) {
			drift = true;
			console.error(`schema drift: ${target.path}`);
		}
	} else {
		await writeFile(path, content);
		console.log(`synced ${target.path}`);
	}
}
if (drift) process.exit(1);
if (check) console.log("provider schemas are current");
