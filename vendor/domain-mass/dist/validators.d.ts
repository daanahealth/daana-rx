import { type Item, type ValidationResult, type Validator } from "@daana-health/inventory-core";
/**
 * Compute the spec's expiry fallback: 10 years before today, as YYYY-MM-DD.
 * Pure function — `today` is injected for testability.
 */
export declare function tenYearsBeforeToday(today?: Date): string;
/**
 * Medications must have an expiry date. When missing, return the spec's
 * fallback ("10 years before today") in the issue message so the caller can
 * surface it to the user as a one-click default.
 */
export declare const requireExpiryForMedications: Validator<Item>;
/**
 * For high-risk classes (PSYCH / NEPHRO / SLEEP / NEURO / Hold), require an
 * explicit supervisor acknowledgement before intake completes. Lower-risk
 * classes pass through.
 *
 * The check uses `findClassification` on `attributes.specialty_class` — if
 * the class is unknown, treat it as high-risk (defensive default; matches
 * the spec's "Hold" semantics).
 */
export declare const requireSpecialtyReviewForHighRisk: Validator<Item>;
/**
 * Aggregate every MASS-specific validator. Composed into ItemTypeConfig in
 * config.ts. The platform also runs JSON-Schema validation against
 * attributeSchema separately; these run after.
 */
export declare const massMedicationValidators: ReadonlyArray<Validator<Item>>;
/** Convenience: run all MASS validators and aggregate issues. */
export declare function validateMedicationItem(item: Item): ValidationResult;
//# sourceMappingURL=validators.d.ts.map