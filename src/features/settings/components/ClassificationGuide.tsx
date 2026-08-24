'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { DataTable, EntityDrawer, FieldRow, TextField, type Column } from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { useClassification } from '../hooks';
import {
  classificationFromForm,
  classificationToForm,
  seedFromGuide,
  type ClassificationFormValues,
  type MutableClassificationEntry,
} from '../mappers';
import { ActiveText, ConfirmDialog, Notice, SectionHeader } from './shared';

// Spec § "Settings > Medication Classification Guide": superadmin can add, edit,
// or deactivate entries; changes apply immediately to Check In suggestions.

const schema = z.object({
  className: z.string().trim().min(1, 'Enter the class name, e.g. CARDIO.'),
  examples: z.string(),
  locationCode: z.string().trim().min(1, 'Enter the location code this class maps to.'),
  twoDigit: z.string().trim().max(2, 'Two characters at most.'),
  supervisorReview: z.boolean(),
});

const EMPTY: ClassificationFormValues = {
  className: '',
  examples: '',
  locationCode: '',
  twoDigit: '',
  supervisorReview: false,
};

export function ClassificationGuide() {
  const { toast } = useToast();
  const guide = useClassification();
  const [editing, setEditing] = React.useState<MutableClassificationEntry | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState<
    { kind: 'deactivate'; row: MutableClassificationEntry } | { kind: 'reset' } | null
  >(null);
  const [busy, setBusy] = React.useState(false);

  const form = useForm<ClassificationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const openAdd = () => {
    setEditing(null);
    form.reset(EMPTY);
    setFormOpen(true);
  };
  const openEdit = (row: MutableClassificationEntry) => {
    setEditing(row);
    form.reset(classificationToForm(row));
    setFormOpen(true);
  };

  const savedToast = (where: 'server' | 'local' | 'local-error', title: string) => {
    if (where === 'server') toast({ title });
    else
      toast({
        title: 'Saved locally',
        description:
          where === 'local'
            ? 'Backend endpoint pending — changes saved to this device only.'
            : 'Network issue — saved to this device only.',
      });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const entry = classificationFromForm(values, editing);
      const next = editing
        ? guide.rows.map((r) => (r.class_name === editing.class_name ? entry : r))
        : [...guide.rows, entry];
      savedToast(await guide.persist(next), editing ? 'Entry updated' : 'Entry added');
      setFormOpen(false);
    } finally {
      setBusy(false);
    }
  });

  const reactivate = async (row: MutableClassificationEntry) => {
    const next = guide.rows.map((r) =>
      r.class_name === row.class_name ? { ...r, deactivated_at: null } : r
    );
    savedToast(await guide.persist(next), 'Entry reactivated');
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'reset') {
        savedToast(await guide.persist(seedFromGuide()), 'Reset to defaults');
      } else {
        const stamp = new Date().toISOString();
        const next = guide.rows.map((r) =>
          r.class_name === confirm.row.class_name ? { ...r, deactivated_at: stamp } : r
        );
        savedToast(await guide.persist(next), 'Entry deactivated');
      }
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<MutableClassificationEntry>[] = [
    {
      key: 'class',
      header: 'Class',
      kind: 'code',
      primary: true,
      cell: (r) => r.class_name,
      sortValue: (r) => r.class_name,
    },
    {
      key: 'examples',
      header: 'Common examples',
      secondary: true,
      cell: (r) => (
        <span className="block max-w-[28rem] truncate text-muted-foreground">
          {r.common_examples.join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      kind: 'code',
      cell: (r) => r.location_code,
      sortValue: (r) => r.location_code,
    },
    { key: 'two', header: '2-digit', kind: 'code', cell: (r) => r.two_digit_code },
    {
      key: 'review',
      header: 'Supervisor review',
      cell: (r) => (r.supervisor_review ? 'Required' : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <ActiveText deactivatedAt={r.deactivated_at} />,
    },
  ];

  return (
    <section aria-labelledby="settings-classification" className="flex flex-col gap-4">
      <SectionHeader
        title="Classification guide"
        description="Maps medication classes to bin locations. Edits apply immediately to Check In suggestions."
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirm({ kind: 'reset' })}>
              Reset to defaults
            </Button>
            <Button onClick={openAdd}>
              <Plus aria-hidden /> Add entry
            </Button>
          </>
        }
      />
      {guide.localFallback ? (
        <Notice title="Saving to this device">
          PATCH /inventory/settings/classification isn&apos;t live yet. Changes are kept in this
          browser and will sync once the endpoint is deployed.
        </Notice>
      ) : null}
      <DataTable
        rows={guide.rows}
        rowKey={(r) => r.class_name}
        columns={columns}
        loading={guide.loading}
        error={guide.error}
        onRetry={guide.refetch}
        caption="Medication classification guide"
        rowActions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
              Edit
            </Button>
            {r.deactivated_at ? (
              <Button size="sm" variant="ghost" onClick={() => void reactivate(r)}>
                Reactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirm({ kind: 'deactivate', row: r })}
              >
                Deactivate
              </Button>
            )}
          </>
        )}
        empty={{
          title: 'No classification entries',
          description: 'Add the first class → bin mapping, or reset to the MASS defaults.',
          action: (
            <Button onClick={openAdd}>
              <Plus aria-hidden /> Add the first entry
            </Button>
          ),
        }}
      />

      <EntityDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        desktop="dialog"
        title={editing ? `Edit ${editing.class_name}` : 'Add classification entry'}
        description="Changes apply immediately to Check In location suggestions."
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="classification-form" loading={busy}>
              {editing ? 'Save changes' : 'Add entry'}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id="classification-form"
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <TextField
              control={form.control}
              name="className"
              label="Class name"
              placeholder="CARDIO"
              autoCapitalize="characters"
              disabled={!!editing}
              description={
                editing ? 'The class name is the identifier and cannot be changed.' : undefined
              }
            />
            <TextField
              control={form.control}
              name="examples"
              label="Common examples"
              optional
              placeholder="Lisinopril, Metoprolol, Amlodipine"
              description="Comma-separated."
            />
            <FieldRow>
              <TextField
                control={form.control}
                name="locationCode"
                label="Location code"
                placeholder="CARDIO"
              />
              <TextField
                control={form.control}
                name="twoDigit"
                label="2-digit code"
                optional
                placeholder="CD"
                maxLength={2}
                autoCapitalize="characters"
              />
            </FieldRow>
            <FormField
              control={form.control}
              name="supervisorReview"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-sm border border-border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">
                      Requires supervisor review
                    </FormLabel>
                    <FormDescription className="text-xs">
                      When on, Check In flags this class for superadmin review.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </EntityDrawer>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === 'reset'
            ? 'Reset to MASS defaults?'
            : `Deactivate ${confirm?.kind === 'deactivate' ? confirm.row.class_name : ''}?`
        }
        description={
          confirm?.kind === 'reset'
            ? 'Every local edit to the guide will be lost.'
            : 'Check In will stop suggesting this class. You can reactivate it later.'
        }
        confirmLabel={confirm?.kind === 'reset' ? 'Reset guide' : 'Deactivate'}
        onConfirm={runConfirm}
        busy={busy}
      />
    </section>
  );
}
