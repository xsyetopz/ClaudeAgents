#!/usr/bin/env node
import { readFileSync } from "node:fs";

const input = readFileSync(0, "utf8");
const text = input.toLowerCase();
const blocked = [
	"rm -rf /",
	"rm -rf ~",
	"cat .env",
	"source .env",
	"printenv",
	"aws_secret_access_key",
	"-----begin private key-----",
];

if (blocked.some((pattern) => text.includes(pattern))) {
	console.error(
		"openagentsbtw: blocked high-risk secret/destructive operation",
	);
	process.exit(2);
}

process.exit(0);
