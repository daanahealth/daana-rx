'use client';

// DrxCodePreview — renders the generated DRX-MASS-{LOCATION}-{counter:05d}
// code using `createDrxCodeGenerator` from @daana-health/domain-mass.
//
// The counter must come from the backend (per-location atomic allocation).
// While the counter is being fetched, render a skeleton; on error, render an
// inline retry button.

import { useMemo } from 'react';
import { createDrxCodeGenerator, MASS_ITEM_TYPE_NAME } from '@daana-health/domain-mass';
import { Loader2, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface DrxCodePreviewProps {
  readonly locationCode: string;
  readonly counter: number | null;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly itemTypeId?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export function DrxCodePreview({
  locationCode,
  counter,
  loading,
  error,
  onRetry,
  itemTypeId = 'medication',
  attributes = {},
}: DrxCodePreviewProps) {
  const { toast } = useToast();

  const code = useMemo(() => {
    if (counter == null || !locationCode) return null;
    const gen = createDrxCodeGenerator();
    return gen.generate({
      itemTypeId,
      itemTypeName: MASS_ITEM_TYPE_NAME,
      locationCode,
      counter,
      attributes,
    });
  }, [counter, locationCode, itemTypeId, attributes]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Copied', description: 'DRX code copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Copy the code manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Generated DaanaRX code</div>
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Allocating next code for <span className="font-mono">{locationCode}</span>…
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}
      {!loading && !error && code && (
        <div className="flex items-center gap-3 flex-wrap">
          <code className="font-mono text-lg sm:text-2xl tracking-wider bg-muted px-3 py-2 rounded-md break-all">
            {code}
          </code>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
        </div>
      )}
      {!loading && !error && !code && (
        <p className="text-sm text-muted-foreground">
          Select a location to generate a code.
        </p>
      )}
    </div>
  );
}
