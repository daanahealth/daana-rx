'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { QrCodeIcon, AlertCircle, Loader2, MoreVertical, ShoppingCart, AlertTriangle, QrCode as QrCodeIconAlt, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { AppShell } from '../../components/layout/AppShell';
import { QRScanner } from '../../components/QRScanner';
import { UnitData } from '../../types/graphql';
import { RootState } from '../../store';
import { addToCart } from '../../store/cartSlice';
import { inventory, transactions } from '@/lib/api';
import { UnitLabel } from '@/components/unit-label/UnitLabel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function CheckOutContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const dispatch = useDispatch();
  const cartItemCount = useSelector((state: RootState) => state.cart.items.length);

  const [unitId, setUnitId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [viewedUnit, setViewedUnit] = useState<UnitData | null>(null);
  const [showUnitDetailsModal, setShowUnitDetailsModal] = useState(false);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [searchingUnits, setSearchingUnits] = useState(false);
  const [searchResults, setSearchResults] = useState<UnitData[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [totalUnits, setTotalUnits] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inventory.getStats().then(s => setTotalUnits(s.totalUnits)).catch(() => {}).finally(() => setLoadingStats(false));
  }, []);

  const hasInventory = totalUnits !== null && totalUnits > 0;

  const fetchUnit = async (id: string) => {
    setLoadingUnit(true);
    try {
      const unit = await inventory.getUnit(id);
      setSelectedUnit(unit);
      toast({ title: 'Unit Found', description: `${unit.drug.medicationName} - ${unit.availableQuantity} available` });
    } catch {
      toast({ title: 'Error', description: 'Unit not found', variant: 'destructive' });
    } finally {
      setLoadingUnit(false);
    }
  };

  const fetchSearch = async (q: string) => {
    setSearchingUnits(true);
    try {
      const results = await inventory.searchUnits(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingUnits(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const trimmed = unitId.trim();
    if (trimmed.length === 0) { setSearchResults([]); return; }
    const id = setTimeout(() => {
      if (trimmed.length >= 2) {
        if (trimmed.length === 36) fetchUnit(trimmed);
        else fetchSearch(trimmed);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [unitId]);

  // Auto-populate from URL params
  useEffect(() => {
    const param = searchParams?.get('unitId');
    if (param) { setUnitId(param); fetchUnit(param); }
  }, [searchParams]);

  const handleSearch = () => {
    const trimmed = unitId.trim();
    if (trimmed.length >= 2) {
      if (trimmed.length === 36) fetchUnit(trimmed);
      else fetchSearch(trimmed);
    }
  };

  const handleSelectUnit = (unit: UnitData) => {
    setUnitId(unit.unitId);
    fetchUnit(unit.unitId);
  };

  const handleReset = () => { setUnitId(''); setSelectedUnit(null); setQuantity(''); setSearchResults([]); };

  const handleQRScanned = (code: string) => { setShowQRScanner(false); setUnitId(code); fetchUnit(code); };

  const handleAddToCart = () => {
    const qty = parseInt(quantity, 10);
    if (!selectedUnit) { toast({ title: 'Error', description: 'Please scan or select a unit first', variant: 'destructive' }); return; }
    if (isNaN(qty) || qty <= 0) { toast({ title: 'Error', description: 'Please enter valid quantity', variant: 'destructive' }); return; }
    dispatch(addToCart({ unit: selectedUnit, quantity: qty }));
    toast({ title: 'Added to Cart', description: `${selectedUnit.drug.medicationName} x${qty}` });
    handleReset();
  };

  const handleQuickAddToCart = (unit: UnitData, qty: number) => {
    dispatch(addToCart({ unit, quantity: qty }));
    toast({ title: 'Added to Cart', description: `${unit.drug.medicationName} x${qty}` });
  };

  const handleQuarantine = async (unit: UnitData, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingOut(true);
    try {
      await transactions.checkout(unit.unitId, unit.availableQuantity, 'QUARANTINED - Removed from available inventory');
      toast({ title: 'Success', description: 'Unit checked out successfully' });
      handleReset();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCheckingOut(false);
    }
  };

  const handleViewUnitDetails = (unit: UnitData) => { setViewedUnit(unit); setShowUnitDetailsModal(true); };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DaanaRX-Label-${viewedUnit?.unitId}`,
    pageStyle: `@page { size: 4in 2in; margin: 0; } @media print { body { margin: 0; padding: 0; } }`,
  });

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Check Out</h1>
            <p className="text-base sm:text-lg text-muted-foreground">Search medications and add them to your cart</p>
          </div>
          <Link href="/cart">
            <Button variant={cartItemCount > 0 ? 'default' : 'outline'} className="relative">
              <ShoppingCart className="mr-2 h-5 w-5" />Cart
              {cartItemCount > 0 && <Badge className="ml-2 px-2 py-0.5">{cartItemCount}</Badge>}
            </Button>
          </Link>
        </div>

        {!loadingStats && !hasInventory && (
          <Alert className="animate-slide-in">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg">No Inventory</AlertTitle>
            <AlertDescription className="text-base">There are no medications in your inventory. Please check in medications before checking them out.</AlertDescription>
          </Alert>
        )}

        <Card className="animate-fade-in">
          <CardContent className="pt-6 space-y-5">
            <Button variant="outline" onClick={() => setShowQRScanner(true)} className="w-full" size="lg">
              <QrCodeIcon className="mr-2 h-5 w-5" />Scan QR Code
            </Button>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-3">
                <Label htmlFor="unit-search" className="text-base font-semibold">Search by Unit ID or Medication Name</Label>
                <Input id="unit-search" placeholder="Type unit ID or medication name..." value={unitId} onChange={(e) => setUnitId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                <p className="text-sm text-muted-foreground">Results appear automatically as you type (minimum 2 characters)</p>
              </div>
              <Button onClick={handleSearch} disabled={loadingUnit} size="lg" className="sm:mt-8 w-full sm:w-auto">
                {loadingUnit && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Search
              </Button>
            </div>

            {searchingUnits && <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

            {!searchingUnits && unitId.trim().length >= 2 && searchResults.length > 0 && (
              <Card className="animate-slide-in">
                <CardHeader><CardTitle className="text-xl">Search Results ({searchResults.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="block md:hidden space-y-3">
                    {searchResults.map((unit: UnitData) => {
                      const isExpired = new Date(unit.expiryDate) < new Date();
                      const isExpiringSoon = new Date(unit.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      return (
                        <Card key={unit.unitId} className="cursor-pointer hover:shadow-md transition-all duration-200" onClick={() => handleViewUnitDetails(unit)}>
                          <CardContent className="pt-4 pb-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm break-words">{unit.drug.medicationName}</p>
                                <p className="text-xs text-muted-foreground mt-1">{unit.drug.genericName}</p>
                              </div>
                              <Badge variant={unit.availableQuantity > 0 ? 'default' : 'secondary'} className="text-xs whitespace-nowrap">{unit.availableQuantity}/{unit.totalQuantity}</Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{unit.drug.strength} {unit.drug.strengthUnit}</Badge>
                              <Badge variant={isExpired ? 'destructive' : isExpiringSoon ? 'outline' : 'secondary'} className={cn('text-xs', !isExpired && isExpiringSoon && 'border-warning/50 text-warning bg-warning/5')}>
                                {new Date(unit.expiryDate).toLocaleDateString()}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs text-muted-foreground">{unit.lot?.source || 'No source'}</span>
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleQuickAddToCart(unit, 1); }} disabled={unit.availableQuantity === 0} className="h-8 text-xs">
                                <ShoppingCart className="mr-1 h-3 w-3" />Add to Cart
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medication</TableHead><TableHead>Strength</TableHead><TableHead>Available</TableHead>
                          <TableHead>Expiry</TableHead><TableHead className="hidden lg:table-cell">Location</TableHead>
                          <TableHead className="hidden lg:table-cell">Source</TableHead><TableHead className="w-[60px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((unit: UnitData) => {
                          const isExpired = new Date(unit.expiryDate) < new Date();
                          const isExpiringSoon = new Date(unit.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                          return (
                            <TableRow key={unit.unitId} onClick={() => handleViewUnitDetails(unit)} className="cursor-pointer hover:bg-accent/50">
                              <TableCell><div><div className="font-semibold text-sm">{unit.drug.medicationName}</div><div className="text-xs text-muted-foreground">{unit.drug.genericName}</div></div></TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{unit.drug.strength} {unit.drug.strengthUnit}</TableCell>
                              <TableCell><Badge variant={unit.availableQuantity > 0 ? 'default' : 'secondary'} className="text-xs">{unit.availableQuantity} / {unit.totalQuantity}</Badge></TableCell>
                              <TableCell><Badge variant={isExpired ? 'destructive' : isExpiringSoon ? 'outline' : 'secondary'} className={cn('text-xs', !isExpired && isExpiringSoon && 'border-warning/50 text-warning bg-warning/5')}>{new Date(unit.expiryDate).toLocaleDateString()}</Badge></TableCell>
                              <TableCell className="hidden lg:table-cell">{unit.lot?.location ? <Badge variant="outline" className="text-xs">{unit.lot.location.name}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                              <TableCell className="hidden lg:table-cell"><span className="text-sm truncate block max-w-[150px]">{unit.lot?.source || '-'}</span></TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAddToCart(unit, 1); }} disabled={unit.availableQuantity === 0}><ShoppingCart className="mr-2 h-4 w-4" />Add to Cart</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectUnit(unit); }} disabled={unit.availableQuantity === 0}><ShoppingCart className="mr-2 h-4 w-4" />Select Unit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewUnitDetails(unit); }}><QrCodeIconAlt className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => handleQuarantine(unit, e as any)} disabled={unit.availableQuantity === 0} className="text-orange-600"><AlertTriangle className="mr-2 h-4 w-4" />Quarantine</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {!searchingUnits && unitId.trim().length >= 2 && searchResults.length === 0 && !loadingUnit && !selectedUnit && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No units found matching &quot;{unitId}&quot;. Try a different search term or scan a QR code.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {selectedUnit && (
          <Card className="animate-fade-in">
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-2xl sm:text-3xl font-bold">Unit Details</h3>
                <Badge variant={selectedUnit.availableQuantity > 0 ? 'default' : 'destructive'} className="text-base sm:text-lg px-4 py-2">{selectedUnit.availableQuantity} Available</Badge>
              </div>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-5 space-y-3">
                  <h4 className="text-xl font-bold">{selectedUnit.drug.medicationName}</h4>
                  <p className="text-base text-muted-foreground">Generic: {selectedUnit.drug.genericName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Strength:</span>
                    <Badge variant="outline">{selectedUnit.drug.strength} {selectedUnit.drug.strengthUnit}</Badge>
                  </div>
                  <p className="text-base"><span className="font-semibold">Form:</span> {selectedUnit.drug.form}</p>
                  {selectedUnit.drug.ndcId && <p className="text-sm font-mono"><span className="font-semibold">NDC:</span> {selectedUnit.drug.ndcId}</p>}
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-2"><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Quantity</p><Badge variant="secondary" className="text-base px-4 py-2">{selectedUnit.totalQuantity}</Badge></div>
                <div className="space-y-2"><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date</p><Badge variant={new Date(selectedUnit.expiryDate) < new Date() ? 'destructive' : 'secondary'} className="text-base px-4 py-2">{new Date(selectedUnit.expiryDate).toLocaleDateString()}</Badge></div>
                <div className="space-y-2"><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Source</p><p className="font-bold text-base">{selectedUnit.lot?.source}</p></div>
              </div>
              {selectedUnit.optionalNotes && <div><p className="text-sm text-muted-foreground mb-1">Notes</p><p className="text-sm">{selectedUnit.optionalNotes}</p></div>}
              <div className="pt-6 border-t">
                <h4 className="text-xl sm:text-2xl font-bold mb-6">Add to Cart</h4>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="quantity" className="text-base font-semibold">Quantity *</Label>
                    <Input id="quantity" type="number" placeholder="Enter quantity" min={1} max={selectedUnit.availableQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button onClick={handleAddToCart} disabled={checkingOut} className="w-full sm:w-auto" size="lg"><ShoppingCart className="mr-2 h-4 w-4" />Add to Cart</Button>
                    <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto" size="lg">Cancel</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showUnitDetailsModal} onOpenChange={setShowUnitDetailsModal}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Unit Details</DialogTitle></DialogHeader>
            {viewedUnit && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">QR Code</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => handlePrint()}><Printer className="mr-2 h-4 w-4" />Print Label</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div ref={printRef}>
                      <UnitLabel unitId={viewedUnit.unitId} medicationName={viewedUnit.drug.medicationName} genericName={viewedUnit.drug.genericName} strength={viewedUnit.drug.strength} strengthUnit={viewedUnit.drug.strengthUnit} form={viewedUnit.drug.form} ndcId={viewedUnit.drug.ndcId} manufacturerLotNumber={viewedUnit.manufacturerLotNumber} availableQuantity={viewedUnit.availableQuantity} totalQuantity={viewedUnit.totalQuantity} expiryDate={viewedUnit.expiryDate} donationSource={viewedUnit.lot?.source} locationName={viewedUnit.lot?.location?.name} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Medication Information</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-sm font-medium">Medication:</p><p className="text-sm text-muted-foreground">{viewedUnit.drug.medicationName}</p></div>
                      <div><p className="text-sm font-medium">Generic:</p><p className="text-sm text-muted-foreground">{viewedUnit.drug.genericName}</p></div>
                      <div><p className="text-sm font-medium">Strength:</p><Badge variant="outline">{viewedUnit.drug.strength} {viewedUnit.drug.strengthUnit}</Badge></div>
                      <div><p className="text-sm font-medium">Form:</p><p className="text-sm text-muted-foreground">{viewedUnit.drug.form}</p></div>
                      <div><p className="text-sm font-medium">NDC:</p><p className="text-sm font-mono text-muted-foreground">{viewedUnit.drug.ndcId}</p></div>
                      <div><p className="text-sm font-medium">Available / Total:</p><Badge variant={viewedUnit.availableQuantity > 0 ? 'default' : 'secondary'}>{viewedUnit.availableQuantity} / {viewedUnit.totalQuantity}</Badge></div>
                      <div><p className="text-sm font-medium">Expiry Date:</p><p className="text-sm text-muted-foreground">{new Date(viewedUnit.expiryDate).toLocaleDateString()}</p></div>
                      <div><p className="text-sm font-medium">Manufacturer Lot #:</p>{viewedUnit.manufacturerLotNumber ? <Badge variant="outline" className="font-mono">{viewedUnit.manufacturerLotNumber}</Badge> : <Badge variant="destructive" className="text-xs">NOT RECORDED</Badge>}</div>
                      {viewedUnit.lot && (<><div><p className="text-sm font-medium">Donation Source:</p><p className="text-sm text-muted-foreground">{viewedUnit.lot.source}</p></div>{viewedUnit.lot.location && <div><p className="text-sm font-medium">Location:</p><Badge variant="outline">{viewedUnit.lot.location.name} ({viewedUnit.lot.location.temp.replace('_', ' ')})</Badge></div>}</>)}
                    </div>
                    {viewedUnit.optionalNotes && (<><Separator className="my-4" /><div><p className="text-sm font-medium mb-2">Notes:</p><p className="text-sm text-muted-foreground">{viewedUnit.optionalNotes}</p></div></>)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={() => { setShowUnitDetailsModal(false); handleQuickAddToCart(viewedUnit, 1); }} disabled={viewedUnit.availableQuantity === 0} size="lg" className="w-full sm:w-auto"><ShoppingCart className="mr-2 h-5 w-5" />Add to Cart</Button>
                      <Button variant="outline" onClick={() => { setShowUnitDetailsModal(false); handleSelectUnit(viewedUnit); }} disabled={viewedUnit.availableQuantity === 0} size="lg" className="w-full sm:w-auto"><ShoppingCart className="mr-2 h-5 w-5" />Select Unit</Button>
                      <Button variant="outline" onClick={() => { setShowUnitDetailsModal(false); handleQuarantine(viewedUnit, { stopPropagation: () => {} } as React.MouseEvent); }} disabled={viewedUnit.availableQuantity === 0} size="lg" className="w-full sm:w-auto border-warning text-warning hover:bg-warning/10"><AlertTriangle className="mr-2 h-5 w-5" />Quarantine All</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <QRScanner opened={showQRScanner} onClose={() => setShowQRScanner(false)} onScan={handleQRScanned} title="Scan DaanaRX QR Code" description="Scan the QR code on the medication unit to check it out" />
      </div>
    </AppShell>
  );
}

export default function CheckOutPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CheckOutContent />
    </Suspense>
  );
}
