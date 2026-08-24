'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import {
  DataTable,
  EntityDrawer,
  KeyValueList,
  SelectField,
  TextField,
  type Column,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/hooks/use-async';
import { usersApi } from '../api';
import { useUsers } from '../hooks';
import { ROLE_OPTIONS, userDisplayName, type RoleOption, type UserRow } from '../mappers';
import { ActiveText, ConfirmDialog, Notice, SectionHeader } from './shared';

// Spec § "Settings > User Management": add sub-user by email, assign role,
// restrict/grant checkout, upgrade to superadmin, deactivate.

/**
 * Extension point for other lanes (e.g. the Provider role): return extra form
 * fields to render under the role select for a given role. Called on every
 * render of the add/edit drawer with the currently selected role value.
 *
 *   <UsersManager
 *     roleOptions={[...ROLE_OPTIONS, { value: 'Provider', label: 'Provider' }]}
 *     extraFieldsForRole={(role, ctx) =>
 *       role === 'Provider' ? <ProviderProfileFields mode={ctx.mode} user={ctx.user} /> : null}
 *   />
 *
 * The role select is data-driven from `roleOptions`; the schema accepts any
 * non-empty role string so new options need no change here. Extra fields own
 * their own state/validation and submit through `onExtraSubmit` if they need
 * to persist something beyond `{ role, canCheckout }`.
 */
export interface UsersManagerProps {
  roleOptions?: RoleOption[];
  extraFieldsForRole?: (
    role: string,
    ctx: { mode: 'add' | 'edit'; user?: UserRow }
  ) => React.ReactNode;
  /** Called after the core add/edit request succeeds, with the saved role. */
  onExtraSubmit?: (ctx: {
    mode: 'add' | 'edit';
    role: string;
    user?: UserRow;
  }) => Promise<void> | void;
}

const addSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.string().min(1, 'Choose a role.'),
});
type AddValues = z.infer<typeof addSchema>;

const editSchema = z.object({
  role: z.string().min(1, 'Choose a role.'),
  canCheckout: z.boolean(),
});
type EditValues = z.infer<typeof editSchema>;

const SUPERADMIN = 'Superadmin';
const RESTRICTED = 'Restricted User';

export function UsersManager({
  roleOptions = ROLE_OPTIONS,
  extraFieldsForRole,
  onExtraSubmit,
}: UsersManagerProps) {
  const { toast } = useToast();
  const users = useUsers();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [confirm, setConfirm] = React.useState<{
    kind: 'deactivate' | 'upgrade';
    user: UserRow;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const options = roleOptions.map((o) => ({ value: o.value, label: o.label }));

  const addForm = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { email: '', role: RESTRICTED },
  });
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { role: RESTRICTED, canCheckout: false },
  });
  const addRole = useWatch({ control: addForm.control, name: 'role' });
  const editRole = useWatch({ control: editForm.control, name: 'role' });

  const openAdd = () => {
    addForm.reset({ email: '', role: RESTRICTED });
    setAddOpen(true);
  };
  const openEdit = (u: UserRow) => {
    editForm.reset({ role: u.role, canCheckout: u.canCheckout });
    setEditing(u);
  };

  const onAdd = addForm.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const r = await usersApi.add(values.email.trim(), values.role);
      if (r.kind === 'pending') {
        toast({
          title: 'Endpoint pending',
          description: 'User-add API isn’t live yet. Invitation was not sent.',
        });
      } else {
        await onExtraSubmit?.({ mode: 'add', role: values.role });
        toast({
          title: 'Invitation sent',
          description: `${values.email} added as ${values.role}.`,
        });
        await users.refetch();
      }
      setAddOpen(false);
    } catch (err) {
      toast({ title: 'Add failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  });

  const onEdit = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    setBusy(true);
    try {
      const r = await usersApi.update(editing.userId, {
        role: values.role,
        canCheckout: values.canCheckout,
      });
      if (r.kind === 'pending') {
        toast({ title: 'Endpoint pending', description: 'User-update API isn’t live yet.' });
      } else {
        await onExtraSubmit?.({ mode: 'edit', role: values.role, user: editing });
        toast({ title: 'User updated' });
        await users.refetch();
      }
      setEditing(null);
    } catch (err) {
      toast({ title: 'Save failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  });

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    setBusy(true);
    try {
      const r =
        kind === 'deactivate'
          ? await usersApi.update(user.userId, { deactivated_at: new Date().toISOString() })
          : await usersApi.update(user.userId, { role: SUPERADMIN, canCheckout: true });
      if (r.kind === 'pending') {
        toast({
          title: 'Endpoint pending',
          description: `${kind === 'deactivate' ? 'Deactivate' : 'Upgrade'} API isn’t live yet.`,
        });
      } else {
        toast({
          title: kind === 'deactivate' ? 'User deactivated' : 'User upgraded to Superadmin',
        });
        await users.refetch();
      }
      setConfirm(null);
    } catch (err) {
      toast({
        title: kind === 'deactivate' ? 'Deactivate failed' : 'Upgrade failed',
        description: errorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: 'email',
      header: 'Email',
      primary: true,
      cell: userDisplayName,
      sortValue: userDisplayName,
    },
    { key: 'role', header: 'Role', secondary: true, cell: (u) => u.role, sortValue: (u) => u.role },
    {
      key: 'checkout',
      header: 'Checkout',
      cell: (u) => (u.canCheckout ? 'Allowed' : 'Needs approval'),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => <ActiveText deactivatedAt={u.deactivated_at} />,
    },
  ];

  return (
    <section aria-labelledby="settings-users" className="flex flex-col gap-4">
      <SectionHeader
        title="Users"
        description="Superadmins approve checkouts; Restricted Users build carts that need approval."
        actions={
          <Button onClick={openAdd}>
            <Plus aria-hidden /> Add user
          </Button>
        }
      />
      {users.data?.endpointPending ? (
        <Notice title="Backend endpoint pending">
          GET /auth/users isn&apos;t live yet. Showing legacy auth users where available.
        </Notice>
      ) : null}
      <DataTable
        rows={users.data?.rows ?? []}
        rowKey={(u) => u.userId}
        columns={columns}
        loading={users.loading}
        error={users.error}
        onRetry={users.refetch}
        caption="Clinic users"
        rowActions={(u) => (
          <>
            <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
              Edit
            </Button>
            {u.role !== SUPERADMIN && !u.deactivated_at ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirm({ kind: 'upgrade', user: u })}
              >
                Make superadmin
              </Button>
            ) : null}
            {!u.deactivated_at ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirm({ kind: 'deactivate', user: u })}
              >
                Deactivate
              </Button>
            ) : null}
          </>
        )}
        empty={{
          title: 'No users yet',
          description: 'Add your first sub-user by email.',
          action: (
            <Button onClick={openAdd}>
              <Plus aria-hidden /> Add a user
            </Button>
          ),
        }}
      />

      {/* Add user */}
      <EntityDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        desktop="dialog"
        title="Add user"
        description="They’ll receive an email invitation."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" loading={busy}>
              Send invitation
            </Button>
          </>
        }
      >
        <Form {...addForm}>
          <form id="add-user-form" onSubmit={onAdd} className="flex flex-col gap-4" noValidate>
            <TextField
              control={addForm.control}
              name="email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="user@clinic.org"
            />
            <SelectField control={addForm.control} name="role" label="Role" options={options} />
            {extraFieldsForRole?.(addRole, { mode: 'add' })}
          </form>
        </Form>
      </EntityDrawer>

      {/* Edit user */}
      <EntityDrawer
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        desktop="dialog"
        title="Edit user"
        description="Change role and checkout permissions."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" loading={busy}>
              Save changes
            </Button>
          </>
        }
      >
        {editing ? (
          <Form {...editForm}>
            <form id="edit-user-form" onSubmit={onEdit} className="flex flex-col gap-4" noValidate>
              <KeyValueList
                columns={1}
                items={[{ label: 'Email', value: userDisplayName(editing) }]}
              />
              <SelectField control={editForm.control} name="role" label="Role" options={options} />
              {editRole === RESTRICTED ? (
                <FormField
                  control={editForm.control}
                  name="canCheckout"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-sm border border-border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Allow checkout</FormLabel>
                        <FormDescription className="text-xs">
                          When off, every checkout needs superadmin approval.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : null}
              {extraFieldsForRole?.(editRole, { mode: 'edit', user: editing })}
            </form>
          </Form>
        ) : null}
      </EntityDrawer>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === 'upgrade'
            ? `Make ${confirm ? userDisplayName(confirm.user) : ''} a Superadmin?`
            : `Deactivate ${confirm ? userDisplayName(confirm.user) : ''}?`
        }
        description={
          confirm?.kind === 'upgrade'
            ? 'They will gain full access, including approving checkouts.'
            : 'They lose access immediately. Their history stays in the log.'
        }
        confirmLabel={confirm?.kind === 'upgrade' ? 'Make superadmin' : 'Deactivate'}
        onConfirm={runConfirm}
        busy={busy}
      />
    </section>
  );
}
