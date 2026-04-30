import type { Surface } from "./primitives";

export interface SurfaceRenderTargetRecord {
	readonly surface: Surface;
	readonly kind: string;
	readonly path: string;
	readonly format: string;
	readonly source_record: string;
	readonly adapter: string;
	readonly validation_rule: string;
}
