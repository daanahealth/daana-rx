"use strict";
// MASS medication label renderer.
//
// Renders the printable label per MASS MVP spec § Label Fields:
//
//   "Medication: {name}  Dose: {dosage} {unit}  Form: {form}  Code: {unit_code}"
//
// Labels are pre-printed with blank spaces and filled in by hand. This
// component is the on-screen "label overview" shown to the user during
// Check In step 6 (system displays label overview with all required fields)
// and is also reused on the print sheet via the `print:` Tailwind variants.
//
// Marked `'use client'` so it renders inside Next.js App Router server pages
// without forcing the whole tree to client-render. The component itself uses
// no hooks; the marker is a hedge for callers that wrap it in interactive UI.
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicationLabel = MedicationLabel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Render a MASS medication label.
 *
 * The DOM is monochrome by default and uses `print:` utilities so it is
 * legible when sent to a label printer. Fields are arranged in the exact
 * order specified by the spec.
 */
function MedicationLabel({ item, className, }) {
    const attrs = item.attributes;
    const medicationName = attrs.medication_name ?? "—";
    const dosage = attrs.dosage ?? "—";
    const unit = attrs.unit ?? "";
    const form = attrs.form ?? "—";
    const unitCode = item.unitCode || "—";
    const rootClass = [
        // On-screen: card-like, neutral palette so the label reads like physical paper.
        "inline-block",
        "border",
        "border-black",
        "bg-white",
        "text-black",
        "px-4",
        "py-3",
        "font-sans",
        "leading-snug",
        // Print: maximize contrast + size for the label sheet.
        "print:border-2",
        "print:border-black",
        "print:bg-white",
        "print:text-black",
        "print:p-4",
        "print:break-inside-avoid",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    const rowClass = "flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg print:text-2xl";
    const labelClass = "font-semibold uppercase tracking-wide text-sm print:text-base";
    const valueClass = "font-medium";
    return ((0, jsx_runtime_1.jsx)("div", { className: rootClass, "data-testid": "mass-medication-label", children: (0, jsx_runtime_1.jsxs)("div", { className: rowClass, children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { className: labelClass, children: "Medication:" }), " ", (0, jsx_runtime_1.jsx)("span", { className: valueClass, children: medicationName })] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { className: labelClass, children: "Dose:" }), " ", (0, jsx_runtime_1.jsxs)("span", { className: valueClass, children: [dosage, unit ? ` ${unit}` : ""] })] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { className: labelClass, children: "Form:" }), " ", (0, jsx_runtime_1.jsx)("span", { className: valueClass, children: form })] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { className: labelClass, children: "Code:" }), " ", (0, jsx_runtime_1.jsx)("span", { className: `${valueClass} font-mono tracking-wider`, children: unitCode })] })] }) }));
}
exports.default = MedicationLabel;
//# sourceMappingURL=labels.js.map