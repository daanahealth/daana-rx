'use client';

import { useState, useEffect } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { LocationData } from '../../types/graphql';
import { auth, inventory } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { toast } = useToast();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [name, setName] = useState('');
  const [temp, setTemp] = useState<string>('room_temp');
  const [requireLotLocation, setRequireLotLocation] = useState(false);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingClinic, setUpdatingClinic] = useState(false);

  useEffect(() => {
    inventory.getLocations().then(setLocations).catch(() => {});
    auth.getClinic().then((clinic) => {
      if (clinic?.requireLotLocation !== undefined) setRequireLotLocation(clinic.requireLotLocation);
    }).catch(() => {});
  }, []);

  const refetch = () => inventory.getLocations().then(setLocations).catch(() => {});

  const handleRequireLotLocationChange = async (checked: boolean) => {
    setRequireLotLocation(checked);
    setUpdatingClinic(true);
    try {
      await auth.updateClinic({ requireLotLocation: checked });
      toast({ title: 'Success', description: 'Clinic settings updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingClinic(false);
    }
  };

  const handleSubmit = async () => {
    if (editingLocation) {
      setUpdating(true);
      try {
        await inventory.updateLocation(editingLocation.locationId, name, temp);
        toast({ title: 'Success', description: 'Location updated successfully' });
        setModalOpened(false);
        setEditingLocation(null);
        setName('');
        setTemp('room_temp');
        refetch();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setUpdating(false);
      }
    } else {
      setCreating(true);
      try {
        await inventory.createLocation(name, temp);
        toast({ title: 'Success', description: 'Location created successfully' });
        setModalOpened(false);
        setName('');
        setTemp('room_temp');
        refetch();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setCreating(false);
      }
    }
  };

  const handleEdit = (location: LocationData) => {
    setEditingLocation(location);
    setName(location.name);
    setTemp(location.temp === 'room temp' ? 'room_temp' : 'fridge');
    setModalOpened(true);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await inventory.deleteLocation(locationId);
      toast({ title: 'Success', description: 'Location deleted successfully' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openCreateModal = () => {
    setEditingLocation(null);
    setName('');
    setTemp('room_temp');
    setModalOpened(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Admin</h1>
            <p className="text-base sm:text-lg text-muted-foreground">Manage locations and clinic settings</p>
          </div>
          <Button onClick={openCreateModal} size="lg" className="w-full sm:w-auto">Create Location</Button>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle className="text-2xl">Clinic Settings</CardTitle>
            </div>
            <CardDescription>Configure your clinic preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="require-lot-location" className="text-base font-semibold">Require Location (L/R) for Lot Codes</Label>
                <p className="text-sm text-muted-foreground">When enabled, users must specify Left (L) or Right (R) when creating new lots</p>
              </div>
              <Switch id="require-lot-location" checked={requireLotLocation} onCheckedChange={handleRequireLotLocationChange} disabled={updatingClinic} />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="text-2xl">Locations</CardTitle></CardHeader>
          <CardContent>
            {locations.length > 0 ? (
              <div className="overflow-x-auto -mx-6 sm:-mx-6">
                <div className="inline-block min-w-full align-middle">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold min-w-[120px]">Name</TableHead>
                        <TableHead className="font-semibold min-w-[100px]">Temperature</TableHead>
                        <TableHead className="font-semibold hidden sm:table-cell min-w-[100px]">Created</TableHead>
                        <TableHead className="font-semibold min-w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={location.locationId} className="hover:bg-accent/50">
                          <TableCell className="font-semibold break-words">{location.name}</TableCell>
                          <TableCell className="capitalize font-medium text-sm">{location.temp.replace('_', ' ')}</TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{new Date(location.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(location)} className="w-full sm:w-auto">Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(location.locationId)} className="w-full sm:w-auto">Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-base text-muted-foreground text-center py-8">No locations created yet</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpened} onOpenChange={setModalOpened}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
              <DialogDescription className="text-base">{editingLocation ? 'Update the location details' : 'Add a new storage location for medications'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-3">
                <Label htmlFor="location-name" className="text-base font-semibold">Location Name *</Label>
                <Input id="location-name" placeholder="e.g., Main Refrigerator" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="temperature" className="text-base font-semibold">Temperature *</Label>
                <Select value={temp} onValueChange={setTemp}>
                  <SelectTrigger id="temperature"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fridge">Refrigerated (Fridge)</SelectItem>
                    <SelectItem value="room_temp">Room Temperature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLocation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
