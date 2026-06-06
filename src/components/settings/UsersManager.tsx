'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, PowerOff, Loader2, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Spec § "Settings > User Management":
//   - Add sub-user by email
//   - Assign role (Superadmin or Restricted User)
//   - Restrict or grant checkout permissions
//   - Upgrade existing user to superadmin
//   - Deactivate user

type SettingsRole = 'Superadmin' | 'Restricted User';

interface UserRow {
  userId: string;
  email: string;
  username?: string;
  role: SettingsRole;
  canCheckout: boolean;
  deactivated_at: string | null;
}

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

// Map the existing legacy user shape (auth.getUsers → userRole: superadmin|admin|employee)
// to the spec's two-role model.
function normaliseUser(raw: any): UserRow {
  const legacyRole = (raw.userRole || raw.role || '').toString().toLowerCase();
  const role: SettingsRole =
    legacyRole === 'superadmin' || legacyRole === 'admin' ? 'Superadmin' : 'Restricted User';
  return {
    userId: raw.userId || raw.id,
    email: raw.email || '',
    username: raw.username,
    role,
    canCheckout:
      typeof raw.canCheckout === 'boolean'
        ? raw.canCheckout
        : role === 'Superadmin', // Default: Superadmin can checkout, Restricted cannot
    deactivated_at: raw.deactivated_at || raw.deactivatedAt || null,
  };
}

export function UsersManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [endpointPending, setEndpointPending] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<SettingsRole>('Restricted User');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<SettingsRole>('Restricted User');
  const [editCanCheckout, setEditCanCheckout] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: authHeaders() });
      if (res.status === 404) {
        setEndpointPending(true);
        // Fall back to the legacy /auth/users endpoint when /api/users isn’t live.
        try {
          const fallback = await fetch(`${API_URL}/auth/users`, { headers: authHeaders() });
          if (fallback.ok) {
            const data = await fallback.json();
            const rows = Array.isArray(data) ? data : data?.users ?? [];
            setUsers(rows.map(normaliseUser));
          } else {
            setUsers([]);
          }
        } catch {
          setUsers([]);
        }
        return;
      }
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const body = await res.json();
      const rows = Array.isArray(body) ? body : body?.users ?? [];
      setUsers(rows.map(normaliseUser));
      setEndpointPending(false);
    } catch {
      setEndpointPending(true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  function openEdit(row: UserRow) {
    setEditing(row);
    setEditRole(row.role);
    setEditCanCheckout(row.canCheckout);
  }

  async function handleAdd() {
    if (!addEmail || !addEmail.includes('@')) {
      toast({ title: 'Invalid email', description: 'Enter a valid email address.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      if (res.status === 404) {
        toast({
          title: 'Endpoint pending',
          description: 'User-add API isn’t live yet. Invitation was not sent.',
        });
      } else if (!res.ok) {
        throw new Error(`Add failed (${res.status})`);
      } else {
        toast({ title: 'Invitation sent', description: `${addEmail} added as ${addRole}.` });
        await refetch();
      }
      setAddOpen(false);
      setAddEmail('');
      setAddRole('Restricted User');
    } catch (err: any) {
      toast({ title: 'Add failed', description: err?.message ?? 'Unknown', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${editing.userId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: editRole, canCheckout: editCanCheckout }),
      });
      if (res.status === 404) {
        toast({ title: 'Endpoint pending', description: 'User-update API isn’t live yet.' });
      } else if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      } else {
        toast({ title: 'User updated' });
        await refetch();
      }
      setEditing(null);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message ?? 'Unknown', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(row: UserRow) {
    if (!confirm(`Deactivate ${row.email}? They will lose access immediately.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${row.userId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ deactivated_at: new Date().toISOString() }),
      });
      if (res.status === 404) {
        toast({ title: 'Endpoint pending', description: 'Deactivate API isn’t live yet.' });
        return;
      }
      if (!res.ok) throw new Error(`Deactivate failed (${res.status})`);
      toast({ title: 'User deactivated' });
      await refetch();
    } catch (err: any) {
      toast({ title: 'Deactivate failed', description: err?.message ?? 'Unknown', variant: 'destructive' });
    }
  }

  async function handleUpgradeToSuperadmin(row: UserRow) {
    if (row.role === 'Superadmin') return;
    if (!confirm(`Upgrade ${row.email} to Superadmin? They will gain full system access.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${row.userId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: 'Superadmin', canCheckout: true }),
      });
      if (res.status === 404) {
        toast({ title: 'Endpoint pending', description: 'Upgrade API isn’t live yet.' });
        return;
      }
      if (!res.ok) throw new Error(`Upgrade failed (${res.status})`);
      toast({ title: 'User upgraded to Superadmin' });
      await refetch();
    } catch (err: any) {
      toast({ title: 'Upgrade failed', description: err?.message ?? 'Unknown', variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Users</CardTitle>
            <CardDescription>
              Manage Superadmins and Restricted Users. Restricted Users cannot complete checkout without superadmin approval.
            </CardDescription>
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add User
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
                <code>GET /api/users</code> isn’t live yet. Showing legacy auth users where available.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">No users yet.</p>
            <p className="text-sm text-muted-foreground">Add your first sub-user by email.</p>
            <Button onClick={() => setAddOpen(true)} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Add a user
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Checkout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId} className={u.deactivated_at ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{u.email || u.username || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'Superadmin' ? 'default' : 'outline'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.canCheckout ? (
                        <Badge variant="secondary">Allowed</Badge>
                      ) : (
                        <Badge variant="outline">Restricted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.deactivated_at ? (
                        <Badge variant="secondary">Deactivated</Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label="Edit user">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.role !== 'Superadmin' && !u.deactivated_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpgradeToSuperadmin(u)}
                            aria-label="Upgrade to Superadmin"
                            title="Upgrade to Superadmin"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {!u.deactivated_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(u)}
                            aria-label="Deactivate user"
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

      {/* Add User dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add sub-user</DialogTitle>
            <DialogDescription>
              They’ll receive an email invitation. Restricted Users cannot complete checkout without superadmin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role *</Label>
              <Select value={addRole} onValueChange={(v: any) => setAddRole(v)}>
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Superadmin">Superadmin</SelectItem>
                  <SelectItem value="Restricted User">Restricted User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Change role and checkout permissions.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{editing.email || editing.username}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Superadmin">Superadmin</SelectItem>
                    <SelectItem value="Restricted User">Restricted User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === 'Restricted User' && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-checkout" className="cursor-pointer">
                      Grant checkout permission
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When off, all checkouts still require superadmin approval.
                    </p>
                  </div>
                  <Switch
                    id="edit-checkout"
                    checked={editCanCheckout}
                    onCheckedChange={setEditCanCheckout}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
