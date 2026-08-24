/**
 * CSV export for the transaction log.
 *
 * Dates go through lib/format (MM/DD/YYYY — spec B3/T10) so a spreadsheet
 * opened by the clinic reads the same as the screen; never raw ISO.
 */
import { formatDateTime, toISODate } from '@/lib/format';
import { transactionActionMeta } from '@/lib/status';
import { actorLabel, type TransactionRow, type UserDirectory } from './mappers';

export const TRANSACTION_CSV_HEADERS = [
  'Date & Time',
  'Action',
  'Medication',
  'Dose',
  'Form',
  'Location',
  'DRX Code',
  'Actor',
  'Reason',
  'Notes',
] as const;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionRowToCsv(row: TransactionRow, directory: UserDirectory = {}): string[] {
  return [
    formatDateTime(row.timestamp),
    transactionActionMeta(row.actionType).label,
    row.medicationName ?? '',
    row.dosage ?? '',
    row.form ?? '',
    row.location ?? '',
    row.drxCode ?? '',
    actorLabel(row, directory),
    row.reason ?? '',
    row.notes ?? '',
  ];
}

export function transactionsToCsv(
  rows: readonly TransactionRow[],
  directory: UserDirectory = {}
): string {
  const lines = [
    TRANSACTION_CSV_HEADERS.map(csvCell).join(','),
    ...rows.map((r) => transactionRowToCsv(r, directory).map(csvCell).join(',')),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/** File name carries the export date in ISO so it sorts in a folder. */
export function transactionsCsvFileName(now: Date = new Date()): string {
  return `daanarx-transactions-${toISODate(now)}.csv`;
}

/** Browser-only: trigger a download of the CSV. */
export function downloadCsv(csv: string, fileName: string): void {
  if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
