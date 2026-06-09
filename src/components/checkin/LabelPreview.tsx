'use client';

// LabelPreview — renders the printable medication label for Check In step 6.
// Uses the rich UnitLabel component (QR code + all medication fields) and prints
// it at a real label size (4in x 2in) instead of a full page. The QR encodes
// the DaanaRX unit code so the label can be scanned back to the unit.

import type { Item } from '@daana-health/inventory-core';
import { UnitLabel } from '@/components/unit-label/UnitLabel';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LabelPreviewProps {
  readonly item: Item;
  /** Optional click handler when the user wants to print. Defaults to window.print(). */
  readonly onPrint?: () => void;
}

function attrStr(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === 'string' ? v : v == null ? null : String(v);
}

export function LabelPreview({ item, onPrint }: LabelPreviewProps) {
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const qty = attrStr(attrs, 'quantity') ?? '1';

  const handlePrint = () => {
    if (onPrint) return onPrint();
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="space-y-3 daana-label-preview">
      {/* Print: isolate the label and size the page to a 4x2in label sheet so it
          doesn't fill a full page. Only the .print-label region is emitted. */}
      <style jsx global>{`
        @media print {
          @page {
            size: 4in 2in;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          .daana-label-preview .print-label,
          .daana-label-preview .print-label * {
            visibility: visible !important;
          }
          .daana-label-preview .print-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 384px !important;
            height: 192px !important;
          }
          .daana-label-preview .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="text-sm font-semibold">Label preview</div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print preview
        </Button>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <div className="print-label">
          <UnitLabel
            unitId={item.unitCode || ''}
            medicationName={attrStr(attrs, 'medication_name') ?? '—'}
            strength={attrStr(attrs, 'dosage')}
            strengthUnit={attrStr(attrs, 'unit')}
            form={attrStr(attrs, 'form')}
            availableQuantity={qty}
            totalQuantity={qty}
            expiryDate={item.expiryDate ?? null}
            locationName={(item as unknown as { locationCode?: string | null }).locationCode ?? null}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground no-print">
        Write this label onto a pre-printed blank, then place the medication in the bin.
      </p>
    </div>
  );
}
