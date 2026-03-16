'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { Mail, Trash2, Copy, Plus, Loader2 } from 'lucide-react';
import { RootState } from '../../store';
import { AppShell } from '../../components/layout/AppShell';
import { setAuth } from '../../store/authSlice';
import { auth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isSuperadmin = currentUser?.userRole === 'superadmin';

  const [modalOpened, setModalOpened] = useState(false);
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState('employee');
  const [createClinicModalOpened, setCreateClinicModalOpened] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [deleteClinicId, setDeleteClinicId] = useState<string | null>(null);

  const [usersData, setUsersData] = useState<any[]>([]);
  const [invitationsData, setInvitationsData] = useState<any[]>([]);
  const [clinicsData, setClinicsData] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [createClinicLoading, setCreateClinicLoading] = useState(false);
  const [deleteClinicLoading, setDeleteClinicLoading] = useState(false);
  const [switchClinicLoading, setSwitchClinicLoading] = useState(false);

  useEffect(() => {
    auth.getClinics().then(setClinicsData).catch(() => {});
    if (isSuperadmin) {
      auth.getUsers().then(setUsersData).catch(() => {});
      auth.getInvitations().then(setInvitationsData).catch(() => {});
    }
  }, [isSuperadmin]);

  const refetchInvitations = () => auth.getInvitations().then(setInvitationsData).catch(() => {});
  const refetchClinics = () => auth.getClinics().then(setClinicsData).catch(() => {});

  const handleSendInvitation = async () => {
    if (!email || !userRole) { toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await auth.sendInvitation(email, userRole);
      toast({ title: 'Success', description: 'Invitation sent successfully' });
      setModalOpened(false);
      setEmail('');
      setUserRole('employee');
      refetchInvitations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await auth.resendInvitation(invitationId);
      toast({ title: 'Success', description: 'Invitation resent successfully' });
      refetchInvitations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (invitationId: string) => {
    try {
      await auth.cancelInvitation(invitationId);
      toast({ title: 'Success', description: 'Invitation cancelled successfully' });
      refetchInvitations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateClinic = async () => {
    if (!newClinicName) { toast({ title: 'Error', description: 'Please enter a clinic name', variant: 'destructive' }); return; }
    setCreateClinicLoading(true);
    try {
      const data = await auth.createClinic(newClinicName);
      dispatch(setAuth({ user: data.user, clinic: data.clinic, token: data.token }));
      toast({ title: 'Success', description: `Clinic "${data.clinic.name}" created successfully!` });
      setCreateClinicModalOpened(false);
      setNewClinicName('');
      refetchClinics();
      router.push('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreateClinicLoading(false);
    }
  };

  const handleSwitchClinic = async (clinicId: string) => {
    setSwitchClinicLoading(true);
    try {
      const data = await auth.switchClinic(clinicId);
      dispatch(setAuth({ user: data.user, clinic: data.clinic, token: data.token }));
      toast({ title: 'Success', description: `Switched to "${data.clinic.name}"` });
      router.push('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSwitchClinicLoading(false);
    }
  };

  const handleDeleteClinic = async (clinicId: string) => {
    setDeleteClinicLoading(true);
    try {
      await auth.deleteClinic(clinicId);
      toast({ title: 'Success', description: 'Clinic deleted successfully' });
      setDeleteClinicId(null);
      refetchClinics();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteClinicLoading(false);
    }
  };

  const copyInvitationLink = (invitationToken: string, email: string) => {
    const url = `${window.location.origin}/auth/signup?invitation=${invitationToken}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link Copied!', description: `Invitation link for ${email} copied to clipboard` });
    }).catch(() => {
      toast({ title: 'Copy Failed', description: url, variant: 'destructive' });
    });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === 'accepted') return 'default';
    if (status === 'expired') return 'destructive';
    return 'secondary';
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Settings</h1>
            <p className="text-base sm:text-lg text-muted-foreground">{isSuperadmin ? 'Manage users and clinic configuration' : 'Manage your clinic settings'}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {isSuperadmin && (
              <Button onClick={() => setCreateClinicModalOpened(true)} variant="outline" size="lg" className="w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" />Create New Clinic
              </Button>
            )}
            {isSuperadmin && (
              <Button onClick={() => setModalOpened(true)} size="lg" className="w-full sm:w-auto">Send Invitation</Button>
            )}
          </div>
        </div>

        {isSuperadmin && (
          <Card className="animate-fade-in">
            <CardHeader><CardTitle className="text-2xl">Pending Invitations</CardTitle></CardHeader>
            <CardContent>
              {invitationsData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
                        <TableHead>Invited By</TableHead><TableHead>Sent</TableHead><TableHead>Expires</TableHead><TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitationsData.map((invitation: any) => (
                        <TableRow key={invitation.invitationId}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell><Badge variant="outline">{invitation.userRole}</Badge></TableCell>
                          <TableCell><Badge variant={getStatusBadgeVariant(invitation.status)}>{invitation.status.toUpperCase()}</Badge></TableCell>
                          <TableCell>{invitation.invitedByUser.username}</TableCell>
                          <TableCell className="text-sm">{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {invitation.status === 'invited' ? (
                              <span className="text-sm">{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                            ) : invitation.acceptedAt ? (
                              <span className="text-sm text-green-600">Accepted {new Date(invitation.acceptedAt).toLocaleDateString()}</span>
                            ) : (
                              <span className="text-sm text-red-600">Expired</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invitation.status === 'invited' && (
                              <TooltipProvider>
                                <div className="flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => copyInvitationLink(invitation.invitationToken, invitation.email)}><Copy className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy invitation link</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleResend(invitation.invitationId)}><Mail className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Resend invitation</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleCancel(invitation.invitationId)}><Trash2 className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel invitation</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending invitations</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Manage Clinics</CardTitle></CardHeader>
          <CardContent>
            {clinicsData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic Name</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinicsData.map((clinic: any) => {
                      const isActive = clinic.clinicId === currentUser?.clinicId;
                      return (
                        <TableRow key={clinic.clinicId}>
                          <TableCell className="font-medium">{clinic.name}</TableCell>
                          <TableCell className="text-sm">{new Date(clinic.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{isActive ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!isActive && (
                                <Button variant="outline" size="sm" onClick={() => handleSwitchClinic(clinic.clinicId)} disabled={switchClinicLoading}>
                                  {switchClinicLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Switch
                                </Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => setDeleteClinicId(clinic.clinicId)} disabled={deleteClinicLoading || clinicsData.length === 1}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No clinics found</p>
            )}
          </CardContent>
        </Card>

        {isSuperadmin && usersData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Active Users</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData.map((user: any) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Badge variant="outline">{user.userRole}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {isSuperadmin && (
          <Dialog open={modalOpened} onOpenChange={setModalOpened}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Send Invitation</DialogTitle>
                <DialogDescription>Send an invitation email to a new user. They will receive a link to create their account and join your clinic.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address *</Label>
                  <Input id="invite-email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground">The user will receive an invitation email at this address</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">User Role *</Label>
                  <Select value={userRole} onValueChange={setUserRole}>
                    <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpened(false)}>Cancel</Button>
                <Button onClick={handleSendInvitation} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isSuperadmin && (
          <Dialog open={createClinicModalOpened} onOpenChange={setCreateClinicModalOpened}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Clinic</DialogTitle>
                <DialogDescription>Create a new clinic. Only superadmins can create clinics.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Clinic Name *</Label>
                  <Input id="clinic-name" placeholder="My New Clinic" value={newClinicName} onChange={(e) => setNewClinicName(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateClinicModalOpened(false)}>Cancel</Button>
                <Button onClick={handleCreateClinic} disabled={createClinicLoading}>
                  {createClinicLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Clinic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={!!deleteClinicId} onOpenChange={() => setDeleteClinicId(null)}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Delete Clinic</DialogTitle>
              <DialogDescription>Are you sure you want to delete this clinic? This will remove you from the clinic. If you are the only user, the clinic and all its data will be permanently deleted.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteClinicId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteClinicId && handleDeleteClinic(deleteClinicId)} disabled={deleteClinicLoading}>
                {deleteClinicLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Clinic
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
