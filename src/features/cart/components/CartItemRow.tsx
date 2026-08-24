'use client';

// One reserved unit inside the cart drawer: name, dose · form · qty, status,
// then the shelf facts (location, expiry, DRX code), who added it and when,
// and Remove.

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateText, KeyValueList, StatusChip } from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { removeItemFromCart } from '../api';
import { itemSubtitle, type CartItemView } from '../mappers';

export interface CartItemRowProps {
  readonly item: CartItemView;
  readonly cartId: string;
  readonly canRemove: boolean;
  readonly onRemoved: (itemId: string) => void;
}

export function CartItemRow({ item, cartId, canRemove, onRemoved }: CartItemRowProps) {
  const { toast } = useToast();
  const [removing, setRemoving] = React.useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeItemFromCart(cartId, item.itemId);
      onRemoved(item.itemId);
      toast({ title: 'Removed from cart', description: item.unitCode });
    } catch (err) {
      toast({
        title: 'Remove failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const subtitle = itemSubtitle(item);

  return (
    <li className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-snug text-foreground">
            {item.medicationName}
          </p>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <StatusChip status={item.status} />
      </div>

      <KeyValueList
        columns={2}
        items={[
          { label: 'Location', value: item.locationCode },
          { label: 'Expiry', value: <DateText value={item.expiryDate} expiry /> },
          { label: 'DRX code', value: item.unitCode, code: true, wide: true },
        ]}
      />

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {item.addedBy ? `${item.addedBy} · ` : 'Added '}
          <DateText value={item.addedAt} withTime />
        </span>
        {canRemove ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            loading={removing}
            className="h-9 text-danger hover:text-danger"
          >
            <Trash2 aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>
    </li>
  );
}
