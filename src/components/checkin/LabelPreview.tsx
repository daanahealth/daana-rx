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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-semibold">Label preview</div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print preview
        </Button>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <MedicationLabel item={item} />
      </div>

      <p className="text-xs text-muted-foreground">
        Write this label onto a pre-printed blank, then place the medication in the bin.
      </p>
    </div>
  );
}
