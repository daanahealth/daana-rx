import type { ItemTypeConfig } from "@daana-health/inventory-core";
import { MedicationLabel } from "./labels.js";
/** Stable item-type name. Must match the `item_types.name` row in the DB. */
export declare const MASS_ITEM_TYPE_NAME: "medication";
/**
 * MASS domain pack registration. This is the **single import** a backend
 * (RPC registry) or frontend (form/label registry) needs to wire up the
 * MASS medication item type against the generic core platform.
 */
export interface MassItemTypeConfig extends ItemTypeConfig {
    /** React component that renders the printable label for an item of this type. */
    readonly labelComponent: typeof MedicationLabel;
}
export declare const MASS_ITEM_TYPE: MassItemTypeConfig;
//# sourceMappingURL=config.d.ts.map