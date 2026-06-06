"use strict";
// MASS_ITEM_TYPE — the single ItemTypeConfig that a backend or frontend
// imports to register the MASS medication domain with the core platform.
//
// Bundles together:
//   - the JSON Schema for medication attributes
//   - the DRX-MASS-{LOCATION}-{counter:05d} code template
//   - the cross-field validators (expiry required, supervisor review)
//   - a `labelComponent` reference so generic UI can render the printable label
//
// Note: `ItemTypeConfig` (from inventory-core) does not currently include a
// labelComponent slot. We extend it here with a domain-pack-specific shape so
// MASS consumers get a single source of truth. Generic platform code that
// only needs the core fields can still consume it as `ItemTypeConfig` via
// structural typing.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASS_ITEM_TYPE = exports.MASS_ITEM_TYPE_NAME = void 0;
const attribute_schema_js_1 = require("./attribute-schema.js");
const code_template_js_1 = require("./code-template.js");
const labels_js_1 = require("./labels.js");
const validators_js_1 = require("./validators.js");
/** Stable item-type name. Must match the `item_types.name` row in the DB. */
exports.MASS_ITEM_TYPE_NAME = "medication";
exports.MASS_ITEM_TYPE = {
    name: exports.MASS_ITEM_TYPE_NAME,
    codeFormatTemplate: code_template_js_1.DRX_CODE_TEMPLATE,
    attributeSchema: attribute_schema_js_1.medicationAttributeSchema,
    validators: validators_js_1.massMedicationValidators,
    labelComponent: labels_js_1.MedicationLabel,
};
//# sourceMappingURL=config.js.map