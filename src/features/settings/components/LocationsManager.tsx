'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { MASS_CLASSIFICATION_GUIDE } from '@daana-health/domain-mass';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  DataTable,
  EntityDrawer,
  FieldRow,
  SelectField,
  TextField,
  type Column,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/hooks/use-async';
import { locationsApi } from '../api';
import { useLocations } from '../hooks';
import { capacityAlertAt, DEFAULT_CAPACITY, FORM_TYPES, type LocationRow } from '../mappers';
import { ActiveText, ConfirmDialog, Notice, SectionHeader } from './shared';

// Spec § "Settings > Location Management" + "Capacity Rule": default 50 units
// per bin, configurable per location; alert at 90%.

const schema = z.object({
  code: z.string().trim().min(1, 'Enter the bin code, e.g. CARDIO1.'),
  specialty: z.string(),
  capacity: z.coerce
    .number({ invalid_type_error: 'Capacity must be a number.' })
    .int('Capacity must be a whole number.')
    .positive('Capacity must be at least 1 unit.'),
  itemType: z.string().min(1, 'Choose an item type.'),
});
type Values = z.infer<typeof schema>;

const SPECIALTY_OPTIONS = MASS_CLASSIFICATION_GUIDE.map((e) => ({
  value: e.class_name,
  label: e.class_name,
}));
const FORM_OPTIONS = FORM_TYPES.map((f) => ({ value: f, label: f }));

export function LocationsManager() {
  const { toast } = useToast();
  const locations = useLocations();
  const [editing, setEditing] = React.useState<LocationRow | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState<LocationRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', specialty: '', capacity: DEFAULT_CAPACITY, itemType: 'Bottle' },
  });
  const capacity = useWatch({ control: form.control, name: 'capacity' });

  const openAdd = () => {
    setEditing(null);
    form.reset({ code: '', specialty: '', capacity: DEFAULT_CAPACITY, itemType: 'Bottle' });
    setFormOpen(true);
  };
  const openEdit = (row: LocationRow) => {
    setEditing(row);
    form.reset({
      code: row.code,
      specialty: row.specialty,
      capacity: row.capacity,
      itemType: row.item_type,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const payload = {
        code: values.code.trim(),
        specialty: values.specialty.trim(),
        capacity: values.capacity,
        item_type: values.itemType,
      };
      const r = editing
        ? await locationsApi.update(editing.locationId, payload)
        : await locationsApi.create(payload);
      if (r.kind === 'pending') {
        toast({
          title: 'Endpoint pending',
          description: 'Location management API is not yet available. Changes were not saved.',
        });
      } else {
        toast({ title: editing ? 'Location updated' : 'Location added' });
        await locations.refetch();
      }
      setFormOpen(false);
    } catch (err) {
      toast({ title: 'Save failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  });

  const deactivate = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      const r = await locationsApi.deactivate(confirming.locationId);
      if (r.kind === 'pending') {
        toast({ title: 'Endpoint pending', description: 'Deactivation API not yet available.' });
      } else {
        toast({ title: 'Location deactivated' });
        await locations.refetch();
      }
      setConfirming(null);
    } catch (err) {
      toast({ title: 'Deactivate failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const rows = React.useMemo(() => {
    const all = locations.data?.rows ?? [];
    return [...all.filter((l) => !l.deactivated_at), ...all.filter((l) => l.deactivated_at)];
  }, [locations.data]);

  const columns: Column<LocationRow>[] = [
    {
      key: 'code',
      header: 'Code',
      kind: 'code',
      primary: true,
      cell: (r) => r.code,
      sortValue: (r) => r.code,
    },
    {
      key: 'specialty',
      header: 'Specialty',
      secondary: true,
      cell: (r) => r.specialty || '—',
      sortValue: (r) => r.specialty,
    },
    {
      key: 'capacity',
      header: 'Capacity',
      kind: 'number',
      cell: (r) => r.capacity,
      sortValue: (r) => r.capacity,
    },
    { key: 'type', header: 'Item type', cell: (r) => r.item_type },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <ActiveText deactivatedAt={r.deactivated_at} />,
    },
  ];

  return (
    <section aria-labelledby="settings-locations" className="flex flex-col gap-4">
      <SectionHeader
        title="Locations"
        description="Bins where medications are physically stored. Default capacity is 50 units per bin."
        actions={
          <Button onClick={openAdd}>
            <Plus aria-hidden /> Add location
          </Button>
        }
      />
      {locations.data?.endpointPending ? (
        <Notice title="Backend endpoint pending">
          GET /inventory/locations isn&apos;t live yet. You can configure bins here once it is
          deployed.
        </Notice>
      ) : null}
      <DataTable
        rows={rows}
        rowKey={(r) => r.locationId}
        columns={columns}
        loading={locations.loading}
        error={locations.error}
        onRetry={locations.refetch}
        caption="Storage locations"
        rowActions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
              Edit
            </Button>
            {!r.deactivated_at ? (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(r)}>
                Deactivate
              </Button>
            ) : null}
          </>
        )}
        empty={{
          title: 'No locations yet',
          description: 'Add your first bin to start checking in medications.',
          action: (
            <Button onClick={openAdd}>
              <Plus aria-hidden /> Add your first location
            </Button>
          ),
        }}
      />

      <EntityDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        desktop="dialog"
        title={editing ? `Edit ${editing.code}` : 'Add location'}
        description={
          editing
            ? 'Update the bin code, specialty, capacity, or item type.'
            : 'Create a new bin. Capacity defaults to 50 units; alerts fire at 90%.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="location-form" loading={busy}>
              {editing ? 'Save changes' : 'Add location'}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form id="location-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <TextField
              control={form.control}
              name="code"
              label="Code"
              placeholder="CARDIO1"
              autoCapitalize="characters"
              autoComplete="off"
            />
            <SelectField
              control={form.control}
              name="specialty"
              label="Specialty"
              optional
              placeholder="Choose specialty"
              options={SPECIALTY_OPTIONS}
            />
            <FieldRow>
              <TextField
                control={form.control}
                name="capacity"
                label="Capacity (units)"
                type="number"
                inputMode="numeric"
                min={1}
                description={`Alert fires at 90% (${capacityAlertAt(Number(capacity) || 0)} units).`}
              />
              <SelectField
                control={form.control}
                name="itemType"
                label="Item type"
                options={FORM_OPTIONS}
              />
            </FieldRow>
          </form>
        </Form>
      </EntityDrawer>

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Deactivate ${confirming?.code ?? ''}?`}
        description="It will be hidden from Check In suggestions. Units already in the bin keep their location."
        confirmLabel="Deactivate"
        onConfirm={deactivate}
        busy={busy}
      />
    </section>
  );
}
