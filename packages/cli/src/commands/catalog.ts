import type { ExitCode } from "lifecycle";
import {
	asJson,
	formatOlympiCatalog,
	getOlympiCatalog,
	validateOlympiCatalog,
} from "reporting";

export function runCatalog(json: boolean): ExitCode {
	const catalog = getOlympiCatalog();
	const errors = validateOlympiCatalog(catalog);
	const report = { ...catalog, valid: errors.length === 0, errors };
	process.stdout.write(json ? asJson(report) : formatOlympiCatalog(catalog));
	return errors.length === 0 ? 0 : 1;
}
