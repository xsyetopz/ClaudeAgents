import type { ExitCode } from "lifecycle";
import {
	asJson,
	formatOlympusCatalog,
	getOlympusCatalog,
	validateOlympusCatalog,
} from "reporting";

export function runCatalog(json: boolean): ExitCode {
	const catalog = getOlympusCatalog();
	const errors = validateOlympusCatalog(catalog);
	const report = { ...catalog, valid: errors.length === 0, errors };
	process.stdout.write(json ? asJson(report) : formatOlympusCatalog(catalog));
	return errors.length === 0 ? 0 : 1;
}
