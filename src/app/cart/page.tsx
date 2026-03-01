'use client';

import { Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation, gql } from '@apollo/client';
import { Loader2, ShoppingCart, Trash2, Minus, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';
import { RootState } from '../../store';
import { removeFromCart, updateQuantity, setCartNotes, clearCart } from '../../store/cartSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const BATCH_CHECK_OUT_UNITS = gql`
  mutation BatchCheckOutUnits($items: [BatchCheckOutItemInput!]!, $notes: String) {
    batchCheckOutUnits(items: $items, notes: $notes) {
      transactions {
        transactionId
        timestamp
        quantity
      }
      totalItems
      totalQuantity
    }
  }
`;

function CartContent() {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { items, notes } = useSelector((state: RootState) => state.cart);

  const [batchCheckOut, { loading: batchCheckingOut }] = useMutation(BATCH_CHECK_OUT_UNITS, {
    onCompleted: (data) => {
      const result = data.batchCheckOutUnits;
      toast({
        title: 'Success',
        description: `Checked out ${result.totalItems} item(s), ${result.totalQuantity} total units`,
      });
      dispatch(clearCart());
    },
    onError: (error) => {
      toast({
        title: 'Checkout Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckOutAll = () => {
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Cart is empty',
        variant: 'destructive',
      });
      return;
    }

    const batchItems = items.map((item) => ({
      unitId: item.unit.unitId,
      quantity: item.quantity,
    }));

    batchCheckOut({
      variables: {
        items: batchItems,
        notes: notes || undefined,
      },
    });
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Cart</h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Review and check out your selected medications
            </p>
          </div>
          <Link href="/checkout">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="pt-6">
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-xl font-semibold mb-2">Your cart is empty</p>
                <p className="text-sm mb-6">Search for medications and add them to your cart</p>
                <Link href="/checkout">
                  <Button>Browse Medications</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="animate-fade-in">
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead className="hidden sm:table-cell">Strength / Form</TableHead>
                        <TableHead className="hidden md:table-cell">Expiry</TableHead>
                        <TableHead className="w-[140px]">Quantity</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.unit.unitId}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold">{item.unit.drug.medicationName}</p>
                              {item.unit.drug.genericName && (
                                <p className="text-xs text-muted-foreground">{item.unit.drug.genericName}</p>
                              )}
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {item.unit.drug.strength} {item.unit.drug.strengthUnit} &bull; {item.unit.drug.form}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">
                              {item.unit.drug.strength} {item.unit.drug.strengthUnit}
                            </Badge>
                            <span className="ml-2 text-sm text-muted-foreground">{item.unit.drug.form}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant={new Date(item.unit.expiryDate) < new Date() ? 'destructive' : 'secondary'}
                            >
                              {new Date(item.unit.expiryDate).toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  dispatch(updateQuantity({ unitId: item.unit.unitId, quantity: item.quantity - 1 }))
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                max={item.unit.availableQuantity}
                                value={item.quantity}
                                onChange={(e) =>
                                  dispatch(
                                    updateQuantity({
                                      unitId: item.unit.unitId,
                                      quantity: parseInt(e.target.value) || 1,
                                    })
                                  )
                                }
                                className="h-8 w-16 text-center"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  dispatch(updateQuantity({ unitId: item.unit.unitId, quantity: item.quantity + 1 }))
                                }
                                disabled={item.quantity >= item.unit.availableQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => dispatch(removeFromCart(item.unit.unitId))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items: <span className="font-semibold text-foreground">{totalItems}</span></p>
                    <p className="text-sm text-muted-foreground">Total Quantity: <span className="font-semibold text-foreground">{totalQuantity}</span></p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label htmlFor="cart-notes" className="text-base font-semibold">Notes (Optional)</Label>
                  <Textarea
                    id="cart-notes"
                    placeholder="Any notes for this checkout"
                    value={notes}
                    onChange={(e) => dispatch(setCartNotes(e.target.value))}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleCheckOutAll}
                    disabled={batchCheckingOut}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    {batchCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Check Out All ({totalQuantity} units)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => dispatch(clearCart())}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Clear Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CartContent />
    </Suspense>
  );
}
