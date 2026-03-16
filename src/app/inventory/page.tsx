'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  ShoppingCart,
  AlertTriangle,
  QrCode as QrCodeIcon,
  Printer,
  Info,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  X as XIcon,
  Save,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { AppShell } from '../../components/layout/AppShell';
import {
  InventoryFiltersState,
  filtersStateToInput,
} from '../../types/inventory';
import { inventory as inventoryApi, transactions as txApi } from '@/lib/api';
import { AdvancedInventoryFilters } from '@/components/inventory/AdvancedInventoryFilters';
import { UnitLabel } from '@/components/unit-label/UnitLabel';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type SortField = 'MEDICATION_NAME' | 'STRENGTH' | 'QUANTITY' | 'EXPIRY_DATE' | 'CREATED_DATE';
type SortOrder = 'ASC' | 'DESC';

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState<InventoryFiltersState>({});
  const [sortField, setSortField] = useState<SortField | null>('CREATED_DATE');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const [quickCheckoutUnit, setQuickCheckoutUnit] = useState<any | null>(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState<string>('1');
  const [checkoutModalOpened, setCheckoutModalOpened] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editedUnit, setEditedUnit] = useState<{
    totalQuantity: number;
    availableQuantity: number;
    expiryDate: string;
    optionalNotes: string;
  } | null>(null);
  const [data, setData] = useState<{ units: any[]; total: number; page: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitTransactions, setUnitTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [updatingUnit, setUpdatingUnit] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  const filterInput = {
    ...filtersStateToInput(filters),
    ...(sortField && { sortBy: sortField, sortOrder }),
  };

  const fetchUnits = useCallback(() => {
    setLoading(true);
    inventoryApi.getUnitsAdvanced(filterInput, page, 20)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters, sortField, sortOrder]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const units = data?.units || [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-40" />;
    }
    return sortOrder === 'ASC' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleRowClick = (unit: any) => {
    setSelectedUnit(unit);
    setModalOpened(true);
    setIsEditMode(false);
    setEditedUnit(null);
    setLoadingTransactions(true);
    txApi.getTransactions({ page: 1, pageSize: 20, unitId: unit.unitId })
      .then((txData) => setUnitTransactions(txData.transactions))
      .catch(() => {})
      .finally(() => setLoadingTransactions(false));
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setSelectedUnit(null);
    setIsEditMode(false);
    setEditedUnit(null);
  };

  const handleStartEdit = () => {
    if (!selectedUnit) return;
    setIsEditMode(true);
    setEditedUnit({
      totalQuantity: selectedUnit.totalQuantity,
      availableQuantity: selectedUnit.availableQuantity,
      expiryDate: new Date(selectedUnit.expiryDate).toISOString().split('T')[0],
      optionalNotes: selectedUnit.optionalNotes || '',
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedUnit(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedUnit || !editedUnit) return;

    if (editedUnit.totalQuantity < 0 || editedUnit.availableQuantity < 0) {
      toast({ title: 'Error', description: 'Quantities must be non-negative', variant: 'destructive' });
      return;
    }
    if (editedUnit.availableQuantity > editedUnit.totalQuantity) {
      toast({ title: 'Error', description: 'Available quantity cannot exceed total quantity', variant: 'destructive' });
      return;
    }

    setUpdatingUnit(true);
    try {
      await inventoryApi.updateUnit(selectedUnit.unitId, editedUnit);
      toast({ title: 'Success', description: 'Unit updated successfully' });
      setIsEditMode(false);
      setEditedUnit(null);
      setSelectedUnit({ ...selectedUnit, ...editedUnit });
      fetchUnits();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingUnit(false);
    }
  };

  const handleQuickCheckout = (unit: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickCheckoutUnit(unit);
    setCheckoutModalOpened(true);
  };

  const handleQuickCheckoutSubmit = async () => {
    if (!quickCheckoutUnit) return;
    const qty = parseInt(checkoutQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid quantity', variant: 'destructive' });
      return;
    }
    if (qty > quickCheckoutUnit.availableQuantity) {
      toast({ title: 'Error', description: 'Quantity exceeds available stock', variant: 'destructive' });
      return;
    }

    setCheckingOut(true);
    try {
      await txApi.checkout(quickCheckoutUnit.unitId, qty, 'Quick checkout from inventory');
      toast({ title: 'Success', description: 'Unit checked out successfully' });
      setCheckoutModalOpened(false);
      setQuickCheckoutUnit(null);
      setCheckoutQuantity('1');
      fetchUnits();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCheckingOut(false);
    }
  };

  const handleQuarantine = async (unit: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await txApi.checkout(unit.unitId, unit.availableQuantity, 'QUARANTINED - Removed from available inventory');
      toast({ title: 'Success', description: 'Unit quarantined' });
      fetchUnits();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DaanaRX-Label-${selectedUnit?.unitId}`,
    pageStyle: `
      @page {
        size: 4in 2in;
        margin: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `,
  });

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Inventory</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            View and manage all medication units
          </p>
        </div>

        <Card className="animate-fade-in">
          <CardContent className="pt-6 space-y-5">
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-5 w-5 text-primary" />
              <AlertDescription className="text-base">
                Click on any row to view unit details, QR code, and transaction history. Use the action menu (⋮) for quick checkout or quarantine.
              </AlertDescription>
            </Alert>

            {/* Advanced Inventory Filters */}
            <AdvancedInventoryFilters
              filters={filters}
              onFiltersChange={(newFilters: InventoryFiltersState) => {
                setFilters(newFilters);
                setPage(1);
              }}
              onExport={() => {
                toast({
                  title: 'Coming Soon',
                  description: 'Export functionality will be available soon',
                });
              }}
            />
          </CardContent>

          {loading && !data ? (
            <div className="flex justify-center items-center h-[300px]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : units.length > 0 ? (
            <div className="space-y-4">
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {units.map((unit) => {
                  const isExpired = new Date(unit.expiryDate) < new Date();
                  const isExpiringSoon = new Date(unit.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <Card
                      key={unit.unitId}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleRowClick(unit)}
                    >
                      <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm break-words">{unit.drug.medicationName}</p>
                            <p className="text-xs text-muted-foreground mt-1 break-words">{unit.drug.genericName}</p>
                          </div>
                          <Badge variant={unit.availableQuantity > 0 ? 'default' : 'secondary'} className="px-2 py-1 text-xs whitespace-nowrap flex-shrink-0">
                            {Math.floor(unit.availableQuantity)} / {Math.floor(unit.totalQuantity)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="px-2 py-1 text-xs">
                            {unit.drug.strength} {unit.drug.strengthUnit}
                          </Badge>
                          <Badge
                            variant={isExpired ? 'destructive' : isExpiringSoon ? 'outline' : 'secondary'}
                            className={cn(
                              'px-2 py-1 text-xs',
                              !isExpired && isExpiringSoon && 'border-warning/50 text-warning bg-warning/5'
                            )}
                          >
                            {new Date(unit.expiryDate).toLocaleDateString()}
                          </Badge>
                          {unit.lot?.location && (
                            <Badge variant="outline" className="px-2 py-1 text-xs">
                              {unit.lot.location.name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{unit.lot?.source || 'No source'}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleQuickCheckout(unit, e as any); }}
                                disabled={unit.availableQuantity === 0}
                              >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Quick Checkout
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(unit); }}>
                                <QrCodeIcon className="mr-2 h-4 w-4" />
                                View QR Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleQuarantine(unit, e as any); }}
                                disabled={unit.availableQuantity === 0}
                                className="text-orange-600"
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Quarantine
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="font-semibold cursor-pointer select-none hover:bg-accent/50 transition-colors"
                        onClick={() => handleSort('MEDICATION_NAME')}
                      >
                        <div className="flex items-center">
                          Medication
                          {getSortIcon('MEDICATION_NAME')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold cursor-pointer select-none hover:bg-accent/50 transition-colors"
                        onClick={() => handleSort('STRENGTH')}
                      >
                        <div className="flex items-center">
                          Strength
                          {getSortIcon('STRENGTH')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold cursor-pointer select-none hover:bg-accent/50 transition-colors"
                        onClick={() => handleSort('QUANTITY')}
                      >
                        <div className="flex items-center">
                          Available
                          {getSortIcon('QUANTITY')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold cursor-pointer select-none hover:bg-accent/50 transition-colors"
                        onClick={() => handleSort('EXPIRY_DATE')}
                      >
                        <div className="flex items-center">
                          Expiry
                          {getSortIcon('EXPIRY_DATE')}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Source</TableHead>
                      <TableHead className="w-[60px] font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => {
                      const isExpired = new Date(unit.expiryDate) < new Date();
                      const isExpiringSoon =
                        new Date(unit.expiryDate) <
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                      return (
                        <TableRow
                          key={unit.unitId}
                          onClick={() => handleRowClick(unit)}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold">{unit.drug.medicationName}</div>
                              <div className="text-sm text-muted-foreground">{unit.drug.genericName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {unit.drug.strength} {unit.drug.strengthUnit}
                          </TableCell>
                          <TableCell>
                            <Badge variant={unit.availableQuantity > 0 ? 'default' : 'secondary'} className="px-3 py-1">
                              {Math.floor(unit.availableQuantity)} / {Math.floor(unit.totalQuantity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isExpired ? 'destructive' : isExpiringSoon ? 'outline' : 'secondary'}
                              className={cn(
                                'px-3 py-1',
                                !isExpired && isExpiringSoon && 'border-warning/50 text-warning bg-warning/5'
                              )}
                            >
                              {new Date(unit.expiryDate).toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {unit.lot?.location ? (
                              <Badge variant="outline" className="px-3 py-1">
                                {unit.lot.location.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{unit.lot?.source || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={(e) => handleQuickCheckout(unit, e as any)}
                                  disabled={unit.availableQuantity === 0}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Quick Checkout
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(unit);
                                  }}
                                >
                                  <QrCodeIcon className="mr-2 h-4 w-4" />
                                  View QR Code
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => handleQuarantine(unit, e as any)}
                                  disabled={unit.availableQuantity === 0}
                                  className="text-orange-600"
                                >
                                  <AlertTriangle className="mr-2 h-4 w-4" />
                                  Quarantine
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center py-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(Math.max(1, page - 1))}
                          className={cn(page === 1 && 'pointer-events-none opacity-50')}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          className={cn(page === totalPages && 'pointer-events-none opacity-50')}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No units found
            </div>
          )}
        </Card>

        {/* Unit Details Modal */}
        <Dialog open={modalOpened} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Unit Details</DialogTitle>
            </DialogHeader>
            {selectedUnit && (
              <div className="space-y-6">
                {/* QR Code Section with Print */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">QR Code</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint()}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Label
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div ref={printRef}>
                      <UnitLabel
                        unitId={selectedUnit.unitId}
                        medicationName={selectedUnit.drug.medicationName}
                        genericName={selectedUnit.drug.genericName}
                        strength={selectedUnit.drug.strength}
                        strengthUnit={selectedUnit.drug.strengthUnit}
                        form={selectedUnit.drug.form}
                        ndcId={selectedUnit.drug.ndcId}
                        manufacturerLotNumber={selectedUnit.manufacturerLotNumber}
                        availableQuantity={selectedUnit.availableQuantity}
                        totalQuantity={selectedUnit.totalQuantity}
                        expiryDate={selectedUnit.expiryDate}
                        donationSource={selectedUnit.lot?.source}
                        locationName={selectedUnit.lot?.location?.name}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Unit Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Medication Information</CardTitle>
                      {!isEditMode ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartEdit}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updatingUnit}
                          >
                            <XIcon className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updatingUnit}
                          >
                            {updatingUnit ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Medication:</p>
                        <p className="text-sm text-muted-foreground break-words">{selectedUnit.drug.medicationName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Generic:</p>
                        <p className="text-sm text-muted-foreground break-words">{selectedUnit.drug.genericName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Strength:</p>
                        <Badge variant="outline" className="mt-1">
                          {selectedUnit.drug.strength} {selectedUnit.drug.strengthUnit}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Form:</p>
                        <p className="text-sm text-muted-foreground">{selectedUnit.drug.form}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium">NDC:</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">{selectedUnit.drug.ndcId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Available / Total:</p>
                        {isEditMode && editedUnit ? (
                          <div className="flex gap-2 items-center mt-1">
                            <Input
                              type="number"
                              min="0"
                              value={editedUnit.availableQuantity}
                              onChange={(e) => setEditedUnit({
                                ...editedUnit,
                                availableQuantity: parseInt(e.target.value) || 0
                              })}
                              className="h-8 w-16 sm:w-20"
                            />
                            <span className="text-sm text-muted-foreground">/</span>
                            <Input
                              type="number"
                              min="0"
                              value={editedUnit.totalQuantity}
                              onChange={(e) => setEditedUnit({
                                ...editedUnit,
                                totalQuantity: parseInt(e.target.value) || 0
                              })}
                              className="h-8 w-16 sm:w-20"
                            />
                          </div>
                        ) : (
                          <Badge variant={selectedUnit.availableQuantity > 0 ? 'default' : 'secondary'} className="mt-1">
                            {Math.floor(selectedUnit.availableQuantity)} / {Math.floor(selectedUnit.totalQuantity)}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Expiry Date:</p>
                        {isEditMode && editedUnit ? (
                          <Input
                            type="date"
                            value={editedUnit.expiryDate}
                            onChange={(e) => setEditedUnit({
                              ...editedUnit,
                              expiryDate: e.target.value
                            })}
                            className="h-8 mt-1"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(selectedUnit.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {selectedUnit.lot && (
                        <>
                          <div>
                            <p className="text-sm font-medium">Source:</p>
                            <p className="text-sm text-muted-foreground break-words">{selectedUnit.lot.source}</p>
                          </div>
                          {selectedUnit.lot.location && (
                            <div>
                              <p className="text-sm font-medium">Location:</p>
                              <Badge variant="outline" className="mt-1">
                                {selectedUnit.lot.location.name} ({selectedUnit.lot.location.temp.replace('_', ' ')})
                              </Badge>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {(selectedUnit.optionalNotes || isEditMode) && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-sm font-medium mb-2">Notes:</p>
                          {isEditMode && editedUnit ? (
                            <Input
                              placeholder="Add optional notes..."
                              value={editedUnit.optionalNotes}
                              onChange={(e) => setEditedUnit({
                                ...editedUnit,
                                optionalNotes: e.target.value
                              })}
                              className="w-full"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">{selectedUnit.optionalNotes || 'No notes'}</p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => router.push(`/checkout?unitId=${selectedUnit.unitId}`)}
                        disabled={selectedUnit.availableQuantity === 0}
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Checkout
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleCloseModal();
                          handleQuarantine(selectedUnit, { stopPropagation: () => {} } as React.MouseEvent);
                        }}
                        disabled={selectedUnit.availableQuantity === 0}
                        size="lg"
                        className="w-full sm:w-auto border-warning text-warning hover:bg-warning/10"
                      >
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Quarantine All
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingTransactions ? (
                      <div className="flex justify-center items-center h-[100px]">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : unitTransactions.length > 0 ? (
                      <div className="overflow-x-auto -mx-6 sm:-mx-6">
                        <div className="inline-block min-w-full align-middle">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[140px]">Date & Time</TableHead>
                                <TableHead className="min-w-[80px]">Type</TableHead>
                                <TableHead className="min-w-[70px]">Quantity</TableHead>
                                <TableHead className="min-w-[90px]">User</TableHead>
                                <TableHead className="min-w-[100px]">Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unitTransactions.map((tx) => (
                                <TableRow key={tx.transactionId}>
                                  <TableCell className="text-xs sm:text-sm whitespace-nowrap">{new Date(tx.timestamp).toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Badge variant={tx.type === 'check_in' ? 'default' : tx.type === 'check_out' ? 'secondary' : 'outline'} className="text-xs">
                                      {tx.type.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{tx.quantity}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">{tx.user?.username || '-'}</TableCell>
                                  <TableCell className="text-xs sm:text-sm break-words">{tx.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No transactions found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quick Checkout Modal */}
        <Dialog open={checkoutModalOpened} onOpenChange={setCheckoutModalOpened}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Quick Checkout</DialogTitle>
            </DialogHeader>
            {quickCheckoutUnit && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="font-medium">{quickCheckoutUnit.drug.medicationName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Available:</span>
                    <Badge>{quickCheckoutUnit.availableQuantity}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-qty">Quantity to checkout</Label>
                  <Input
                    id="checkout-qty"
                    type="number"
                    min={1}
                    max={quickCheckoutUnit.availableQuantity}
                    value={checkoutQuantity}
                    onChange={(e) => setCheckoutQuantity(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCheckoutModalOpened(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleQuickCheckoutSubmit} disabled={checkingOut}>
                    {checkingOut && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Checkout
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
