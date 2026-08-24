'use client';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { KeyValueList, PasswordChecklist, PasswordField } from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/hooks/use-async';
import { validatePassword } from '@/lib/passwordRules';
import { isSuperadmin } from '@/lib/roles';
import type { RootState } from '@/store';
import { accountApi } from '../api';
import { Notice, SectionHeader } from './shared';

const schema = z
  .object({
    current: z.string().min(1, 'Enter your current password.'),
    next: z.string().refine((p) => validatePassword(p).ok, 'Meet every requirement below.'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });
type Values = z.infer<typeof schema>;

interface AccountPanelProps {
  /** Switch the parent Settings page to the Users tab. */
  onJumpToUsers?: () => void;
}

export function AccountPanel({ onJumpToUsers }: AccountPanelProps) {
  const { toast } = useToast();
  const user = useSelector((s: RootState) => s.auth.user);
  const superadmin = isSuperadmin(user?.userRole);
  const [showNew, setShowNew] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current: '', next: '', confirm: '' },
    mode: 'onBlur',
  });
  const next = useWatch({ control: form.control, name: 'next' });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const r = await accountApi.changePassword(values.current, values.next);
      if (r.kind === 'pending') {
        toast({
          title: 'Endpoint pending',
          description: 'Password change API isn’t live yet. Your password was not updated.',
        });
        return;
      }
      toast({ title: 'Password updated', description: 'Use it the next time you sign in.' });
      form.reset();
    } catch (err) {
      toast({ title: 'Update failed', description: errorMessage(err), variant: 'destructive' });
    }
  });

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="settings-account" className="flex flex-col gap-4">
        <SectionHeader title="Your account" description="Your sign-in email and assigned role." />
        <KeyValueList
          items={[
            { label: 'Email', value: user?.email ?? user?.username ?? '—' },
            { label: 'Role', value: superadmin ? 'Superadmin' : 'Restricted User' },
          ]}
        />
      </section>

      <section aria-labelledby="settings-password" className="flex flex-col gap-4">
        <SectionHeader title="Change password" description="Must satisfy every requirement." />
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4" noValidate>
            <PasswordField
              control={form.control}
              name="current"
              label="Current password"
              autoComplete="current-password"
            />
            <PasswordField
              control={form.control}
              name="next"
              label="New password"
              autoComplete="new-password"
              visible={showNew}
              onVisibleChange={setShowNew}
            />
            <PasswordField
              control={form.control}
              name="confirm"
              label="Confirm new password"
              autoComplete="new-password"
              visible={showNew}
              onVisibleChange={setShowNew}
            />
            <PasswordChecklist password={next} />
            <div>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Update password
              </Button>
            </div>
          </form>
        </Form>
      </section>

      {superadmin ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Superadmin actions"
            description="Manage other users from the Users tab."
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onJumpToUsers}>
              Add another superadmin
            </Button>
            <Button variant="outline" onClick={onJumpToUsers}>
              Manage users
            </Button>
          </div>
        </section>
      ) : (
        <Notice title="Superadmin-only sections">
          Location and user management, the classification guide and capacity thresholds are
          restricted to superadmins. Ask an upstairs staff member if you need elevated access.
        </Notice>
      )}
    </div>
  );
}
