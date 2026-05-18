import { readLock } from "../lock";
import { readManifest } from "../manifest";
import { runSandboxProbe } from "../sandbox/probe";

export interface TrustPackageStatus {
	packageId: string;
	signs: string[];
	executableBlocked: boolean;
}

export interface TrustStatusReport {
	schemaVersion: 1;
	command: "trust status";
	projectRoot: string;
	sandbox: "unavailable" | "degraded" | "ready";
	packages: TrustPackageStatus[];
	warnings: string[];
}

export async function readTrustStatus(
	projectRoot: string = process.cwd(),
): Promise<TrustStatusReport> {
	const manifest = await readManifest(projectRoot);
	const lock = await readLock(projectRoot);
	const sandbox = runSandboxProbe();
	const packages = manifest.packages.map((packageRecord) => {
		const lockRecord = lock.packages.find(
			(record) => record.packageId === packageRecord.packageId,
		);
		const hasExecutable = packageRecord.resources.some(
			(resource) => resource.kind === "extension",
		);
		const signs = ["unsigned"];
		if (lockRecord !== undefined) signs.push("locked");
		if (
			lockRecord?.contentDigest !== undefined &&
			lockRecord.contentDigest !== packageRecord.package.contentDigest
		)
			signs.push("hash mismatch");
		if (!hasExecutable && lockRecord?.decision === "trusted-passive")
			signs.push("trusted passive");
		if (hasExecutable) signs.push("executable blocked");
		signs.push(
			sandbox.status === "blocked"
				? "sandbox unavailable"
				: `sandbox ${sandbox.status}`,
		);
		signs.push("home denied", "network denied");
		return {
			packageId: packageRecord.packageId,
			signs: [...new Set(signs)].sort(),
			executableBlocked: hasExecutable,
		};
	});
	return {
		schemaVersion: 1,
		command: "trust status",
		projectRoot,
		sandbox: sandbox.status === "blocked" ? "unavailable" : sandbox.status,
		packages,
		warnings: sandbox.warnings,
	};
}
