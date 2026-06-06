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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Render a MASS medication label.
 *
 * The DOM is monochrome by default and uses `print:` utilities so it is
 * legible when sent to a label printer. Fields are arranged in the exact
 * order specified by the spec.
 */
export function MedicationLabel({ item, className, }) {
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
    return (_jsx("div", { className: rootClass, "data-testid": "mass-medication-label", children: _jsxs("div", { className: rowClass, children: [_jsxs("span", { children: [_jsx("span", { className: labelClass, children: "Medication:" }), " ", _jsx("span", { className: valueClass, children: medicationName })] }), _jsxs("span", { children: [_jsx("span", { className: labelClass, children: "Dose:" }), " ", _jsxs("span", { className: valueClass, children: [dosage, unit ? ` ${unit}` : ""] })] }), _jsxs("span", { children: [_jsx("span", { className: labelClass, children: "Form:" }), " ", _jsx("span", { className: valueClass, children: form })] }), _jsxs("span", { children: [_jsx("span", { className: labelClass, children: "Code:" }), " ", _jsx("span", { className: `${valueClass} font-mono tracking-wider`, children: unitCode })] })] }) }));
}
export default MedicationLabel;
//# sourceMappingURL=labels.js.map