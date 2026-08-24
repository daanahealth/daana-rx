'use client';

/**
 * ScanScreen — scan a DRX QR (or type a unit id / search) and see the unit
 * with its history. Reads the legacy unit endpoints via features/scan/api.ts.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, X } from 'lucide-react';
import { QRScanner } from '@/components/QRScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DateText, KeyValueList, PageHeader, type Column } from '@/components/composed';
import { formatCount } from '@/lib/format';
import { useUnitLookup } from './hooks';
import { transactionTypeLabel, type ScanTransaction, type ScanUnit } from './mappers';

const RESULT_COLUMNS: Column<ScanUnit>[] = [
  { key: 'name', header: 'Medication', primary: true, cell: (r) => r.medicationName },
  { key: 'generic', header: 'Generic', secondary: true, cell: (r) => r.genericName ?? '—' },
  {
    key: 'available',
    header: 'Available',
    kind: 'number',
    cell: (r) => formatCount(r.availableQuantity),
  },
  {
    key: 'expiry',
    header: 'Expiry',
    kind: 'date',
    cell: (r) => <DateText value={r.expiryDate} expiry />,
    sortValue: (r) => r.expiryDate,
  },
];

const HISTORY_COLUMNS: Column<ScanTransaction>[] = [
  {
    key: 'when',
    header: 'Date',
    kind: 'date',
    primary: true,
    cell: (t) => <DateText value={t.timestamp} withTime />,
    sortValue: (t) => t.timestamp,
  },
  { key: 'type', header: 'Type', cell: (t) => transactionTypeLabel(t.type) },
  { key: 'qty', header: 'Quantity', kind: 'number', cell: (t) => formatCount(t.quantity) },
  { key: 'notes', header: 'Notes', cell: (t) => t.notes ?? '—' },
];

export function ScanScreen() {
  const router = useRouter();
  const lookup = useUnitLookup();
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Scan / Lookup" description="Find a unit by its QR code, id, or name." />

      <Card>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="w-full"
            onClick={() => setScannerOpen(true)}
          >
            <QrCode aria-hidden /> Scan QR code
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="unit-id" className="text-xs font-medium text-subtle-foreground">
              Unit id or search
            </Label>
            <div className="flex gap-2">
              <Input
                id="unit-id"
                placeholder="Unit id, DRX code or medication"
                inputMode="search"
                autoComplete="off"
                value={lookup.query}
                onChange={(e) => lookup.change(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') lookup.search(lookup.query);
                }}
                className="h-11 flex-1 sm:h-10"
              />
              {lookup.query ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-10 sm:w-10"
                  onClick={lookup.clear}
                  aria-label="Clear"
                >
                  <X aria-hidden />
                </Button>
              ) : null}
            </div>
          </div>

          {lookup.results.length > 0 && !lookup.unit ? (
            <DataTable
              rows={lookup.results}
              rowKey={(r) => r.unitId}
              columns={RESULT_COLUMNS}
              onRowClick={lookup.select}
              rowActions={(r) => (
                <Button type="button" size="sm" variant="outline" onClick={() => lookup.select(r)}>
                  Select
                </Button>
              )}
              caption="Search results"
            />
          ) : null}
        </CardContent>
      </Card>

      {lookup.unit ? (
        <>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <CardTitle>{lookup.unit.medicationName}</CardTitle>
              <span className="shrink-0 text-sm tabular-nums text-subtle-foreground">
                {formatCount(lookup.unit.availableQuantity)} /{' '}
                {formatCount(lookup.unit.totalQuantity)} available
              </span>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <KeyValueList
                items={[
                  { label: 'Generic name', value: lookup.unit.genericName },
                  { label: 'Strength', value: lookup.unit.strength },
                  { label: 'Form', value: lookup.unit.form },
                  { label: 'Source', value: lookup.unit.source },
                  { label: 'Expiry', value: <DateText value={lookup.unit.expiryDate} expiry /> },
                  { label: 'Unit id', value: lookup.unit.unitId, code: true },
                  ...(lookup.unit.notes
                    ? [{ label: 'Notes', value: lookup.unit.notes, wide: true }]
                    : []),
                ]}
              />
              <Button
                type="button"
                size="touch"
                className="w-full sm:w-auto"
                disabled={lookup.unit.availableQuantity === 0}
                onClick={() => router.push(`/checkout?unitId=${lookup.unit?.unitId}`)}
              >
                Quick check out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction history</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DataTable
                rows={lookup.history}
                rowKey={(t) => t.id}
                columns={HISTORY_COLUMNS}
                dense
                empty={{
                  title: 'No transactions yet',
                  description: 'Check-ins and check-outs for this unit will show here.',
                }}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      <QRScanner
        opened={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setScannerOpen(false);
          lookup.scanned(code);
        }}
        title="Scan DaanaRX QR code"
        description="Scan the QR code on the medication unit to look it up"
      />
    </div>
  );
}
