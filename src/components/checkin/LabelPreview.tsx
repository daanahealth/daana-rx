'use client';

// LabelPreview — renders the MASS medication label using the
// `MedicationLabel` component from @daana-health/domain-mass. Wraps it with a
// print button driven by browser-native window.print() (the label component
// uses Tailwind's `print:` utilities for print styling).

import type { Item } from '@daana-health/inventory-core';
import { MedicationLabel } from '@daana-health/domain-mass';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LabelPreviewProps {
  readonly item: Item;
  /** Optional click handler when the user wants to print. Defaults to window.print(). */
  readonly onPrint?: () => void;
}

export function LabelPreview({ item, onPrint }: LabelPreviewProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-3 daana-label-preview">
      {/* Print-only stylesheet: hide everything else on the page so the printer
          only emits the label inside .daana-label-preview. Tailwind's `print:`
          utilities only affect classed elements; this rule isolates the whole
          page. */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .daana-label-preview, .daana-label-preview * { visibility: visible !important; }
          .daana-label-preview { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .daana-label-preview .no-print { display: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="text-sm font-semibold">Label preview</div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print preview
        </Button>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <MedicationLabel item={item} />
      </div>

      <p className="text-xs text-muted-foreground no-print">
        Write this label onto a pre-printed blank, then place the medication in the bin.
      </p>
    </div>
  );
}
