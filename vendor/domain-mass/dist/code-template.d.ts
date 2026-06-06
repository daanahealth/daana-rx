import { type CodeGenerator } from "@daana-health/inventory-core";
/**
 * Selected DRX code template for the MASS medication item type.
 *
 * Format: `DRX-MASS-{LOCATION}-{counter:05d}`
 * Example: `DRX-MASS-CARDIO1-00042`
 *
 * The counter is per-location (see ADR §5 and `code_counters` SQL table).
 */
export declare const DRX_CODE_TEMPLATE: "DRX-MASS-{LOCATION}-{counter:05d}";
/**
 * Build a CodeGenerator for the MASS medication item type. The returned
 * generator is a thin closure over the shared template renderer; it does NOT
 * allocate counter values — that is the platform's responsibility (atomic
 * RPC against `code_counters`).
 */
export declare function createDrxCodeGenerator(): CodeGenerator;
//# sourceMappingURL=code-template.d.ts.map