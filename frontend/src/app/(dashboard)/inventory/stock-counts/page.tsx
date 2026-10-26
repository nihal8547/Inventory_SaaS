'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import { ColumnDef } from '@tanstack/react-table';
import {
  ClipboardCheck,
  Plus,
  Building2,
  CheckCircle2,
  Loader2,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Branch, Product } from '@/types';
import { inventoryService } from '@/services/inventory.service';
import { api, handleApiError } from '@/lib/api';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface StockCountSession {
  id: string;
  countNumber: string;
  status: string;
  branchId: string;
  branch?: { name: string };
  warehouseId?: string;
  warehouse?: { name: string };
  createdAt: string;
  notes?: string;
  lines?: any[];
}

export default function StockCountsPage() {
  const [counts, setCounts] = useState<StockCountSession[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  // New Session Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [countType, setCountType] = useState('Full Store Count');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Audit Counting Sheet Modal
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<StockCountSession | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [physicalCount, setPhysicalCount] = useState(0);
  const [countItems, setCountItems] = useState<{ productId: string; name: string; sku: string; countedQuantity: number }[]>([]);

  const fetchStockCounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      if (selectedBranchId !== 'all') params.branchId = selectedBranchId;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await inventoryService.listStockCounts(params);
      const resData = (res.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setCounts(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedBranchId, statusFilter]);

  const fetchAuxData = async () => {
    try {
      const [br, pr] = await Promise.all([
        api.get('/branches'),
        api.get('/products?limit=100'),
      ]);
      const bList = (br.data as any)?.data?.data ?? (br.data as any)?.data ?? [];
      const pList = (pr.data as any)?.data?.data ?? (pr.data as any)?.data ?? [];

      setBranches(Array.isArray(bList) ? bList : []);
      setProducts(Array.isArray(pList) ? pList : []);

      if (bList.length > 0) setBranchId(bList[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchStockCounts();
  }, [fetchStockCounts]);

  const handleCreateSession = async () => {
    if (!branchId) {
      toast.error('Choose a store branch');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/stock-counts', {
        branchId,
        notes: notes || 'Physical stock audit',
      });
      toast.success('Stock count session started');
      setCreateModalOpen(false);
      setNotes('');
      fetchStockCounts();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCountLine = () => {
    if (!selectedProductId) {
      toast.error('Select an item to record');
      return;
    }
    const p = products.find((item) => item.id === selectedProductId);
    if (!p) return;

    setCountItems([
      ...countItems,
      {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        countedQuantity: Number(physicalCount),
      },
    ]);
    setSelectedProductId('');
    setPhysicalCount(0);
    toast.info(`Recorded ${p.name}`);
  };

  const handleSubmitAudit = async () => {
    if (!activeSession) return;
    if (countItems.length === 0) {
      toast.error('Record at least one counted item');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/inventory/stock-counts/${activeSession.id}/submit`, {
        lines: countItems.map((c) => ({
          productId: c.productId,
          countedQuantity: c.countedQuantity,
        })),
      });
      toast.success('Stock count submitted for manager reconciliation');
      setAuditModalOpen(false);
      setCountItems([]);
      fetchStockCounts();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReconciliation = async (sessionId: string) => {
    try {
      await api.post(`/inventory/stock-counts/${sessionId}/approve`, {});
      toast.success('Stock count approved and physical variance reconciled');
      fetchStockCounts();
      setAuditModalOpen(false);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const columns: ColumnDef<StockCountSession>[] = [
    {
      accessorKey: 'countNumber',
      header: 'Session #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {row.original.countNumber}
        </span>
      ),
    },
    {
      id: 'branch',
      header: 'Audit Location',
      cell: ({ row }) => {
        const b = (row.original as any).branch?.name ?? 'Main Store';
        return (
          <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800 dark:text-slate-200">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            {b}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const st = row.original.status;
        return (
          <Badge
            className={`text-xs font-semibold ${
              st === 'APPROVED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : st === 'SUBMITTED'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            }`}
          >
            {st}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Session Started',
      cell: ({ row }) => <span className="text-xs text-slate-500">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const session = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs rounded-lg"
            onClick={() => {
              setActiveSession(session);
              setAuditModalOpen(true);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            {session.status === 'APPROVED' ? 'View' : 'Count Sheet'}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Counts"
        description="Physical inventory audits and count reconciliations"
        action={
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Count Session
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={counts}
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
        searchPlaceholder="Search audit sessions by ref #, notes..."
        toolbarActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedBranchId}
              onValueChange={(val) => {
                setSelectedBranchId(val);
                reset();
              }}
            >
              <SelectTrigger className="h-9 w-40 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                reset();
              }}
            >
              <SelectTrigger className="h-9 w-44 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audit Statuses</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress / Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted for Review</SelectItem>
                <SelectItem value="APPROVED">Approved & Reconciled</SelectItem>
              </SelectContent>
            </Select>

            {(search || selectedBranchId !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedBranchId('all');
                  setStatusFilter('all');
                  reset();
                }}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Filters
              </Button>
            )}
          </div>
        }
        emptyMessage="No stock count audit sessions active"
      />

      {/* --- START SESSION MODAL --- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Start Physical Inventory Count
            </DialogTitle>
            <DialogDescription>
              Select branch location to freeze expected stock and begin physical tallying.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Store Branch *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select audit branch" />
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
              <Label className="text-xs font-semibold">Audit Type</Label>
              <Select value={countType} onValueChange={setCountType}>
                <SelectTrigger className="rounded-lg text-xs">
                  <SelectValue placeholder="Select count type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Store Count">Full Store Wall-to-Wall Audit</SelectItem>
                  <SelectItem value="Cycle Count">Cycle Count (Category Rotation)</SelectItem>
                  <SelectItem value="High Value / Luxury">High-Value / Luxury Protection Audit</SelectItem>
                  <SelectItem value="Spot Check">Fast Spot Check / Discrepancy Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Session Audit Notes</Label>
              <Input
                placeholder="e.g. End of Month Comprehensive Store Count"
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
              onClick={handleCreateSession}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Initialize Audit Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- COUNT AUDIT SHEET MODAL --- */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Session #{activeSession?.countNumber}</span>
              <Badge variant="outline" className="text-xs">
                {activeSession?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {activeSession?.status === 'IN_PROGRESS' || activeSession?.status === 'DRAFT' ? (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Record Physical Tally</p>

                {/* Instant Product Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search catalog item by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-8 text-xs pl-8 rounded-lg"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8 space-y-1">
                    <Label className="text-[11px]">Select Counted Item</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="h-9 rounded-lg text-xs">
                        <SelectValue placeholder="Catalog product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((p) => {
                            if (!productSearch.trim()) return true;
                            const q = productSearch.toLowerCase();
                            return (
                              p.name.toLowerCase().includes(q) ||
                              p.sku.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 50)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[11px]">Counted Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      value={physicalCount}
                      onChange={(e) => setPhysicalCount(parseInt(e.target.value) || 0)}
                      className="h-9 text-xs rounded-lg font-bold"
                    />
                  </div>
                </div>
                <Button onClick={handleAddCountLine} className="w-full h-8 text-xs bg-slate-900 text-white rounded-lg">
                  + Add Item to Count Sheet
                </Button>
              </div>
            ) : null}

            {/* Items Table */}
            {countItems.length > 0 && (
              <div className="space-y-2 border rounded-xl overflow-hidden p-3">
                <p className="text-xs font-semibold">Tally Records ({countItems.length} items)</p>
                <div className="space-y-1 text-xs">
                  {countItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b last:border-b-0">
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                        <span className="text-slate-400 font-mono ml-2">({item.sku})</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {item.countedQuantity} counted
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t flex justify-end gap-2">
              {activeSession?.status === 'IN_PROGRESS' || activeSession?.status === 'DRAFT' ? (
                <Button
                  onClick={handleSubmitAudit}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Submit Audit for Approval
                </Button>
              ) : null}
              {activeSession?.status === 'SUBMITTED' ? (
                <Button
                  onClick={() => handleApproveReconciliation(activeSession.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Approve & Reconcile Variance
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
