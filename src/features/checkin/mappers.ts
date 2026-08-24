/**
 * Check-in mappers — pure functions between the form, the domain package and
 * the wire. No React, no fetch; covered by __tests__/mappers.test.ts.
 */
import {
  MASS_CLASSIFICATION_GUIDE,
  MASS_ITEM_TYPE_NAME,
  massMedicationValidators,
  suggestLocationForClass,
  type MedicationAttributes,
} from '@daana-health/domain-mass';
import type { Item } from '@daana-health/inventory-core';
import type { BackendLocation, CreateItemPayload } from './api';
import { normalizeQuantity, type MedicationFormValues } from './schema';

/**
 * Inverse of `suggestLocationForClass`: the specialty class implied by a bin.
 *
 * Bins carry a trailing index (PSYCH1, CARDIO1, NSAID2), so match on the base
 * word. Returns null when the bin has no entry in the classification guide —
 * callers must then ask rather than guess, since specialty_class is required
 * on write and a wrong value is worse than an explicit prompt.
 */
export function specialtyClassForLocation(bin: string): string | null {
  const base = (bin ?? '').trim().toUpperCase().replace(/\d+$/, '');
  if (!base) return null;
  const entry = MASS_CLASSIFICATION_GUIDE.find((e) => e.location_code.toUpperCase() === base);
  return entry?.class_name ?? null;
}

/** The bin the classification guide suggests for a typed class / drug name. */
export function suggestedLocation(specialtyClass: string): string | null {
  const q = (specialtyClass ?? '').trim();
  return q ? suggestLocationForClass(q).location_code : null;
}

/** Form values → the attributes blob stored on the item. */
export function toMedicationAttributes(values: MedicationFormValues): MedicationAttributes {
  return {
    medication_name: values.medication_name,
    dosage: values.dosage,
    unit: values.unit,
    form: values.form as MedicationAttributes['form'],
    specialty_class: values.specialty_class,
    quantity: normalizeQuantity(values.quantity),
    notes: values.notes,
    supervisor_acknowledged: values.supervisor_acknowledged,
  };
}

/**
 * An Item-shaped preview for the label and the domain validators. The DB
 * assigns real ids/timestamps at write time. `unitCode` is always the
 * server-issued code (empty until it arrives) — never built client-side.
 */
export function buildPreviewItem(
  values: MedicationFormValues,
  unitCode: string | null,
  now: Date = new Date()
): Item {
  return {
    id: 'preview',
    typeId: 'preview',
    status: 'active',
    locationId: null,
    expiryDate: values.expiry_date || null,
    unitCode: unitCode ?? '',
    attributes: toMedicationAttributes(values) as unknown as Record<string, unknown>,
    createdAt: now.toISOString(),
    createdBy: null,
    lastEditedAt: null,
    lastEditedBy: null,
    removedAt: null,
    removedBy: null,
    removedReason: null,
  };
}

/** Run the MASS domain validators; returns "path: message" lines, empty when ok. */
export function domainIssues(item: Item): string[] {
  const messages: string[] = [];
  for (const validate of massMedicationValidators) {
    const r = validate(item);
    if (!r.ok) for (const issue of r.issues) messages.push(`${issue.path}: ${issue.message}`);
  }
  return messages;
}

/** The POST /inventory/items body. */
export function toCreateItemPayload(
  values: MedicationFormValues,
  locationCode: string
): CreateItemPayload {
  return {
    typeName: MASS_ITEM_TYPE_NAME,
    locationCode,
    expiryDate: values.expiry_date || null,
    dateReceived: values.date_received,
    attributes: toMedicationAttributes(values) as unknown as Record<string, unknown>,
  };
}

export interface LocationOption {
  code: string;
  hint: string;
}

/**
 * Bin dropdown options: the clinic's configured bins when we have them,
 * otherwise the classification guide's example codes so the form is still
 * usable before Settings → Locations has been filled in.
 */
export function toLocationOptions(backend: readonly BackendLocation[]): LocationOption[] {
  if (backend.length > 0) return backend.map((l) => ({ code: l.code, hint: l.specialty ?? '' }));
  return MASS_CLASSIFICATION_GUIDE.map((e) => ({
    code: e.location_code,
    hint: e.common_examples.slice(0, 2).join(', '),
  }));
}
