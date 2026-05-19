#!/usr/bin/env bun
import { runInteractiveCli } from "./interactive.js";

if (import.meta.main) {
	const exitCode = await runInteractiveCli(process.argv.slice(2));
	process.exit(exitCode);
}
