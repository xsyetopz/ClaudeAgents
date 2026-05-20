import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";
import { FIRST_PARTY_STUB_PROVIDER, validateProviderFixture } from "safety";

export async function runProvider(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0] ?? "status";
	switch (subcommand) {
		case "status": {
			const report = {
				schemaVersion: 1 as const,
				command: "provider status" as const,
				adapter: FIRST_PARTY_STUB_PROVIDER,
				realProviderLaunch: "unsupported" as const,
				blocker:
					"real provider launch requires an adapter implementation, auth boundary, and provider-specific event fixtures",
			};
			process.stdout.write(json ? asJson(report) : `${report.blocker}\n`);
			return 0;
		}
		case "validate": {
			const fixture = args[1];
			if (fixture === undefined)
				throw new OlympiError(
					"usage: olympi dev provider validate <fixture> [--json]",
					2,
				);
			const report = await validateProviderFixture(fixture);
			process.stdout.write(json ? asJson(report) : formatProvider(report));
			return report.valid ? 0 : 1;
		}
		default:
			throw new OlympiError(
				"usage: olympi dev provider <status|validate> [fixture] [--json]",
				2,
			);
	}
}

function formatProvider(
	report: Awaited<ReturnType<typeof validateProviderFixture>>,
): string {
	const lines = [
		`Olympi provider fixture: ${report.valid ? "ok" : "failed"}`,
		`adapter: ${report.adapter.adapterId}`,
		`launches provider: ${report.adapter.launchesProvider ? "yes" : "no"}`,
	];
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}
