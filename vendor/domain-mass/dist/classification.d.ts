export interface ClassificationEntry {
    /** Stable identifier; matches `attributes.specialty_class`. */
    readonly class_name: string;
    /** Human-readable list of common medications in this class. */
    readonly common_examples: readonly string[];
    /** Bin location code suggested for this class (matches `locations.code`). */
    readonly location_code: string;
    /** 2-letter abbreviation reserved for barcode / Option-2/3 code templates. */
    readonly two_digit_code: string;
    /** When true, intake must be reviewed by a superadmin before completion. */
    readonly supervisor_review: boolean;
}
export declare const MASS_CLASSIFICATION_GUIDE: readonly ClassificationEntry[];
export interface LocationSuggestion {
    /** Suggested location_code (always non-null; defaults to "Hold"). */
    readonly location_code: string;
    /** The full classification entry chosen. */
    readonly entry: ClassificationEntry;
    /** How the suggestion was reached. Useful for explaining the choice in UI. */
    readonly match: "class_name" | "location_code" | "example" | "substring" | "fallback";
    /** True for the Hold fallback. */
    readonly requires_supervisor_review: boolean;
}
/**
 * Suggest a location bin code for a free-text class or medication name.
 *
 * Uses simple case-insensitive substring matching (no fuzzy/Levenshtein
 * matching). When no candidate is found, falls back to the "Hold" bin which
 * requires supervisor review per the classification guide.
 */
export declare function suggestLocationForClass(query: string): LocationSuggestion;
/** Return the classification entry for a given class_name (case-insensitive), or undefined. */
export declare function findClassification(className: string): ClassificationEntry | undefined;
//# sourceMappingURL=classification.d.ts.map