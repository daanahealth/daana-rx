'use client';

// InventoryScreen — the superadmin/employee inventory control panel
// (MVP spec § Inventory Tab). Owns filter state and the open drawer; data
// comes from the feature hooks, every URL lives in ./api.ts.
//
// Providers (read-only role) get their own medication-level screen from lane
// A4 — see the hook point at the top of the component.

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/components/composed';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { canModifyStock, isReadOnlyRole } from '@/lib/roles';
import { pluralize } from '@/lib/format';
import type { RootState } from '@/store';
import { directCheckout } from './api';
import { useInventoryList, useLocations } from './hooks';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  medicationName,
  toQuery,
  type InventoryFilters as Filters,
  type InventoryRow,
} from './mappers';
import { InventoryFilters } from './components/InventoryFilters';
import { InventoryTable } from './components/InventoryTable';
import { ItemDetailsDrawer } from './components/ItemDetailsDrawer';
import { EditItemDrawer } from './components/EditItemDrawer';
import { RemoveItemDialog } from './components/RemoveItemDialog';
import { TransactionHistoryDrawer } from './components/TransactionHistory';
import { CheckoutConfirmDialog } from './components/CheckoutConfirmDialog';

type Drawer =
  | { kind: 'details'; item: InventoryRow }
  | { kind: 'edit'; item: InventoryRow }
  | { kind: 'remove'; item: InventoryRow }
  | { kind: 'history'; item: InventoryRow }
  | { kind: 'checkout'; item: InventoryRow }
  | null;

export function InventoryScreen() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const role = currentUser?.userRole;

  if (isReadOnlyRole(role)) {
    // TODO(lane A4): `return <ProviderInventoryScreen />` from '@/features/provider'
    // once that feature lands (medication-level, no locations or DRX codes).
    // Until then providers see the stock table with every stock action hidden.
  }

  return (
    <StockInventoryScreen isSuperadmin={role === 'superadmin'} mayModify={canModifyStock(role)} />
  );
}

function StockInventoryScreen({
  isSuperadmin,
  mayModify,
}: {
  isSuperadmin: boolean;
  mayModify: boolean;
}) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const query = useMemo(() => toQuery(filters), [filters]);
  const { rows, loading, refreshing, error, refetch } = useInventoryList(query);
  const locations = useLocations();

  const [drawer, setDrawer] = useState<Drawer>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const close = () => setDrawer(null);
  const openFor = (kind: Exclude<Drawer, null>['kind']) => (item: InventoryRow) =>
    setDrawer({ kind, item });
  const onDetails = useCallback((item: InventoryRow) => setDrawer({ kind: 'details', item }), []);

  const handleDirectCheckout = async () => {
    if (drawer?.kind !== 'checkout' || !isSuperadmin) return;
    const item = drawer.item;
    setCheckingOut(true);
    try {
      await directCheckout(item.id);
      toast({ title: 'Checked out', description: `${medicationName(item)} has been checked out.` });
      close();
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      toast({ title: 'Checkout failed', description: msg, variant: 'destructive' });
    } finally {
      setCheckingOut(false);
    }
  };

  const hasFilters = activeFilterCount(filters) > 0;
  const empty = hasFilters
    ? {
        title: 'No medications match the current filters.',
        description: 'Try a broader search or clear a filter.',
        action: (
          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear filters
          </Button>
        ),
      }
    : {
        title: 'No medications in inventory yet. Check in a medication to get started.',
        description: 'Donated medications appear here once they are checked in.',
        action: (
          <Button asChild>
            <Link href="/checkin">Go to Check In</Link>
          </Button>
        ),
      };

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Every unit on the shelf, with its DRX code, expiry and status."
        actions={
          <Button
            variant="outline"
            onClick={() => refetch()}
            loading={refreshing}
            disabled={loading}
          >
            {refreshing ? null : <RefreshCcw aria-hidden />}
            Refresh
          </Button>
        }
      />

      <div className="space-y-4">
        <InventoryFilters
          filters={filters}
          onChange={setFilters}
          locations={locations}
          trailing={!loading && !error ? pluralize(rows.length, 'unit') : undefined}
        />

        <InventoryTable
          key={query}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={() => refetch()}
          empty={empty}
          isSuperadmin={isSuperadmin}
          mayModify={mayModify}
          onDetails={onDetails}
          onEdit={openFor('edit')}
          onCheckout={openFor('checkout')}
          onRemove={openFor('remove')}
          onHistory={openFor('history')}
        />
      </div>

      <ItemDetailsDrawer
        item={drawer?.kind === 'details' ? drawer.item : null}
        open={drawer?.kind === 'details'}
        onOpenChange={(open) => !open && close()}
        isSuperadmin={isSuperadmin}
        onCheckout={() => {
          // Hand off to the superadmin-gated checkout confirmation so approval
          // + transaction logging stay in one place.
          if (drawer?.kind === 'details') setDrawer({ kind: 'checkout', item: drawer.item });
        }}
      />

      <EditItemDrawer
        key={drawer?.kind === 'edit' ? drawer.item.id : 'edit-none'}
        item={drawer?.kind === 'edit' ? drawer.item : null}
        open={drawer?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        onSaved={() => {
          close();
          refetch();
        }}
        locations={locations}
      />

      <RemoveItemDialog
        key={drawer?.kind === 'remove' ? drawer.item.id : 'remove-none'}
        item={drawer?.kind === 'remove' ? drawer.item : null}
        open={drawer?.kind === 'remove'}
        onOpenChange={(open) => !open && close()}
        onRemoved={() => {
          close();
          refetch();
        }}
      />

      <TransactionHistoryDrawer
        item={drawer?.kind === 'history' ? drawer.item : null}
        open={drawer?.kind === 'history'}
        onOpenChange={(open) => !open && close()}
      />

      <CheckoutConfirmDialog
        item={drawer?.kind === 'checkout' ? drawer.item : null}
        open={drawer?.kind === 'checkout'}
        onOpenChange={(open) => !open && close()}
        onConfirm={handleDirectCheckout}
        busy={checkingOut}
        isSuperadmin={isSuperadmin}
      />
    </>
  );
}
