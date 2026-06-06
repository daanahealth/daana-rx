import type { Item } from "@daana-health/inventory-core";
import type { ReactElement } from "react";
export interface MedicationLabelProps {
    /** The inventory item to render a label for. Attributes must conform to MedicationAttributes. */
    readonly item: Item;
    /** Optional extra className appended to the root container. */
    readonly className?: string;
}
/**
 * Render a MASS medication label.
 *
 * The DOM is monochrome by default and uses `print:` utilities so it is
 * legible when sent to a label printer. Fields are arranged in the exact
 * order specified by the spec.
 */
export declare function MedicationLabel({ item, className, }: MedicationLabelProps): ReactElement;
export default MedicationLabel;
//# sourceMappingURL=labels.d.ts.map