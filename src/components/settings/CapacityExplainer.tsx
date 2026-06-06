'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info, Gauge, Bell } from 'lucide-react';

/**
 * Read-only panel — Settings > Capacity Thresholds.
 *
 * Wording is taken verbatim from the spec:
 *   "Default 50 units per bin, configurable per bin in Locations.
 *    Alert fires at 90%, not separately configurable."
 */
export function CapacityExplainer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Capacity Thresholds</CardTitle>
        <CardDescription>How bin capacity and capacity alerts work in DaanaRX.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Gauge className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Default 50 units per bin</p>
              <p className="text-sm text-muted-foreground">
                Configurable per bin in <span className="font-medium">Locations</span>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Bell className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Alert fires at 90%</p>
              <p className="text-sm text-muted-foreground">Not separately configurable.</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            When a bin reaches its configured capacity, Check In suggests the next sequential bin within the same
            specialty (e.g. CARDIO1 full → CARDIO2). If no overflow bin exists, create one in Locations before continuing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
