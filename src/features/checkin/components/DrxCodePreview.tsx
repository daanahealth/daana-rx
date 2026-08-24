'use client';

/**
 * DrxCodePreview — the server-issued DRX code, exactly as it will be stored.
 * There is deliberately no client-side generator here: a locally built code
 * once printed stickers that did not match the unit in the system. While the
 * code is being allocated it shows a skeleton; on failure, a retry.
 */
import { Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { CodeState } from '../flow';

export interface DrxCodePreviewProps {
  readonly locationCode: string;
  readonly code: CodeState;
  readonly onRetry: () => void;
}

export function DrxCodePreview({ locationCode, code, onRetry }: DrxCodePreviewProps) {
  const { toast } = useToast();
  const unitCode = code.status === 'success' ? code.data.unitCode : null;

  const copy = async () => {
    if (!unitCode) return;
    try {
      await navigator.clipboard.writeText(unitCode);
      toast({ title: 'Copied', description: 'DRX code copied to clipboard.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Copy the code manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-subtle-foreground">DRX code</p>

      {code.status === 'loading' || code.status === 'idle' ? (
        <div className="space-y-1.5" aria-busy>
          <Skeleton className="h-11 w-full max-w-xs" />
          <p className="text-xs text-muted-foreground">
            Allocating the next code for <span className="font-mono">{locationCode}</span>…
          </p>
        </div>
      ) : null}

      {code.status === 'error' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-sm text-danger">
            No code was issued: {code.message}. The label cannot be confirmed without one.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden /> Retry
          </Button>
        </div>
      ) : null}

      {code.status === 'success' ? (
        unitCode ? (
          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid="drx-code"
              className="rounded-sm border border-border bg-panel px-3 py-2 font-mono text-base tabular-nums text-foreground sm:text-lg"
            >
              {unitCode}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              <Copy aria-hidden /> Copy
            </Button>
          </div>
        ) : (
          <p className="text-sm text-danger">
            The code service replied without a unit code. Retry, or check the gateway.
          </p>
        )
      ) : null}
    </div>
  );
}
