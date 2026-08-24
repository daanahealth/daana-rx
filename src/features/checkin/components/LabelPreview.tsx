'use client';

/**
 * LabelPreview — the printable 4in × 2in label (QR + fields) for the sticker.
 * Print isolates `.print-label` and sizes the page to the label; the e2e
 * specs assert on `.print-label svg` and the label text, keep those hooks.
 */
import type { Item } from '@daana-health/inventory-core';
import { Printer } from 'lucide-react';
import { UnitLabel } from '@/components/unit-label/UnitLabel';
import { Button } from '@/components/ui/button';

export interface LabelPreviewProps {
  readonly item: Item;
  readonly locationCode: string;
  readonly onPrint?: () => void;
}

function attrStr(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === 'string' ? v : v == null ? null : String(v);
}

export function LabelPreview({ item, locationCode, onPrint }: LabelPreviewProps) {
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const qty = attrStr(attrs, 'quantity') ?? '1';

  const handlePrint = () => {
    if (onPrint) return onPrint();
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="daana-label-preview space-y-1.5">
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

      <div className="no-print flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-subtle-foreground">Label preview</p>
        <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
          <Printer aria-hidden /> Print label
        </Button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-panel p-3 print:overflow-visible print:border-0 print:p-0">
        <div className="print-label mx-auto w-[384px]">
          <UnitLabel
            unitId={item.unitCode || ''}
            medicationName={attrStr(attrs, 'medication_name') ?? '—'}
            strength={attrStr(attrs, 'dosage')}
            strengthUnit={attrStr(attrs, 'unit')}
            form={attrStr(attrs, 'form')}
            availableQuantity={qty}
            totalQuantity={qty}
            expiryDate={item.expiryDate ?? null}
            locationName={locationCode || null}
          />
        </div>
      </div>
    </div>
  );
}
