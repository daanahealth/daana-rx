/**
 * Scan / lookup API — thin typed wrappers over the legacy unit endpoints in
 * src/lib/api.ts (the scan page still reads the legacy `units` schema; do not
 * add to it — see docs/FRONTEND_ARCHITECTURE.md §1).
 */
import { inventory, transactions } from '@/lib/api';

/** Raw legacy unit row (as returned by /inventory/units/:id and /search). */
export interface LegacyUnitRow {
  unitId: string;
  drug: {
    medicationName: string;
    genericName?: string | null;
    strength?: string | number | null;
    strengthUnit?: string | null;
    form?: string | null;
  };
  lot?: { source?: string | null } | null;
  expiryDate?: string | null;
  availableQuantity: number;
  totalQuantity: number;
  optionalNotes?: string | null;
}

export interface LegacyTransactionRow {
  transactionId: string;
  timestamp: string;
  type: string;
  quantity: number;
  notes?: string | null;
}

export function getUnit(unitId: string): Promise<LegacyUnitRow> {
  return inventory.getUnit(unitId) as Promise<LegacyUnitRow>;
}

export function searchUnits(query: string): Promise<LegacyUnitRow[]> {
  return inventory.searchUnits(query) as Promise<LegacyUnitRow[]>;
}

export async function listUnitTransactions(unitId: string): Promise<LegacyTransactionRow[]> {
  const res = await transactions.getTransactions({ page: 1, pageSize: 10, unitId });
  return res.transactions as LegacyTransactionRow[];
}
