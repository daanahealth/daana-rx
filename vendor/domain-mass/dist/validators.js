"use strict";
// Cross-field / business-rule validators specific to MASS medications.
//
// JSON Schema (attribute-schema.ts) handles per-field shape validation. These
// validators handle rules that the schema cannot express:
//
//   1. requireExpiryForMedications
//      Every medication unit must have items.expiry_date set. Per the spec
//      § Editable Fields: "Expiry date (if applicable; if no such exp date
//      exists, then 10 years before today's date)" — the fallback is the
//      spec's own answer for unknown expiry. This validator flags missing
//      expiry and exposes the fallback so callers (Check In UI / RPC) can
//      offer to auto-populate.
//
//   2. requireSpecialtyReviewForHighRisk
//      Items whose specialty_class has supervisor_review: true must have
//      attributes.supervisor_acknowledged === true. This gates intake on the
//      high-risk specialty rows from the Medication Classification Guide
//      (PSYCH, NEPHRO, SLEEP, NEURO, Hold).
Object.defineProperty(exports, "__esModule", { value: true });
exports.massMedicationValidators = exports.requireSpecialtyReviewForHighRisk = exports.requireExpiryForMedications = exports.tenYearsBeforeToday = void 0;
exports.tenYearsFromToday = tenYearsFromToday;
exports.validateMedicationItem = validateMedicationItem;
const inventory_core_1 = require("@daana-health/inventory-core");
const classification_js_1 = require("./classification.js");
/**
 * Compute the expiry fallback: 10 years from today (forward), as YYYY-MM-DD.
 * Pure function — `today` is injected for testability.
 *
 * The spec wording said "10 years before today" but field testing showed
 * the intent is forward — donated medications without packaging expiry
 * should be treated as good for 10 more years, not already-expired.
 */
function tenYearsFromToday(today = new Date()) {
    const d = new Date(today);
    d.setUTCFullYear(d.getUTCFullYear() + 10);
    const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const dd = d.getUTCDate().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
// Back-compat alias — the old name lives on as an alias to avoid breaking
// any consumer that imported it.
exports.tenYearsBeforeToday = tenYearsFromToday;
/**
 * Medications must have an expiry date. When missing, return the
 * fallback (10 years from today) in the issue message so the caller
 * can surface it to the user as a one-click default.
 */
const requireExpiryForMedications = (item) => {
    if (item.expiryDate && item.expiryDate.length > 0)
        return inventory_core_1.ok;
    const fallback = tenYearsFromToday();
    return (0, inventory_core_1.fail)({
        path: "expiryDate",
        code: "missing_expiry_date",
        message: `Medications must have an expiry date. ` +
            `If the donor packaging has none, use the fallback: ${fallback} ` +
            `(10 years from today).`,
    });
};
exports.requireExpiryForMedications = requireExpiryForMedications;
/**
 * For high-risk classes (PSYCH / NEPHRO / SLEEP / NEURO / Hold), require an
 * explicit supervisor acknowledgement before intake completes. Lower-risk
 * classes pass through.
 *
 * The check uses `findClassification` on `attributes.specialty_class` — if
 * the class is unknown, treat it as high-risk (defensive default; matches
 * the spec's "Hold" semantics).
 */
const requireSpecialtyReviewForHighRisk = (item) => {
    const attrs = item.attributes;
    const className = attrs.specialty_class;
    if (!className || typeof className !== "string") {
        // Schema validator will already flag this; nothing to add.
        return inventory_core_1.ok;
    }
    const entry = (0, classification_js_1.findClassification)(className);
    const requiresReview = entry?.supervisor_review ?? true; // unknown => treat as high-risk
    if (!requiresReview)
        return inventory_core_1.ok;
    if (attrs.supervisor_acknowledged === true)
        return inventory_core_1.ok;
    return (0, inventory_core_1.fail)({
        path: "attributes.supervisor_acknowledged",
        code: "supervisor_review_required",
        message: `Class "${className}" requires supervisor review. ` +
            `A superadmin must set attributes.supervisor_acknowledged = true before intake.`,
    });
};
exports.requireSpecialtyReviewForHighRisk = requireSpecialtyReviewForHighRisk;
/**
 * Aggregate every MASS-specific validator. Composed into ItemTypeConfig in
 * config.ts. The platform also runs JSON-Schema validation against
 * attributeSchema separately; these run after.
 */
exports.massMedicationValidators = [
    exports.requireExpiryForMedications,
    exports.requireSpecialtyReviewForHighRisk,
];
/** Convenience: run all MASS validators and aggregate issues. */
function validateMedicationItem(item) {
    const issues = exports.massMedicationValidators.flatMap((v) => {
        const r = v(item);
        return r.ok ? [] : [...r.issues];
    });
    return issues.length === 0 ? inventory_core_1.ok : { ok: false, issues };
}
//# sourceMappingURL=validators.js.map