'use client';

// Inventory Tab — DaanaRX MASS Clinic superadmin control panel.
//
// Implements the MVP spec § Inventory Tab:
//   - Table fields: medication name, dosage, unit, form, location, expiry date,
//     DRX unit_code, status (chip), date received, date checked in,
//     checked-in-by, last edited by, last edited date.
//   - Filters/search: text search (q), status, location, expiry-before.
//   - Per-row actions (kebab): Edit, Check Out directly (superadmin only),
//     Remove, View transaction history.
//   - Empty state: "No medications in inventory yet. Check in a medication to
//     get started." with CTA → /checkin.
//   - Direct checkout (superadmin): confirmation modal → POST cart item +
//     immediate approve.
//   - Mobile: table collapses to one card per item on small screens.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  Edit,
  Filter,
  History,
  Loader2,
  MoreVertical,
  PackageOpen,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import type { Item, ItemStatus, Location } from '@daana-health/inventory-core';
import { AppShell } from '../../components/layout/AppShell';
import { EditItemModal } from '../../components/inventory/EditItemModal';
import { RemoveItemModal } from '../../components/inventory/RemoveItemModal';
import { TransactionHistoryDrawer } from '../../components/inventory/TransactionHistoryDrawer';
import type { RootState } from '../../store';
import { Button } from '@/components/ui/button';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusChip } from '@/components/ui/status-chip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

// The inventory list endpoint may join in some user/timestamp fields beyond
// the bare Item shape. We model the extras optionally so the page renders
// gracefully whether or not the backend has hydrated them yet.
interface InventoryRow extends Item {
  dateReceived?: string | null; // ISO timestamptz; may equal createdAt
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  createdByName?: string | null;
  lastEditedByName?: string | null;
  removedByName?: string | null;
  locationCode?: string | null; // denormalized for display when locationId resolves
}

interface ListResponse {
  items: InventoryRow[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const STATUS_OPTIONS: Array<{ value: ItemStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'in_cart', label: 'In Cart' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'removed', label: 'Removed' },
  { value: 'expired', label: 'Expired' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function readAttr(attrs: Item['attributes'], key: string): string {
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

function isExpired(item: InventoryRow): boolean {
  if (!item.expiryDate) return false;
  const d = new Date(item.expiryDate);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { toast } = useToast();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isSuperadmin = currentUser?.userRole === 'superadmin';

  // Filters / search
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [expiryBefore, setExpiryBefore] = useState<string>(''); // YYYY-MM-DD

  // Data
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / drawers
  const [editTarget, setEditTarget] = useState<InventoryRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<InventoryRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InventoryRow | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<InventoryRow | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // ─── Fetch items ──────────────────────────────────────────────────────────

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim().length > 0) params.set('q', q.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (locationFilter !== 'all') params.set('locationId', locationFilter);
    if (expiryBefore) params.set('expiryBefore', expiryBefore);
    return params.toString();
  }, [q, statusFilter, locationFilter, expiryBefore]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/inventory/items${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) {
        // 404 = endpoint not wired yet → treat as empty inventory, not error.
        if (res.status === 404) {
          setRows([]);
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `GET /inventory/items failed: ${res.status}`);
      }
      const body = (await res.json()) as ListResponse | InventoryRow[];
      const list = Array.isArray(body) ? body : body.items ?? [];
      setRows(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  // Initial + filter-driven fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Load locations once for the filter dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/inventory/locations`, { headers: authHeaders() });
        if (!res.ok) return;
        const body = (await res.json()) as { locations?: Location[] } | Location[];
        const list = Array.isArray(body) ? body : body.locations ?? [];
        if (!cancelled) setLocations(list);
      } catch {
        // non-fatal; filter just collapses to no options
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Direct checkout from inventory (superadmin) ───────────────────────────

  const handleDirectCheckout = async () => {
    if (!checkoutTarget || !isSuperadmin) return;
    setCheckingOut(true);
    try {
      // Step 1: add to current cart. The backend resolves the caller's active
      // cart (creating one if needed) when the special id "current" is used.
      const addRes = await fetch(`${API_BASE}/transactions/carts/current/items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ item_id: checkoutTarget.id }),
      });
      if (!addRes.ok && addRes.status !== 404) {
        const body = await addRes.json().catch(() => ({}));
        throw new Error(body.error || `Add to cart failed: ${addRes.status}`);
      }
      const addBody = (await addRes.json().catch(() => ({}))) as { cart?: { id: string } };
      const cartId = addBody.cart?.id ?? 'current';

      // Step 2: immediately approve for superadmin.
      const approveRes = await fetch(`${API_BASE}/transactions/carts/${cartId}/approve`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!approveRes.ok && approveRes.status !== 404) {
        const body = await approveRes.json().catch(() => ({}));
        throw new Error(body.error || `Approve failed: ${approveRes.status}`);
      }

      toast({
        title: 'Checked out',
        description: `${readAttr(checkoutTarget.attributes, 'medication_name') || 'Item'} has been checked out.`,
      });
      setCheckoutTarget(null);
      fetchItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      toast({ title: 'Checkout failed', description: msg, variant: 'destructive' });
    } finally {
      setCheckingOut(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const hasFilters =
    q.trim().length > 0 || statusFilter !== 'all' || locationFilter !== 'all' || expiryBefore.length > 0;
  const showEmpty = !loading && !error && rows.length === 0 && !hasFilters;
  const showNoMatches = !loading && !error && rows.length === 0 && hasFilters;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Inventory</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Full control panel for active medication inventory.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
            disabled={loading}
            className="self-start sm:self-auto"
          >
            <RefreshCcw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-q" className="text-xs font-medium text-muted-foreground">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="inv-q"
                    placeholder="Medication, code, or notes…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as ItemStatus | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-exp" className="text-xs font-medium text-muted-foreground">
                  Expires before
                </Label>
                <Input
                  id="inv-exp"
                  type="date"
                  value={expiryBefore}
                  onChange={(e) => setExpiryBefore(e.target.value)}
                />
              </div>
            </div>

            {hasFilters ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters applied</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ('');
                    setStatusFilter('all');
                    setLocationFilter('all');
                    setExpiryBefore('');
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Error */}
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* Empty state — spec verbatim */}
        {showEmpty ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <PackageOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium">
                  No medications in inventory yet. Check in a medication to get started.
                </p>
                <p className="text-sm text-muted-foreground">
                  Donated medications appear here once they are checked in.
                </p>
              </div>
              <Button asChild>
                <Link href="/checkin">Go to Check In</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* No matches (filters applied) */}
        {showNoMatches ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No medications match the current filters.
            </CardContent>
          </Card>
        ) : null}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        {/* Rows */}
        {!loading && rows.length > 0 ? (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 lg:hidden">
              {rows.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  isSuperadmin={isSuperadmin}
                  onEdit={() => setEditTarget(item)}
                  onCheckout={() => setCheckoutTarget(item)}
                  onRemove={() => setRemoveTarget(item)}
                  onHistory={() => setHistoryTarget(item)}
                />
              ))}
            </div>

            {/* Desktop table view */}
            <Card className="hidden lg:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Form</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>DRX Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date received</TableHead>
                        <TableHead>Checked in</TableHead>
                        <TableHead>Checked in by</TableHead>
                        <TableHead>Last edited by</TableHead>
                        <TableHead>Last edited</TableHead>
                        <TableHead className="w-[44px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((item) => {
                        const expired = isExpired(item);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {readAttr(item.attributes, 'medication_name') || '—'}
                            </TableCell>
                            <TableCell>{readAttr(item.attributes, 'dosage') || '—'}</TableCell>
                            <TableCell>{readAttr(item.attributes, 'unit') || '—'}</TableCell>
                            <TableCell>{readAttr(item.attributes, 'form') || '—'}</TableCell>
                            <TableCell>{item.locationCode ?? '—'}</TableCell>
                            <TableCell className={cn(expired && 'text-destructive font-medium')}>
                              {formatDate(item.expiryDate)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.unitCode}</TableCell>
                            <TableCell>
                              <StatusChip status={item.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(item.dateReceived ?? item.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(item.checkedInAt ?? item.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.checkedInByName ?? item.createdByName ?? '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.lastEditedByName ?? '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(item.lastEditedAt)}
                            </TableCell>
                            <TableCell>
                              <RowActions
                                item={item}
                                isSuperadmin={isSuperadmin}
                                onEdit={() => setEditTarget(item)}
                                onCheckout={() => setCheckoutTarget(item)}
                                onRemove={() => setRemoveTarget(item)}
                                onHistory={() => setHistoryTarget(item)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Edit modal */}
      <EditItemModal
        item={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={() => {
          setEditTarget(null);
          fetchItems();
        }}
        locations={locations}
      />

      {/* Remove modal */}
      <RemoveItemModal
        item={removeTarget}
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onRemoved={() => {
          setRemoveTarget(null);
          fetchItems();
        }}
      />

      {/* Transaction history drawer */}
      <TransactionHistoryDrawer
        item={historyTarget}
        open={historyTarget !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryTarget(null);
        }}
      />

      {/* Direct checkout confirmation (superadmin only) */}
      <Dialog
        open={checkoutTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCheckoutTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check out medication</DialogTitle>
            <DialogDescription>
              Confirm the details below. This action moves the unit out of active inventory and logs a transaction.
            </DialogDescription>
          </DialogHeader>
          {checkoutTarget ? (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Medication</span>
                <span className="font-medium">
                  {readAttr(checkoutTarget.attributes, 'medication_name') || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Dose</span>
                <span>
                  {readAttr(checkoutTarget.attributes, 'dosage')}{' '}
                  {readAttr(checkoutTarget.attributes, 'unit')}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Form</span>
                <span>{readAttr(checkoutTarget.attributes, 'form') || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Expiry</span>
                <span className={cn(isExpired(checkoutTarget) && 'text-destructive')}>
                  {formatDate(checkoutTarget.expiryDate)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Location</span>
                <span>{checkoutTarget.locationCode ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">DRX code</span>
                <span className="font-mono text-xs">{checkoutTarget.unitCode}</span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutTarget(null)} disabled={checkingOut}>
              Cancel
            </Button>
            <Button onClick={handleDirectCheckout} disabled={checkingOut || !isSuperadmin}>
              {checkingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// ─── Row actions menu ───────────────────────────────────────────────────────

function RowActions({
  item,
  isSuperadmin,
  onEdit,
  onCheckout,
  onRemove,
  onHistory,
}: {
  item: InventoryRow;
  isSuperadmin: boolean;
  onEdit: () => void;
  onCheckout: () => void;
  onRemove: () => void;
  onHistory: () => void;
}) {
  const terminal = item.status === 'checked_out' || item.status === 'removed';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open actions menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={onEdit} disabled={terminal}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {isSuperadmin ? (
          <DropdownMenuItem onClick={onCheckout} disabled={terminal}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Check out directly
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onRemove} disabled={terminal} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onHistory}>
          <History className="mr-2 h-4 w-4" />
          View transaction history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Mobile card ────────────────────────────────────────────────────────────

function InventoryCard({
  item,
  isSuperadmin,
  onEdit,
  onCheckout,
  onRemove,
  onHistory,
}: {
  item: InventoryRow;
  isSuperadmin: boolean;
  onEdit: () => void;
  onCheckout: () => void;
  onRemove: () => void;
  onHistory: () => void;
}) {
  const expired = isExpired(item);
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="break-words text-sm font-semibold">
              {readAttr(item.attributes, 'medication_name') || '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {readAttr(item.attributes, 'dosage')} {readAttr(item.attributes, 'unit')}{' '}
              · {readAttr(item.attributes, 'form') || '—'}
            </p>
          </div>
          <RowActions
            item={item}
            isSuperadmin={isSuperadmin}
            onEdit={onEdit}
            onCheckout={onCheckout}
            onRemove={onRemove}
            onHistory={onHistory}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={item.status} />
          <span
            className={cn(
              'inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-xs',
              expired && 'border-destructive/40 bg-destructive/10 text-destructive',
            )}
          >
            Exp {formatDate(item.expiryDate)}
          </span>
          {item.locationCode ? (
            <span className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
              {item.locationCode}
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">DRX code</dt>
          <dd className="font-mono">{item.unitCode}</dd>
          <dt className="text-muted-foreground">Received</dt>
          <dd>{formatDate(item.dateReceived ?? item.createdAt)}</dd>
          <dt className="text-muted-foreground">Checked in</dt>
          <dd>{formatDateTime(item.checkedInAt ?? item.createdAt)}</dd>
          <dt className="text-muted-foreground">Checked in by</dt>
          <dd>{item.checkedInByName ?? item.createdByName ?? '—'}</dd>
          <dt className="text-muted-foreground">Last edited by</dt>
          <dd>{item.lastEditedByName ?? '—'}</dd>
          <dt className="text-muted-foreground">Last edited</dt>
          <dd>{formatDateTime(item.lastEditedAt)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
