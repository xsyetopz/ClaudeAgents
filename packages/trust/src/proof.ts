import { readLock, readManifest } from "lifecycle";
import { deterministicDigest, sortStrings } from "reporting/schema";
import { runSandboxProbe } from "safety";

export interface ExecutableTrustProofOptions {
	projectRoot?: string;
	signatureDigest?: string;
	sandboxReady?: boolean;
}

export interface ExecutableTrustProofReport {
	schemaVersion: 1;
	command: "trust executable-proof";
	packageId: string;
	projectRoot: string;
	signatureSubjectDigest: string | null;
	gates: {
		manifestRecord: boolean;
		executableResources: boolean;
		lockRecord: boolean;
		lockDecisionTrustedExecutable: boolean;
		contentDigestMatchesLock: boolean;
		signatureDigestMatchesSubject: boolean;
		sandboxReady: boolean;
		homeDenied: true;
		networkDenied: true;
	};
	executableLoadAllowed: boolean;
	reasons: string[];
	digest: string;
}

export async function buildExecutableTrustProof(
	packageId: string,
	options: ExecutableTrustProofOptions = {},
): Promise<ExecutableTrustProofReport> {
	const projectRoot = options.projectRoot ?? process.cwd();
	const manifest = await readManifest(projectRoot);
	const lock = await readLock(projectRoot);
	const manifestRecord = manifest.packages.find(
		(record) => record.packageId === packageId,
	);
	const lockRecord = lock.packages.find(
		(record) => record.packageId === packageId,
	);
	const signatureSubjectDigest = manifestRecord
		? executableSignatureSubjectDigest({
				packageId,
				contentDigest: manifestRecord.package.contentDigest,
				resources: manifestRecord.resources,
			})
		: null;
	const sandboxReady =
		options.sandboxReady ?? runSandboxProbe().status !== "blocked";
	const suppliedSignatureDigest =
		options.signatureDigest ?? lockRecord?.signatureSubjectDigest;
	const gates = {
		manifestRecord: manifestRecord !== undefined,
		executableResources:
			manifestRecord?.resources.some(
				(resource) => resource.kind === "extension",
			) ?? false,
		lockRecord: lockRecord !== undefined,
		lockDecisionTrustedExecutable:
			lockRecord?.decision === "trusted-executable",
		contentDigestMatchesLock:
			manifestRecord !== undefined &&
			lockRecord !== undefined &&
			manifestRecord.package.contentDigest === lockRecord.contentDigest,
		signatureDigestMatchesSubject:
			signatureSubjectDigest !== null &&
			suppliedSignatureDigest === signatureSubjectDigest,
		sandboxReady,
		homeDenied: true as const,
		networkDenied: true as const,
	};
	const reasons = gateReasons(gates);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "trust executable-proof" as const,
		packageId,
		projectRoot,
		signatureSubjectDigest,
		gates,
		executableLoadAllowed: reasons.length === 0,
		reasons,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

export function executableSignatureSubjectDigest(subject: {
	packageId: string;
	contentDigest: string;
	resources: unknown;
}): string {
	return deterministicDigest({
		purpose: "olympi-executable-package-trust-v1",
		...subject,
	});
}

function gateReasons(gates: ExecutableTrustProofReport["gates"]): string[] {
	const reasons: string[] = [];
	if (!gates.manifestRecord) reasons.push("missing Olympi manifest record");
	if (!gates.executableResources)
		reasons.push("no executable extension resource recorded");
	if (!gates.lockRecord) reasons.push("missing lock record");
	if (!gates.lockDecisionTrustedExecutable) {
		reasons.push("lock decision is not trusted-executable");
	}
	if (!gates.contentDigestMatchesLock)
		reasons.push("content digest mismatch or absent lock digest");
	if (!gates.signatureDigestMatchesSubject) {
		reasons.push("signature digest does not match executable trust subject");
	}
	if (!gates.sandboxReady)
		reasons.push("sandbox is not ready for executable load");
	if (!gates.homeDenied) reasons.push("home denial signage missing");
	if (!gates.networkDenied) reasons.push("network denial signage missing");
	return sortStrings(reasons);
}
