'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, PowerOff, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { MASS_CLASSIFICATION_GUIDE } from '@daana-health/domain-mass';

// Spec § "Settings > Location Management" + "Capacity Rule":
// Default bin capacity is 50 units per bin. Superadmin can configure per
// location. Item type is a free-form field per the Check In flow's "Form"
// (Bottle, Card, Other) but applied here at the location level since the
// "settings" pattern in the spec mentions item_type as a per-bin field.

interface LocationRow {
  locationId: string;
  code: string;
  specialty: string;
  capacity: number;
  item_type: string;
  deactivated_at: string | null;
  // Tolerated alternate keys from the existing inventory.locations API.
  name?: string;
}

const DEFAULT_CAPACITY = 50;

const FORM_TYPES = [
  'Bottle',
  'Card',
  'Cream',
  'Nasal Spray',
  'Insulin Pen',
  'Injection',
  'Other',
];

// API base picks up the same NEXT_PUBLIC_API_URL as src/lib/apiClient.ts.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) h['Authorization'] = `Bearer ${token}`;
      const clinic = localStorage.getItem('clinic');
      if (clinic) {
        const parsed = JSON.parse(clinic);
        if (parsed?.clinicId) h['x-clinic-id'] = parsed.clinicId;
      }
    } catch {}
  }
  return h;
}

// Normalise the raw API row into a `LocationRow`. The /api/locations endpoint
// may not exist yet (404); when present its exact shape may evolve. We accept
// a few aliases so this UI does not break the moment backend lands.
function normaliseLocation(raw: any): LocationRow {
  return {
    locationId: raw.locationId || raw.id || raw.code,
    code: raw.code || raw.name || raw.locationCode || '',
    specialty: raw.specialty || raw.specialty_class || raw.class_name || '',
    capacity: typeof raw.capacity === 'number' ? raw.capacity : (raw.maxCapacity ?? DEFAULT_CAPACITY),
    item_type: raw.item_type || raw.itemType || raw.temp || 'Other',
    deactivated_at: raw.deactivated_at || raw.deactivatedAt || null,
    name: raw.name,
  };
}

export function LocationsManager() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [endpointPending, setEndpointPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for the Add/Edit modal.
  const [code, setCode] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [capacity, setCapacity] = useState<number>(DEFAULT_CAPACITY);
  const [itemType, setItemType] = useState<string>('Bottle');

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/inventory/locations`, { headers: authHeaders() });
      if (res.status === 404) {
        setEndpointPending(true);
        setLocations([]);
        return;
      }
      if (!res.ok) throw new Error(`Failed to load locations (${res.status})`);
      const body = await res.json();
      const rows = Array.isArray(body) ? body : body?.locations ?? [];
      setLocations(rows.map(normaliseLocation));
      setEndpointPending(false);
    } catch (err: any) {
      // Network error or unexpected — flag the endpoint as pending rather than
      // surfacing a destructive error toast that blocks superadmin from seeing
      // the panel at all.
      setEndpointPending(true);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  function openAdd() {
    setEditing(null);
    setCode('');
    setSpecialty('');
    setCapacity(DEFAULT_CAPACITY);
    setItemType('Bottle');
    setDialogOpen(true);
  }

  function openEdit(row: LocationRow) {
    setEditing(row);
    setCode(row.code);
    setSpecialty(row.specialty);
    setCapacity(row.capacity);
    setItemType(row.item_type);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!code.trim()) {
      toast({ title: 'Code required', description: 'Location code is required.', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      toast({ title: 'Invalid capacity', description: 'Capacity must be a positive number.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        specialty: specialty.trim(),
        capacity,
        item_type: itemType,
      };
      const url = editing
        ? `${API_URL}/inventory/locations/${editing.locationId}`
        : `${API_URL}/inventory/locations`;
      // Backend exposes PUT for update, POST for create (no PATCH route).
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 404) {
        toast({
          title: 'Endpoint pending',
          description: 'Location management API is not yet available. Changes were not saved.',
        });
        setEndpointPending(true);
      } else if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      } else {
        toast({ title: editing ? 'Location updated' : 'Location added' });
        await refetch();
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(row: LocationRow) {
    if (!confirm(`Deactivate ${row.code}? It will be hidden from intake suggestions.`)) return;
    try {
      // Backend soft-deactivates via DELETE /locations/:id (sets deactivated_at server-side).
      const res = await fetch(`${API_URL}/inventory/locations/${row.locationId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 404) {
        toast({ title: 'Endpoint pending', description: 'Deactivation API not yet available.' });
        return;
      }
      if (!res.ok) throw new Error(`Deactivate failed (${res.status})`);
      toast({ title: 'Location deactivated' });
      await refetch();
    } catch (err: any) {
      toast({ title: 'Deactivate failed', description: err?.message ?? 'Unknown', variant: 'destructive' });
    }
  }

  const active = locations.filter((l) => !l.deactivated_at);
  const inactive = locations.filter((l) => l.deactivated_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Locations</CardTitle>
            <CardDescription>
              Bins where medications are physically stored. Default capacity is 50 units per bin.
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {endpointPending && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Backend endpoint pending</p>
              <p className="text-xs">
                <code>GET /api/locations</code> isn’t live yet. You can still configure values here once it’s deployed.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading locations…
          </div>
        ) : active.length === 0 && inactive.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">No locations configured yet.</p>
            <p className="text-sm text-muted-foreground">
              Add your first bin to start checking in medications.
            </p>
            <Button onClick={openAdd} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Add your first location
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Item Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...active, ...inactive].map((row) => (
                  <TableRow key={row.locationId} className={row.deactivated_at ? 'opacity-60' : ''}>
                    <TableCell className="font-mono font-medium">{row.code}</TableCell>
                    <TableCell>{row.specialty || '—'}</TableCell>
                    <TableCell>{row.capacity}</TableCell>
                    <TableCell>{row.item_type}</TableCell>
                    <TableCell>
                      {row.deactivated_at ? (
                        <Badge variant="secondary">Deactivated</Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label={`Edit ${row.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!row.deactivated_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(row)}
                            aria-label={`Deactivate ${row.code}`}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit location' : 'Add location'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the bin code, specialty, capacity, or item type.'
                : 'Create a new bin. The capacity defaults to 50 units; alerts fire at 90%.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loc-code">Code *</Label>
              <Input
                id="loc-code"
                placeholder="CARDIO1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-specialty">Specialty</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger id="loc-specialty">
                  <SelectValue placeholder="Choose specialty" />
                </SelectTrigger>
                <SelectContent>
                  {MASS_CLASSIFICATION_GUIDE.map((entry) => (
                    <SelectItem key={entry.class_name} value={entry.class_name}>
                      {entry.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-capacity">Capacity (units)</Label>
              <Input
                id="loc-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Alert fires at 90% of capacity ({Math.floor(capacity * 0.9)} units).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-item-type">Item Type</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger id="loc-item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
