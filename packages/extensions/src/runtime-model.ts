export interface OlympiExtensionRuntime {
	schemaVersion: 1;
	primary: "pi-extension-harness";
	hostRuntime: "pi";
	cliRole: "entrypoint-wrapper";
	runsWithinPi: true;
	stateRoot: ".pi/olympi";
	piInvocation: "pi-extension";
	globalPiInstall: "explicit-global-only";
	globalBinaryInstall: "optional-cli-only";
	projectInstall: "default-project-local-pi-extension-and-state";
	cliEntrypoint: "development-admin-automation";
	projectStateModel: "Pi/Olympi project-local state";
	globalPiWrites: "explicit-global-only-with-confirmation-and-provenance";
	olympiOwnedState: string[];
	piOwnedState: string[];
	allowedProjectWrites: string[];
	allowedGlobalWrites: string[];
	installFlow: string[];
	invocationFlow: string[];
	wraps: string[];
	unsupported: string[];
}

export function olympiExtensionRuntime(): OlympiExtensionRuntime {
	return {
		schemaVersion: 1,
		primary: "pi-extension-harness",
		hostRuntime: "pi",
		cliRole: "entrypoint-wrapper",
		runsWithinPi: true,
		stateRoot: ".pi/olympi",
		piInvocation: "pi-extension",
		globalPiInstall: "explicit-global-only",
		globalBinaryInstall: "optional-cli-only",
		projectInstall: "default-project-local-pi-extension-and-state",
		cliEntrypoint: "development-admin-automation",
		projectStateModel: "Pi/Olympi project-local state",
		globalPiWrites: "explicit-global-only-with-confirmation-and-provenance",
		olympiOwnedState: [
			".pi/olympi/**",
			"Olympi-owned package entry in project .pi/settings.json",
			".pi/extensions/olympi-aegis.ts when installed by default olympi install --apply or safety hooks aegis-install --project --apply",
			"~/.pi/agent/extensions/olympi-aegis.ts only when explicitly installed with --global and confirmation",
		],
		piOwnedState: [
			"Pi executable and package manager installation",
			"Pi user home state such as ~/.pi/agent/settings.json, sessions, auth, global extensions, npm cache, and git cache",
			"Project .pi resource discovery outside Olympi-owned manifest entries",
		],
		allowedProjectWrites: [
			".pi/olympi/** after explicit --save, --apply, or --write",
			"Olympi-owned project .pi/settings.json package entries after explicit install/load/uninstall apply",
			".pi/extensions/olympi-aegis.ts after olympi install --apply or safety hooks aegis-install --project --apply",
		],
		allowedGlobalWrites: [
			"~/.pi/agent/extensions/olympi-aegis.ts only after explicit --global --apply --confirm-global --provenance explicit-user-approval",
		],
		installFlow: [
			"Install Pi separately.",
			"Make the Olympi CLI available from the source checkout or an explicit package-manager bin for development/admin automation.",
			"Run olympi install --apply to install/register the Pi extension in the current project by default.",
			"Run olympi install --global --apply --confirm-global --provenance explicit-user-approval only when global Pi registration is intended.",
			"Package-manager global CLI installation is separate from Pi extension registration.",
		],
		invocationFlow: [
			"Run pi from the target project.",
			"Pi loads Olympi through the project-local extension entrypoint, explicit global registration, or an explicit -e extension path.",
			"Use olympi CLI commands for doctor/status/dev catalog/dev verify and explicit project-local state administration.",
		],
		wraps: [
			"goal state",
			"planning",
			"execution governance",
			"hooks",
			"skills",
			"code intelligence",
			"provenance",
			"blockers",
			"verification",
			"reporting",
		],
		unsupported: [
			"standalone replacement for Pi",
			"implicit global Olympi install into ~/.pi/agent without --global and confirmation",
			"conflating package-manager global CLI installation with Pi extension registration",
			"undeclared global/provider-home writes",
		],
	};
}
