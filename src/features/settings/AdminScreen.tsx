'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DataTable,
  DateText,
  EntityDrawer,
  PageHeader,
  SelectField,
  TextField,
  type Column,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { useAsync, errorMessage } from '@/hooks/use-async';
import type { LocationData } from '@/types/api';
import { adminApi } from './api';
import { legacyTempLabel, legacyTempToForm } from './mappers';
import { ConfirmDialog, SectionHeader } from './components/shared';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a location name.'),
  temp: z.enum(['room_temp', 'fridge']),
});
type Values = z.infer<typeof schema>;
const TEMP_OPTIONS = [
  { value: 'room_temp', label: 'Room temperature' },
  { value: 'fridge', label: 'Refrigerated (fridge)' },
];

/** /admin — legacy clinic flags + name/temperature locations (pre-bin schema). */
export function AdminScreen() {
  const { toast } = useToast();
  const loadLocations = React.useCallback(
    () => adminApi.listLocations() as Promise<LocationData[]>,
    []
  );
  const locations = useAsync(loadLocations);
  const [requireLotLocation, setRequireLotLocation] = React.useState(false);
  const [updatingClinic, setUpdatingClinic] = React.useState(false);
  const [editing, setEditing] = React.useState<LocationData | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<LocationData | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    adminApi
      .getClinic()
      .then((clinic) => {
        if (!cancelled && clinic?.requireLotLocation !== undefined)
          setRequireLotLocation(!!clinic.requireLotLocation);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', temp: 'room_temp' },
  });

  const onToggle = async (checked: boolean) => {
    setRequireLotLocation(checked);
    setUpdatingClinic(true);
    try {
      await adminApi.updateClinic({ requireLotLocation: checked });
      toast({ title: 'Clinic settings updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setUpdatingClinic(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', temp: 'room_temp' });
    setFormOpen(true);
  };
  const openEdit = (l: LocationData) => {
    setEditing(l);
    form.reset({ name: l.name, temp: legacyTempToForm(l.temp) });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      if (editing) await adminApi.updateLocation(editing.locationId, values.name, values.temp);
      else await adminApi.createLocation(values.name, values.temp);
      toast({ title: editing ? 'Location updated' : 'Location created' });
      setFormOpen(false);
      await locations.refetch();
    } catch (err) {
      toast({ title: 'Save failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  });

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminApi.deleteLocation(deleting.locationId);
      toast({ title: 'Location deleted' });
      setDeleting(null);
      await locations.refetch();
    } catch (err) {
      toast({ title: 'Delete failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<LocationData>[] = [
    { key: 'name', header: 'Name', primary: true, cell: (l) => l.name, sortValue: (l) => l.name },
    { key: 'temp', header: 'Temperature', secondary: true, cell: (l) => legacyTempLabel(l.temp) },
    {
      key: 'created',
      header: 'Created',
      kind: 'date',
      cell: (l) => <DateText value={l.createdAt} />,
      sortValue: (l) => l.createdAt,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Admin"
        description="Legacy clinic settings and storage locations."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden /> Create location
          </Button>
        }
      />
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionHeader title="Clinic settings" />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div>
              <Label htmlFor="require-lot-location" className="text-sm font-medium">
                Require Location (L/R) for lot codes
              </Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                When enabled, users must specify Left (L) or Right (R) when creating new lots.
              </p>
            </div>
            <Switch
              id="require-lot-location"
              checked={requireLotLocation}
              onCheckedChange={onToggle}
              disabled={updatingClinic}
            />
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <SectionHeader title="Locations" />
          <DataTable
            rows={locations.data ?? []}
            rowKey={(l) => l.locationId}
            columns={columns}
            loading={locations.loading}
            error={locations.error}
            onRetry={locations.refetch}
            caption="Storage locations"
            rowActions={(l) => (
              <>
                <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(l)}>
                  Delete
                </Button>
              </>
            )}
            empty={{ title: 'No locations yet', description: 'Create the first storage location.' }}
          />
        </section>
      </div>

      <EntityDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        desktop="dialog"
        title={editing ? 'Edit location' : 'Create location'}
        description={
          editing ? 'Update the location details.' : 'Add a new storage location for medications.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="admin-location-form" loading={busy}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id="admin-location-form"
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <TextField
              control={form.control}
              name="name"
              label="Location name"
              placeholder="e.g. Main refrigerator"
            />
            <SelectField
              control={form.control}
              name="temp"
              label="Temperature"
              options={TEMP_OPTIONS}
            />
          </form>
        </Form>
      </EntityDrawer>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'location'}?`}
        description="This removes the location record. Units referencing it keep their history."
        confirmLabel="Delete"
        onConfirm={onDelete}
        busy={busy}
      />
    </AppShell>
  );
}
