'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Eye,
  Loader2,
  Building2,
  Package,
  Layers,
  FileText,
  RotateCcw,
  Search,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { StockTransfer, Branch, Product } from '@/types';
import { inventoryService } from '@/services/inventory.service';
import { api, handleApiError } from '@/lib/api';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { usePagination } from '@/hooks/use-pagination';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceBranchFilter, setSourceBranchFilter] = useState('all');
  const [destBranchFilter, setDestBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  // New Transfer Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [sourceStockOnHand, setSourceStockOnHand] = useState<number | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const [transferQty, setTransferQty] = useState(1);
  const [notes, setNotes] = useState('');

  // View Details Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (sourceBranchFilter !== 'all') {
        params.sourceBranchId = sourceBranchFilter;
      }
      if (destBranchFilter !== 'all') {
        params.destinationBranchId = destBranchFilter;
      }
      const res = await inventoryService.listTransfers(params);
      const resData = (res.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setTransfers(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, sourceBranchFilter, destBranchFilter]);

  const fetchAuxData = async () => {
    try {
      const [br, pr] = await Promise.all([
        api.get('/branches'),
        api.get('/products?limit=100'),
      ]);
      const branchList = (br.data as any)?.data?.data ?? (br.data as any)?.data ?? [];
      const prodList = (pr.data as any)?.data?.data ?? (pr.data as any)?.data ?? [];
      setBranches(Array.isArray(branchList) ? branchList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Check on-hand stock at source branch
  useEffect(() => {
    if (!selectedProductId || !sourceBranchId) {
      setSourceStockOnHand(null);
      return;
    }
    setCheckingStock(true);
    api
      .get(`/inventory/stock?productId=${selectedProductId}&branchId=${sourceBranchId}`)
      .then((res) => {
        const stockData = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        if (Array.isArray(stockData) && stockData.length > 0) {
          const totalOnHand = stockData.reduce((acc: number, row: any) => acc + Number(row.onHand || 0), 0);
          setSourceStockOnHand(totalOnHand);
        } else {
          setSourceStockOnHand(0);
        }
      })
      .catch(() => setSourceStockOnHand(0))
      .finally(() => setCheckingStock(false));
  }, [selectedProductId, sourceBranchId]);

  const handleCreateTransfer = async () => {
    if (!sourceBranchId || !destBranchId) {
      toast.error('Please select both source and destination branches');
      return;
    }
    if (sourceBranchId === destBranchId) {
      toast.error('Source and destination branches cannot be the same');
      return;
    }
    if (!selectedProductId) {
      toast.error('Please select a product to transfer');
      return;
    }
    if (transferQty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/transfers', {
        sourceBranchId,
        destinationBranchId: destBranchId,
        notes,
        lines: [
          {
            productId: selectedProductId,
            requestedQuantity: Number(transferQty),
          },
        ],
      });
      toast.success('Stock transfer order created successfully');
      setCreateModalOpen(false);
      setSourceBranchId('');
      setDestBranchId('');
      setSelectedProductId('');
      setTransferQty(1);
      setNotes('');
      fetchTransfers();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED') => {
    try {
      await api.patch(`/inventory/transfers/${id}/status`, { status });
      toast.success(`Transfer status updated to ${status}`);
      fetchTransfers();
      if (selectedTransfer?.id === id) {
        setDetailModalOpen(false);
      }
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const columns: ColumnDef<StockTransfer>[] = [
    {
      accessorKey: 'transferNumber',
      header: 'Transfer Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
          {row.original.transferNumber}
        </span>
      ),
    },
    {
      accessorKey: 'sourceBranch',
      header: 'Source (From)',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <Building2 className="h-3.5 w-3.5 text-blue-500" />
          {row.original.sourceBranch?.name ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'destinationBranch',
      header: 'Destination (To)',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <Building2 className="h-3.5 w-3.5 text-emerald-500" />
          {row.original.destinationBranch?.name ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'lines',
      header: 'Items Count',
      cell: ({ row }) => {
        const lines = (row.original as any).lines ?? [];
        const totalQty = lines.reduce((acc: number, l: any) => acc + (l.requestedQuantity || 0), 0);
        return (
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {lines.length} SKU(s) ({totalQty} units)
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Transfer Status',
      cell: ({ row }) => {
        const st = row.original.status;
        return (
          <Badge
            className={`text-xs capitalize font-semibold ${
              st === 'RECEIVED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : st === 'IN_TRANSIT'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                : st === 'APPROVED'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {st}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created On',
      cell: ({ row }) => <span className="text-xs text-slate-500">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs rounded-lg"
              onClick={() => {
                setSelectedTransfer(t);
                setDetailModalOpen(true);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="Transfer stock between branches and warehouses"
        action={
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Transfers</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{transfers.length}</p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">In Transit</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {transfers.filter((t) => t.status === 'IN_TRANSIT').length}
          </p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Approved (Pending Dispatch)</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {transfers.filter((t) => t.status === 'APPROVED').length}
          </p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed & Received</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {transfers.filter((t) => t.status === 'RECEIVED').length}
          </p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={transfers}
        loading={loading}
        page={page}
        pageSize={limit}
        totalRows={total}
        totalPages={totalPages}
        onPageChange={goToPage}
        onPageSizeChange={(newSize) => {
          setLimit(newSize);
          reset();
        }}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          reset();
        }}
        searchPlaceholder="Search by transfer ref, notes..."
        toolbarActions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Origin Branch Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">From:</span>
              <Select
                value={sourceBranchFilter}
                onValueChange={(val) => {
                  setSourceBranchFilter(val);
                  reset();
                }}
              >
                <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue placeholder="All Origins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Origins</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination Branch Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">To:</span>
              <Select
                value={destBranchFilter}
                onValueChange={(val) => {
                  setDestBranchFilter(val);
                  reset();
                }}
              >
                <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue placeholder="All Targets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  reset();
                }}
              >
                <SelectTrigger className="h-9 w-32 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filter Button */}
            {(search || statusFilter !== 'all' || sourceBranchFilter !== 'all' || destBranchFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setSourceBranchFilter('all');
                  setDestBranchFilter('all');
                  reset();
                }}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 rounded-lg"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        }
        emptyMessage="No stock transfers found matching filters"
      />

      {/* --- CREATE TRANSFER MODAL --- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Create Inter-Branch Stock Transfer
            </DialogTitle>
            <DialogDescription>
              Select source and target branches in Qatar and choose items to dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Source Branch (From) *</Label>
                <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Origin Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Branch (To) *</Label>
                <Select value={destBranchId} onValueChange={setDestBranchId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Destination Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.id !== sourceBranchId)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Product *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Choose inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-slate-400 ml-2 font-mono">({p.sku})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live On-hand preview badge */}
            {selectedProductId && sourceBranchId && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Boxes className="h-3.5 w-3.5 text-blue-500" />
                  Origin Branch Available Stock:
                </span>
                {checkingStock ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                ) : (
                  <span
                    className={`font-bold font-mono ${
                      sourceStockOnHand !== null && sourceStockOnHand < transferQty
                        ? 'text-rose-600'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {sourceStockOnHand ?? 0} units
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Transfer Quantity *</Label>
                {sourceStockOnHand !== null && transferQty > sourceStockOnHand && (
                  <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Exceeds available stock
                  </span>
                )}
              </div>
              <Input
                type="number"
                min={1}
                value={transferQty}
                onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="rounded-lg text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Movement Remarks / Reason</Label>
              <Input
                placeholder="e.g. Replenishing high demand stock for weekend promotion"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-lg text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Transfer Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MANAGE TRANSFER MODAL --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Transfer #{selectedTransfer?.transferNumber}</span>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedTransfer?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500">From Branch</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedTransfer?.sourceBranch?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">To Branch</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedTransfer?.destinationBranch?.name}
                </p>
              </div>
            </div>

            {selectedTransfer?.notes && (
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900">
                <span className="font-semibold">Notes:</span> {selectedTransfer.notes}
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transferred Items</p>
              <div className="space-y-1.5 border rounded-lg p-2.5">
                {(selectedTransfer?.lines || []).map((line: any) => (
                  <div key={line.id} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{line.product?.name ?? 'Item'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{line.product?.sku}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {line.requestedQuantity} units
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Transition Action Buttons */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Progression</p>
              <div className="flex flex-wrap gap-2">
                {selectedTransfer?.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                    onClick={() => handleUpdateStatus(selectedTransfer.id, 'APPROVED')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve Transfer
                  </Button>
                )}
                {selectedTransfer?.status === 'APPROVED' && (
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs"
                    onClick={() => handleUpdateStatus(selectedTransfer.id, 'IN_TRANSIT')}
                  >
                    <Truck className="h-3.5 w-3.5 mr-1" />
                    Dispatch / Mark In-Transit
                  </Button>
                )}
                {selectedTransfer?.status === 'IN_TRANSIT' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                    onClick={() => handleUpdateStatus(selectedTransfer.id, 'RECEIVED')}
                  >
                    <PackageCheck className="h-3.5 w-3.5 mr-1" />
                    Confirm Delivery & Receive Stock
                  </Button>
                )}
                {selectedTransfer?.status !== 'RECEIVED' && selectedTransfer?.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                    onClick={() => handleUpdateStatus(selectedTransfer.id, 'CANCELLED')}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancel Transfer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
