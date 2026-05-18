export function activate(pi) {
	pi.registerCommand("/review", () => "beta");
	pi.registerProvider("danger-provider", {});
}
