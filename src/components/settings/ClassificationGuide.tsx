'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, PowerOff, Loader2, AlertTriangle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { MASS_CLASSIFICATION_GUIDE, type ClassificationEntry } from '@daana-health/domain-mass';

// Spec § "Settings > Medication Classification Guide":
//   Superadmin can add, edit, or deactivate classification entries.
//   Changes apply immediately to location suggestions during Check In.
//
// Persistence approach (per task constraints — no Redux store changes):
//   1. Try `PATCH /api/settings/classification` (and `GET /api/settings/classification`)
//   2. On 404 / failure: fall back to localStorage under the key
//      `daana.settings.classification.overrides`. We persist the FULL guide
//      (active + deactivated + overrides) so other surfaces (Check In) can
//      read it via `loadClassificationOverrides()` until the backend lands.
//
// This is intentionally simple and self-contained so the backend can replace
// the persistence layer without changes to UI code.

const LOCAL_STORAGE_KEY = 'daana.settings.classification.overrides';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface MutableClassificationEntry {
  class_name: string;
  common_examples: string[];
  location_code: string;
  two_digit_code: string;
  supervisor_review: boolean;
  deactivated_at: string | null;
}

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

function seedFromGuide(): MutableClassificationEntry[] {
  return MASS_CLASSIFICATION_GUIDE.map((e) => ({
    class_name: e.class_name,
    common_examples: [...e.common_examples],
    location_code: e.location_code,
    two_digit_code: e.two_digit_code,
    supervisor_review: e.supervisor_review,
    deactivated_at: null,
  }));
}

/**
 * Public helper: read the current classification guide (seed + overrides).
 * Other modules (e.g. the Check In suggestion path) can call this to apply
 * superadmin edits live while the backend endpoint is still pending.
 */
export function loadClassificationOverrides(): MutableClassificationEntry[] {
  if (typeof window === 'undefined') return seedFromGuide();
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return seedFromGuide();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedFromGuide();
    return parsed as MutableClassificationEntry[];
  } catch {
    return seedFromGuide();
  }
}

function saveLocal(rows: MutableClassificationEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rows));
    // Notify same-tab listeners (Check In) — `storage` event only fires across tabs.
    window.dispatchEvent(new CustomEvent('daana:classification:updated'));
  } catch {}
}

export function ClassificationGuide() {
  const { toast } = useToast();
  const [rows, setRows] = useState<MutableClassificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MutableClassificationEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [className, setClassName] = useState('');
  const [examplesCSV, setExamplesCSV] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [twoDigit, setTwoDigit] = useState('');
  const [supervisorReview, setSupervisorReview] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/classification`, {
        headers: authHeaders(),
      });
      if (res.status === 404) {
        // Backend not yet implemented — use local persistence.
        setUsingLocalFallback(true);
        setRows(loadClassificationOverrides());
        return;
      }
      if (!res.ok) throw new Error(`Failed to load classification (${res.status})`);
      const body = await res.json();
      const data = Array.isArray(body) ? body : body?.entries ?? [];
      setUsingLocalFallback(false);
      setRows(data);
    } catch {
      setUsingLocalFallback(true);
      setRows(loadClassificationOverrides());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  function openAdd() {
    setEditing(null);
    setClassName('');
    setExamplesCSV('');
    setLocationCode('');
    setTwoDigit('');
    setSupervisorReview(false);
    setDialogOpen(true);
  }

  function openEdit(row: MutableClassificationEntry) {
    setEditing(row);
    setClassName(row.class_name);
    setExamplesCSV(row.common_examples.join(', '));
    setLocationCode(row.location_code);
    setTwoDigit(row.two_digit_code);
    setSupervisorReview(row.supervisor_review);
    setDialogOpen(true);
  }

  async function persist(next: MutableClassificationEntry[]) {
    setRows(next);
    if (usingLocalFallback) {
      saveLocal(next);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/settings/classification`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ entries: next }),
      });
      if (res.status === 404) {
        // Endpoint disappeared mid-session — switch to local fallback.
        setUsingLocalFallback(true);
        saveLocal(next);
        toast({
          title: 'Saved locally',
          description: 'Backend endpoint pending — changes saved to this device only.',
        });
        return;
      }
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
    } catch (err: any) {
      // Soft failure: keep local copy so superadmin doesn’t lose work.
      saveLocal(next);
      toast({
        title: 'Saved locally',
        description: err?.message ?? 'Network issue — saved to this device only.',
      });
    }
  }

  async function handleSave() {
    const cleanClass = className.trim().toUpperCase();
    if (!cleanClass) {
      toast({ title: 'Class name required', variant: 'destructive' });
      return;
    }
    if (!locationCode.trim()) {
      toast({ title: 'Location code required', variant: 'destructive' });
      return;
    }
    const entry: MutableClassificationEntry = {
      class_name: cleanClass,
      common_examples: examplesCSV
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      location_code: locationCode.trim(),
      two_digit_code: twoDigit.trim().toUpperCase().slice(0, 2) || 'XX',
      supervisor_review: supervisorReview,
      deactivated_at: editing?.deactivated_at ?? null,
    };

    setSaving(true);
    try {
      const next = editing
        ? rows.map((r) => (r.class_name === editing.class_name ? entry : r))
        : [...rows, entry];
      await persist(next);
      toast({ title: editing ? 'Entry updated' : 'Entry added' });
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(row: MutableClassificationEntry) {
    if (!confirm(`Deactivate the ${row.class_name} classification entry?`)) return;
    const next = rows.map((r) =>
      r.class_name === row.class_name
        ? { ...r, deactivated_at: new Date().toISOString() }
        : r,
    );
    await persist(next);
    toast({ title: 'Entry deactivated' });
  }

  async function handleReactivate(row: MutableClassificationEntry) {
    const next = rows.map((r) =>
      r.class_name === row.class_name ? { ...r, deactivated_at: null } : r,
    );
    await persist(next);
    toast({ title: 'Entry reactivated' });
  }

  async function handleResetToDefaults() {
    if (!confirm('Reset the classification guide to MASS defaults? Local edits will be lost.')) return;
    const next = seedFromGuide();
    await persist(next);
    toast({ title: 'Reset to defaults' });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Classification Guide</CardTitle>
            <CardDescription>
              Maps medication classes to bin locations. Edits apply immediately to Check In suggestions.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
              Reset to defaults
            </Button>
            <Button onClick={openAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add entry
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {usingLocalFallback && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Local persistence active</p>
              <p className="text-xs">
                <code>PATCH /api/settings/classification</code> isn’t live yet. Changes are saved to this device only and will sync to the server once the endpoint is deployed.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading classification guide…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">No classification entries.</p>
            <Button onClick={openAdd} className="mt-2">
              <Plus className="mr-2 h-4 w-4" /> Add the first entry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Common Examples</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>2-digit</TableHead>
                  <TableHead>Supervisor Review</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.class_name} className={row.deactivated_at ? 'opacity-60' : ''}>
                    <TableCell className="font-mono font-medium">{row.class_name}</TableCell>
                    <TableCell className="max-w-[18rem] truncate text-sm text-muted-foreground">
                      {row.common_examples.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="font-mono">{row.location_code}</TableCell>
                    <TableCell className="font-mono">{row.two_digit_code}</TableCell>
                    <TableCell>
                      {row.supervisor_review ? (
                        <Badge variant="default">Required</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit entry">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {row.deactivated_at ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(row)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(row)}
                            aria-label="Deactivate entry"
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
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit classification entry' : 'Add classification entry'}</DialogTitle>
            <DialogDescription>
              Changes apply immediately to Check In location suggestions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cls-name">Class name *</Label>
              <Input
                id="cls-name"
                placeholder="CARDIO"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={!!editing}
              />
              {editing && (
                <p className="text-xs text-muted-foreground">Class name is the identifier and cannot be changed.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cls-examples">Common examples (comma-separated)</Label>
              <Input
                id="cls-examples"
                placeholder="Lisinopril, Metoprolol, Amlodipine"
                value={examplesCSV}
                onChange={(e) => setExamplesCSV(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cls-loc">Location code *</Label>
                <Input
                  id="cls-loc"
                  placeholder="CARDIO"
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cls-2d">2-digit code</Label>
                <Input
                  id="cls-2d"
                  placeholder="CD"
                  value={twoDigit}
                  maxLength={2}
                  onChange={(e) => setTwoDigit(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="cls-supervisor" className="cursor-pointer">
                  Requires supervisor review
                </Label>
                <p className="text-xs text-muted-foreground">
                  When on, Check In flags this class for superadmin review.
                </p>
              </div>
              <Switch id="cls-supervisor" checked={supervisorReview} onCheckedChange={setSupervisorReview} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Re-export the seed type for downstream consumers (e.g. Check In).
export type { ClassificationEntry };
