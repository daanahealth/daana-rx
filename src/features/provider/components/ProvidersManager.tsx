'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  DataTable,
  DateText,
  EntityDrawer,
  TextField,
  SelectField,
  FieldRow,
  type Column,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/features/shared/useAsync';
import { loadClassificationOverrides } from '@/components/settings/ClassificationGuide';
import { inviteProvider, patchProvider } from '../api';
import { useProviders } from '../hooks';
import {
  PROVIDER_CREDENTIALS,
  specialtyLabel,
  type ProviderCredential,
  type ProviderUserVM,
} from '../mappers';

/**
 * ProvidersManager — Settings › Users › Providers. Superadmin-only list of
 * provider accounts with an Active toggle, plus "Add provider" which creates
 * the account directly (POST /auth/invite, role provider + profile fields).
 */
export const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  fullName: z.string().trim().min(2, 'Enter the provider’s full name'),
  credential: z.enum(PROVIDER_CREDENTIALS, { message: 'Pick a credential' }),
  specialty: z.string().trim().min(1, 'Pick a specialty'),
});

export type InviteValues = z.infer<typeof inviteSchema>;

const INVITE_FORM_ID = 'invite-provider-form';

/** Username derived from the email local part — the API requires one. */
export function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32) || 'provider';
}

export function ProvidersManager() {
  const { toast } = useToast();
  const list = useProviders();
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [toggling, setToggling] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const specialties = React.useMemo(
    () =>
      loadClassificationOverrides()
        .map((e) => e.class_name)
        .filter((v, i, a) => !!v && a.indexOf(v) === i)
        .sort(),
    []
  );

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', fullName: '', credential: 'NP', specialty: '' },
  });

  const submit = async (values: InviteValues) => {
    setSaving(true);
    setFormError(null);
    try {
      const created = await inviteProvider({
        email: values.email,
        username: usernameFromEmail(values.email),
        fullName: values.fullName,
        credential: values.credential as ProviderCredential,
        specialty: values.specialty,
      });
      list.setData((prev) => [created, ...(prev ?? [])]);
      toast({
        title: 'Provider added',
        description: `${values.fullName} can sign in with ${values.email}.`,
      });
      form.reset();
      setAdding(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ProviderUserVM, active: boolean) => {
    setToggling(p.userId);
    list.setData(
      (prev) =>
        prev?.map((x) =>
          x.userId === p.userId && x.profile ? { ...x, profile: { ...x.profile, active } } : x
        ) ?? prev
    );
    try {
      const updated = await patchProvider(p.userId, { active });
      list.setData((prev) => prev?.map((x) => (x.userId === p.userId ? updated : x)) ?? prev);
      toast({
        title: active ? 'Provider reactivated' : 'Provider deactivated',
        description: active
          ? `${p.profile?.fullName ?? p.email} can sign in again.`
          : `${p.profile?.fullName ?? p.email} can no longer sign in; pending requests are released.`,
      });
    } catch (err) {
      list.setData(
        (prev) =>
          prev?.map((x) =>
            x.userId === p.userId && x.profile
              ? { ...x, profile: { ...x.profile, active: !active } }
              : x
          ) ?? prev
      );
      toast({ title: "Couldn't update", description: errorMessage(err), variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const columns = React.useMemo<Column<ProviderUserVM>[]>(
    () => [
      {
        key: 'name',
        header: 'Provider',
        primary: true,
        cell: (p) =>
          p.profile ? `${p.profile.fullName}, ${p.profile.credential}` : p.username || p.email,
        sortValue: (p) => p.profile?.fullName ?? p.email,
      },
      { key: 'email', header: 'Email', secondary: true, cell: (p) => p.email || '—' },
      {
        key: 'specialty',
        header: 'Specialty',
        cell: (p) => (p.profile ? specialtyLabel(p.profile.specialty) : '—'),
        sortValue: (p) => p.profile?.specialty ?? '',
      },
      {
        key: 'created',
        header: 'Added',
        kind: 'date',
        cell: (p) => <DateText value={p.createdAt} />,
        sortValue: (p) => p.createdAt ?? '',
      },
      {
        key: 'active',
        header: 'Active',
        cell: (p) => (
          <span className="inline-flex items-center gap-2">
            <Switch
              aria-label={`${p.profile?.fullName ?? p.email} active`}
              checked={p.profile?.active ?? false}
              disabled={!p.profile || toggling === p.userId}
              onCheckedChange={(v) => toggleActive(p, v)}
            />
            <span className="text-xs text-muted-foreground">
              {p.profile?.active ? 'Yes' : 'No'}
            </span>
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggling]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Providers</CardTitle>
            <CardDescription>
              Clinicians who browse availability and request dispenses. They never touch stock.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add provider
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable<ProviderUserVM>
          columns={columns}
          rows={list.data ?? []}
          rowKey={(p) => p.userId}
          loading={list.status === 'loading'}
          error={list.error}
          onRetry={list.refetch}
          skeletonRows={3}
          caption="Provider accounts"
          empty={{
            title: 'No providers yet',
            description: 'Add a clinician with their name, credential and specialty.',
            action: (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Stethoscope aria-hidden /> Add a provider
              </Button>
            ),
          }}
        />
      </CardContent>

      <EntityDrawer
        open={adding}
        onOpenChange={(o) => !saving && setAdding(o)}
        desktop="dialog"
        title="Add provider"
        description="The account is created now with a temporary password; the provider resets it from the sign-in page."
        footer={
          <>
            <Button
              variant="outline"
              size="touch"
              disabled={saving}
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={INVITE_FORM_ID}
              size="touch"
              loading={saving}
              disabled={saving}
            >
              Add provider
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id={INVITE_FORM_ID}
            onSubmit={form.handleSubmit(submit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="off"
              placeholder="karol.patel@clinic.org"
            />
            <TextField
              control={form.control}
              name="fullName"
              label="Full name"
              placeholder="Karol Patel"
              autoComplete="off"
            />
            <FieldRow>
              <SelectField
                control={form.control}
                name="credential"
                label="Credential"
                options={PROVIDER_CREDENTIALS.map((c) => ({ value: c, label: c }))}
              />
              <SelectField
                control={form.control}
                name="specialty"
                label="Specialty"
                placeholder="Pick a specialty"
                options={specialties.map((s) => ({
                  value: s,
                  label: `${specialtyLabel(s)} (${s})`,
                }))}
              />
            </FieldRow>
            {formError ? (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            ) : null}
          </form>
        </Form>
      </EntityDrawer>
    </Card>
  );
}
