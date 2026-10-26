'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Truck,
  CheckCircle2,
  PackageCheck,
  Building2,
  Loader2,
  Eye,
  Calendar,
  Trash2,
  DollarSign,
  RotateCcw,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseOrder, Supplier, Branch, Product } from '@/types';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/hooks/use-pagination';

interface OrderLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  // New PO Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLineItem[]>([]);

  // Item selector inside modal
  const [productSearch, setProductSearch] = useState('');
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null);
  const [lineQty, setLineQty] = useState(10);
  const [lineCost, setLineCost] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (branchFilter !== 'all') params.branchId = branchFilter;
      if (supplierFilter !== 'all') params.supplierId = supplierFilter;

      const res = await api.get('/purchasing/orders', params);
      const resData = (res.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setOrders(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, branchFilter, supplierFilter]);

  const fetchAuxData = async () => {
    try {
      const [sr, br, pr] = await Promise.all([
        api.get('/purchasing/suppliers'),
        api.get('/branches'),
        api.get('/products?limit=150'),
      ]);
      const sList = (sr.data as any)?.data?.data ?? (sr.data as any)?.data ?? [];
      const bList = (br.data as any)?.data?.data ?? (br.data as any)?.data ?? [];
      const pList = (pr.data as any)?.data?.data ?? (pr.data as any)?.data ?? [];

      setSuppliers(Array.isArray(sList) ? sList : []);
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
    fetchOrders();
  }, [fetchOrders]);

  const handleAddLine = () => {
    if (!pickedProduct) {
      toast.error('Choose a product to add');
      return;
    }
    if (lineQty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    setLines([
      ...lines,
      {
        productId: pickedProduct.id,
        productName: pickedProduct.name,
        sku: pickedProduct.sku,
        quantity: Number(lineQty),
        unitPrice: Number(lineCost),
      },
    ]);
    setPickedProduct(null);
    setLineQty(10);
  };

  const handleCreateOrder = async () => {
    if (!supplierId) {
      toast.error('Select a vendor / supplier');
      return;
    }
    if (!branchId) {
      toast.error('Select target receiving branch');
      return;
    }
    if (lines.length === 0) {
      toast.error('Add at least one product to the purchase order');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/purchasing/orders', {
        supplierId,
        branchId,
        expectedDate: expectedDate || undefined,
        notes,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });

      toast.success('Purchase Order created successfully');
      setModalOpen(false);
      setSupplierId('');
      setNotes('');
      setLines([]);
      fetchOrders();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePO = async (id: string) => {
    try {
      await api.patch(`/purchasing/orders/${id}/approve`);
      toast.success('Purchase Order approved for vendor procurement');
      fetchOrders();
      setDetailModalOpen(false);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const poTotalSum = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'poNumber',
      header: 'PO Ref #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {row.original.poNumber}
        </span>
      ),
    },
    {
      accessorKey: 'supplier',
      header: 'Vendor / Supplier',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800 dark:text-slate-200">
          <Truck className="h-3.5 w-3.5 text-blue-500" />
          {row.original.supplier?.name ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} />,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Order (QAR)',
      cell: ({ row }) => (
        <span className="font-bold text-sm text-slate-900 dark:text-white">
          {formatCurrency(Number(row.original.totalAmount))}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Issue Date',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs rounded-lg"
              onClick={() => {
                setSelectedOrder(order);
                setDetailModalOpen(true);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Manage
            </Button>
            {order.status === 'APPROVED' && (
              <Link href={`/inventory/receiving?poId=${order.id}`}>
                <Button size="sm" className="h-7 px-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                  <PackageCheck className="h-3 w-3 mr-1" />
                  Receive Goods
                </Button>
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Create purchase orders and track supplier deliveries"
        action={
          <div className="flex items-center gap-2">
            <Link href="/inventory/receiving">
              <Button variant="outline" className="rounded-xl shadow-xs">
                <PackageCheck className="h-4 w-4 mr-2 text-emerald-600" />
                Goods Receiving
              </Button>
            </Link>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={orders}
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
        searchPlaceholder="Search by PO #, supplier name, notes..."
        toolbarActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={branchFilter}
              onValueChange={(val) => {
                setBranchFilter(val);
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
              value={supplierFilter}
              onValueChange={(val) => {
                setSupplierFilter(val);
                reset();
              }}
            >
              <SelectTrigger className="h-9 w-44 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
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
              <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {(search || branchFilter !== 'all' || supplierFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setBranchFilter('all');
                  setSupplierFilter('all');
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
        emptyMessage="No purchase orders found matching filters"
      />

      {/* --- CREATE PURCHASE ORDER MODAL --- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Draft New Purchase Order
            </DialogTitle>
            <DialogDescription>
              Select vendor, target receiving branch, and specify procurement item lines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Authorized Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Receiving Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Choose branch" />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="rounded-lg text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Procurement Notes</Label>
                <Input
                  placeholder="e.g. FOB Qatar Port Delivery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Item Line Adder */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Add Items to Order
              </Label>

              {/* Instant Product Search Bar */}
              <div className="relative">
                <Input
                  placeholder="Filter product list by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-8 text-xs pl-8 rounded-lg"
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6 space-y-1">
                  <Label className="text-[11px]">Select Product</Label>
                  <Select
                    value={pickedProduct?.id || ''}
                    onValueChange={(val) => {
                      const p = products.find((item) => item.id === val);
                      setPickedProduct(p || null);
                      if (p?.costPrice) setLineCost(Number(p.costPrice));
                    }}
                  >
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

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[11px]">Order Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={lineQty}
                    onChange={(e) => setLineQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-xs rounded-lg font-semibold"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[11px]">Cost Price (QAR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={lineCost}
                    onChange={(e) => setLineCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-9 text-xs rounded-lg font-semibold"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddLine}
                className="w-full h-8 text-xs bg-slate-800 text-white rounded-lg"
              >
                + Add Item Line
              </Button>
            </div>

            {/* Lines Table */}
            {lines.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Order Items ({lines.length})</span>
                  <span className="text-blue-600 font-bold">Estimated Total: {formatCurrency(poTotalSum)}</span>
                </div>
                <div className="border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      <tr>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Unit Cost (QAR)</th>
                        <th className="p-2 text-right">Subtotal</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 font-medium">{l.productName}</td>
                          <td className="p-2 text-right">{l.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(l.unitPrice)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(l.quantity * l.unitPrice)}</td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-rose-500"
                              onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ORDER DETAIL & APPROVAL MODAL --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Order #{selectedOrder?.poNumber}</span>
              <StatusBadge status={(selectedOrder?.status || '').toLowerCase()} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
              <div>
                <p className="text-slate-400">Supplier:</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedOrder?.supplier?.name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Total Amount:</p>
                <p className="font-bold text-sm text-blue-600 mt-0.5">
                  {formatCurrency(Number(selectedOrder?.totalAmount || 0))}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              {selectedOrder?.status === 'DRAFT' && (
                <Button
                  size="sm"
                  onClick={() => handleApprovePO(selectedOrder.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approve Purchase Order
                </Button>
              )}
              {selectedOrder?.status === 'APPROVED' && (
                <Link href={`/inventory/receiving?poId=${selectedOrder.id}`}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs">
                    <PackageCheck className="h-3.5 w-3.5 mr-1" />
                    Receive Shipment
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
