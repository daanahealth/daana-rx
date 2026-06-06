import type { AttributeSchema } from "@daana-health/inventory-core";
/** Allowed values for `attributes.form`. Source: MASS MVP spec § Label Fields. */
export declare const MEDICATION_FORMS: readonly ["Bottle", "Card", "Cream", "Nasal Spray", "Insulin Pen", "Injection", "Other"];
export type MedicationForm = (typeof MEDICATION_FORMS)[number];
export declare const medicationAttributeSchema: AttributeSchema;
/**
 * Typed view over `Item.attributes` for code that operates strictly within the
 * MASS medication item type. Use this when you've already type-narrowed by item
 * type; the core platform does not enforce this shape at the row level — only
 * the JSON Schema above is enforced at write time.
 */
export interface MedicationAttributes {
    medication_name: string;
    dosage: string;
    unit: string;
    form: MedicationForm;
    specialty_class: string;
    quantity?: number;
    notes?: string;
    supervisor_acknowledged?: boolean;
    med_initial?: string;
    dose_initial?: string;
    specialty_code?: string;
    specialty_num?: string;
    lr_code?: string;
}
//# sourceMappingURL=attribute-schema.d.ts.map