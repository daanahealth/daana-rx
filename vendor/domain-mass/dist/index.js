"use strict";
// @daana-health/domain-mass
// DaanaRX MASS Clinic domain pack: medication attribute schema, DRX codes,
// classification rules, label renderer, and validators.
//
// Quick start:
//
//   import { MASS_ITEM_TYPE } from "@daana-health/domain-mass";
//   platform.registerItemType(MASS_ITEM_TYPE);
//
// Individual modules are re-exported for callers that want narrower imports
// (e.g. just the classification guide for a settings UI, or just the label
// component for a print sheet).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./attribute-schema.js"), exports);
__exportStar(require("./classification.js"), exports);
__exportStar(require("./code-template.js"), exports);
__exportStar(require("./labels.js"), exports);
__exportStar(require("./validators.js"), exports);
__exportStar(require("./config.js"), exports);
//# sourceMappingURL=index.js.map