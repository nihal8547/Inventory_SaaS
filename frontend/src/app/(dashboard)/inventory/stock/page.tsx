'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  Building2,
  PackagePlus,
  ArrowRightLeft,
  Boxes,
  ShieldAlert,
  Search,
  Filter,
  RotateCcw
} from 'lucide-react';
import { StockBalance, Branch } from '@/types';
import { inventoryService } from '@/services/inventory.service';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/use-pagination';

export default function StockPage() {
  const [stock, setStock] = useState<StockBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      if (selectedBranchId !== 'all') {
        params.branchId = selectedBranchId;
      }
      const res = await inventoryService.getStock(params);
      const resData = (res.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setStock(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedBranchId]);

  useEffect(() => {
    api.get('/branches')
      .then((res) => {
        const bList = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        setBranches(Array.isArray(bList) ? bList : []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // KPIs
  const totalUnits = stock.reduce((acc, item) => acc + (item.onHand || 0), 0);
  const lowStockCount = stock.filter(
    (item) => (item.reorderLevel ?? 0) > 0 && item.onHand <= (item.reorderLevel ?? 0)
  ).length;
  const outOfStockCount = stock.filter((item) => item.onHand <= 0).length;

  const columns: ColumnDef<StockBalance>[] = [
    {
      accessorKey: 'product',
      header: 'Product Name',
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {row.original.product?.name ?? row.original.productId}
          </span>
          <p className="text-xs text-slate-400 font-mono">{row.original.product?.sku ?? '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'branch',
      header: 'Branch Location',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800 dark:text-slate-200">
          <Building2 className="h-3.5 w-3.5 text-blue-500" />
          {row.original.branch?.name ?? 'Main Store'}
        </div>
      ),
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse / Bin',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.original.warehouse?.name ?? 'Main Bin'}
        </span>
      ),
    },
    {
      accessorKey: 'onHand',
      header: 'On Hand (Units)',
      cell: ({ row }) => {
        const qty = row.original.onHand;
        const reorder = row.original.reorderLevel ?? 0;
        const isLow = reorder > 0 && qty <= reorder;
        const isZero = qty <= 0;
        return (
          <div className="flex items-center gap-1.5 font-bold text-sm">
            {isZero ? (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                Out of Stock (0)
              </Badge>
            ) : isLow ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {qty} (Low)
              </span>
            ) : (
              <span className="text-slate-900 dark:text-slate-100">{qty}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'reserved',
      header: 'Reserved / Held',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 font-medium">
          {row.original.reserved || 0}
        </span>
      ),
    },
    {
      id: 'available',
      header: 'Net Available',
      cell: ({ row }) => {
        const net = Math.max(0, (row.original.onHand || 0) - (row.original.reserved || 0));
        return (
          <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
            {net}
          </span>
        );
      },
    },
    {
      accessorKey: 'reorderLevel',
      header: 'Safety Threshold',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-slate-400">
          {row.original.reorderLevel ? `${row.original.reorderLevel} units` : 'Not set'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link href={`/inventory/transfers?product=${row.original.productId}`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400">
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Transfer
            </Button>
          </Link>
          <Link href={`/inventory/entry?product=${row.original.productId}`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300">
              Adjust
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const displayedStock = stock.filter((item) => {
    if (stockStatusFilter === 'in_stock') return item.onHand > 0;
    if (stockStatusFilter === 'low_stock')
      return (item.reorderLevel ?? 0) > 0 && item.onHand <= (item.reorderLevel ?? 0) && item.onHand > 0;
    if (stockStatusFilter === 'out_of_stock') return item.onHand <= 0;
    return true;
  });

  const hasFilters = search || selectedBranchId !== 'all' || stockStatusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* PageHeader and KPI Cards */}
      <PageHeader
        title="Inventory Stock"
        description="On-hand and available stock across all branches and warehouses"
        action={
          <div className="flex gap-2">
            <Link href="/inventory/entry">
              <Button variant="outline" size="sm" className="rounded-xl shadow-xs">
                <PackagePlus className="h-4 w-4 mr-1.5" />
                Stock Entry
              </Button>
            </Link>
            <Link href="/inventory/transfers">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
                <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                New Transfer
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Stock Units On-Hand</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalUnits}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Low Stock SKUs (Page)</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Out of Stock Breaches</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{outOfStockCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={displayedStock}
        loading={loading}
        page={page}
        pageSize={limit}
        totalRows={total}
        totalPages={totalPages}
        onPageChange={goToPage}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit);
          reset();
        }}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          reset();
        }}
        searchPlaceholder="Search product by name, SKU, description..."
        toolbarActions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Branch:</span>
              <Select
                value={selectedBranchId}
                onValueChange={(val) => {
                  setSelectedBranchId(val);
                  reset();
                }}
              >
                <SelectTrigger className="h-9 w-44 rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Store Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Level Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Level:</span>
              <Select
                value={stockStatusFilter}
                onValueChange={(val) => {
                  setStockStatusFilter(val);
                }}
              >
                <SelectTrigger className="h-9 w-36 rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Stock Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="in_stock">In Stock (&gt; 0)</SelectItem>
                  <SelectItem value="low_stock">Low Stock Alerts</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock (0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedBranchId('all');
                  setStockStatusFilter('all');
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
        emptyMessage="No stock records found matching your filters"
      />
    </div>
  );
}
