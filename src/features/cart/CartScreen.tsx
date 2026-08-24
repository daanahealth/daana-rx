'use client';

// CartScreen — the legacy /cart page over the Redux cart slice (legacy
// `units`, batch checkout via POST /transactions/checkout/batch). The shell's
// top-right cart button still lands here. Providers are sent home.

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react';
import type { RootState } from '@/store';
import { removeFromCart, updateQuantity, setCartNotes, clearCart } from '@/store/cartSlice';
import type { CartItem } from '@/store/cartSlice';
import { transactions } from '@/lib/api';
import { isReadOnlyRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DataTable,
  DateText,
  EmptyState,
  KeyValueList,
  PageHeader,
  QuantityStepper,
  type Column,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';

export function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const role = useSelector((s: RootState) => s.auth.user?.userRole);
  const { items, notes } = useSelector((s: RootState) => s.cart);
  const [checkingOut, setCheckingOut] = React.useState(false);

  const isProvider = isReadOnlyRole(role);
  React.useEffect(() => {
    if (isProvider) router.replace('/');
  }, [isProvider, router]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckOutAll = async () => {
    if (items.length === 0) {
      toast({ title: 'Error', description: 'Cart is empty', variant: 'destructive' });
      return;
    }
    setCheckingOut(true);
    try {
      const batch = items.map((item) => ({ unitId: item.unit.unitId, quantity: item.quantity }));
      const result = await transactions.batchCheckout(batch, notes || undefined);
      toast({
        title: 'Success',
        description: `Checked out ${result.totalItems} item(s), ${result.totalQuantity} total units`,
      });
      dispatch(clearCart());
    } catch (err) {
      toast({
        title: 'Checkout Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const columns: Column<CartItem>[] = [
    {
      key: 'medication',
      header: 'Medication',
      primary: true,
      cell: (r) => r.unit.drug.medicationName,
      sortValue: (r) => r.unit.drug.medicationName,
    },
    {
      key: 'strength',
      header: 'Strength / Form',
      secondary: true,
      cell: (r) =>
        [
          `${r.unit.drug.strength} ${r.unit.drug.strengthUnit}`.trim(),
          r.unit.drug.form,
          r.unit.drug.genericName,
        ]
          .filter(Boolean)
          .join(' · '),
    },
    {
      key: 'expiry',
      header: 'Expiry',
      kind: 'date',
      cell: (r) => <DateText value={r.unit.expiryDate} expiry />,
      sortValue: (r) => r.unit.expiryDate,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      kind: 'number',
      cell: (r) => (
        <QuantityStepper
          value={r.quantity}
          min={1}
          max={r.unit.availableQuantity}
          label={`Quantity of ${r.unit.drug.medicationName}`}
          onChange={(quantity) => dispatch(updateQuantity({ unitId: r.unit.unitId, quantity }))}
        />
      ),
      sortValue: (r) => r.quantity,
    },
  ];

  if (isProvider) return null;

  return (
    <div>
      <PageHeader
        title="Cart"
        description="Review and check out your selected medications."
        actions={
          <Button asChild variant="outline">
            <Link href="/checkout">
              <ArrowLeft aria-hidden />
              Back to Check Out
            </Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-md border border-border bg-card">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Search for medications on the Check Out page and add them here."
            action={
              <Button asChild>
                <Link href="/checkout">Browse Medications</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          <DataTable
            rows={items}
            rowKey={(r) => r.unit.unitId}
            columns={columns}
            caption="Units in your cart"
            rowActions={(r) => (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                onClick={() => dispatch(removeFromCart(r.unit.unitId))}
                aria-label={`Remove ${r.unit.drug.medicationName}`}
              >
                <Trash2 aria-hidden />
                Remove
              </Button>
            )}
          />

          <section className="space-y-5 rounded-md border border-border bg-card p-4 sm:p-5">
            <KeyValueList
              columns="inline"
              items={[
                {
                  label: 'Total items',
                  value: <span className="tabular-nums">{items.length}</span>,
                },
                {
                  label: 'Total quantity',
                  value: <span className="tabular-nums">{totalQuantity}</span>,
                },
              ]}
            />
            <div className="space-y-1.5">
              <Label htmlFor="cart-notes" className="text-xs font-medium text-subtle-foreground">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="cart-notes"
                placeholder="Any notes for this checkout"
                value={notes}
                onChange={(e) => dispatch(setCartNotes(e.target.value))}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => dispatch(clearCart())}
                disabled={checkingOut}
                size="touch"
                className="sm:h-9 sm:text-sm"
              >
                Clear Cart
              </Button>
              <Button
                onClick={handleCheckOutAll}
                loading={checkingOut}
                size="touch"
                className="sm:h-9 sm:text-sm"
              >
                Check Out All ({totalQuantity} units)
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
