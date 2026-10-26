'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  CreditCard,
  Building2,
  Eye,
  DollarSign,
  TrendingUp,
  Receipt,
  XCircle,
  Printer,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CalendarDays,
  Package,
  Download,
  Search,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Sale, Branch, DailySalesRegisterResponse, MonthlySalesRegisterResponse } from '@/types';
import { salesService } from '@/services/sales.service';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { usePagination } from '@/hooks/use-pagination';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<string>('orders');

  // --- ORDERS TAB STATE ---
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  // Detail Modal
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Customer Request / Defective item');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // --- DAILY REGISTER TAB STATE ---
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(todayStr);
  const [dailyBranchId, setDailyBranchId] = useState<string>('all');
  const [dailyData, setDailyData] = useState<DailySalesRegisterResponse | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailyItemSearch, setDailyItemSearch] = useState('');

  // --- MONTHLY REGISTER TAB STATE ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [monthlyBranchId, setMonthlyBranchId] = useState<string>('all');
  const [monthlyData, setMonthlyData] = useState<MonthlySalesRegisterResponse | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // --- DATA FETCHING ---
  const fetchSales = useCallback(async () => {
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
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateFilter === 'today') {
        params.startDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      } else if (dateFilter === 'week') {
        params.startDate = new Date(Date.now() - 7 * 86400000).toISOString();
      } else if (dateFilter === 'month') {
        params.startDate = new Date(Date.now() - 30 * 86400000).toISOString();
      }
      const res = await salesService.list(params);
      const resData = (res.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setSales(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedBranchId, statusFilter, dateFilter]);

  const fetchDailyRegister = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const res = await salesService.getDailyRegister({
        date: selectedDailyDate,
        branchId: dailyBranchId !== 'all' ? dailyBranchId : undefined,
      });
      const data = (res.data as any)?.data ?? res.data;
      setDailyData(data);
    } catch (err: any) {
      toast.error('Failed to load daily sales register');
    } finally {
      setLoadingDaily(false);
    }
  }, [selectedDailyDate, dailyBranchId]);

  const fetchMonthlyRegister = useCallback(async () => {
    setLoadingMonthly(true);
    try {
      const res = await salesService.getMonthlyRegister({
        year: selectedYear,
        month: selectedMonth,
        branchId: monthlyBranchId !== 'all' ? monthlyBranchId : undefined,
      });
      const data = (res.data as any)?.data ?? res.data;
      setMonthlyData(data);
    } catch (err: any) {
      toast.error('Failed to load monthly sales register');
    } finally {
      setLoadingMonthly(false);
    }
  }, [selectedYear, selectedMonth, monthlyBranchId]);

  useEffect(() => {
    api.get('/branches')
      .then((res) => {
        const bList = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        setBranches(Array.isArray(bList) ? bList : []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchSales();
    } else if (activeTab === 'daily') {
      fetchDailyRegister();
    } else if (activeTab === 'monthly') {
      fetchMonthlyRegister();
    }
  }, [activeTab, fetchSales, fetchDailyRegister, fetchMonthlyRegister]);

  // Handlers for Returns
  const handleOpenReturnModal = (sale: any) => {
    setSelectedSale(sale);
    const initialQty: Record<string, number> = {};
    if (sale?.lines) {
      sale.lines.forEach((line: any) => {
        initialQty[line.productId] = 0;
      });
    }
    setReturnQuantities(initialQty);
    setReturnReason('Customer Request / Defective item');
    setReturnModalOpen(true);
  };

  const handleReturnQtyChange = (productId: string, val: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(val, maxQty));
    setReturnQuantities((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  const handleSubmitReturn = async () => {
    if (!selectedSale) return;

    const linesToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const originalLine = selectedSale.lines?.find((l: any) => l.productId === productId);
        return {
          productId,
          productVariantId: originalLine?.productVariantId,
          quantity,
        };
      });

    if (linesToReturn.length === 0) {
      toast.error('Please select at least 1 item quantity to return');
      return;
    }

    setSubmittingReturn(true);
    try {
      const res = await salesService.createReturn({
        saleId: selectedSale.id,
        reason: returnReason,
        lines: linesToReturn,
      });

      const resData = (res.data as any)?.data ?? res.data;
      const retNum = resData?.returnNumber || 'Processed';
      toast.success(`Return #${retNum} created successfully. Stock restored to inventory!`);
      setReturnModalOpen(false);
      setDetailModalOpen(false);
      fetchSales();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to process return';
      toast.error(message);
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Export Daily Items CSV
  const handleExportDailyCsv = () => {
    if (!dailyData || !dailyData.itemsSold.length) {
      toast.error('No item sales to export for this date');
      return;
    }
    const headers = ['Product Name', 'SKU', 'Category', 'Quantity Sold', 'Unit Price (QAR)', 'Total Revenue (QAR)', 'Contribution %'];
    const rows = dailyData.itemsSold.map((i) => [
      `"${i.productName.replace(/"/g, '""')}"`,
      `"${i.sku}"`,
      `"${i.category}"`,
      i.quantitySold,
      i.unitPrice,
      i.totalRevenue,
      `${i.contributionPercent}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daily_sales_items_${dailyData.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded Daily Items CSV report');
  };

  // Quick Drill-Down from Monthly table into Day
  const handleDrillDownToDay = (dateStr: string) => {
    setSelectedDailyDate(dateStr);
    setActiveTab('daily');
  };

  // Filter items in daily tab
  const filteredDailyItems = (dailyData?.itemsSold || []).filter((item) => {
    if (!dailyItemSearch.trim()) return true;
    const q = dailyItemSearch.toLowerCase();
    return (
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Financial aggregates for Orders tab
  const totalRevenue = sales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalOrders = total || sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / (sales.length || 1) : 0;
  const voidedCount = sales.filter((s) => (s.status as string) === 'CANCELLED' || (s.status as string) === 'REFUNDED').length;

  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'saleNumber',
      header: 'Receipt #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {row.original.saleNumber}
        </span>
      ),
    },
    {
      id: 'branch',
      header: 'Store Branch',
      cell: ({ row }) => {
        const bName = (row.original as any).branch?.name ?? 'Main Branch';
        return (
          <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800 dark:text-slate-200">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            {bName}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} />,
    },
    {
      accessorKey: 'total',
      header: 'Gross Total (QAR)',
      cell: ({ row }) => (
        <span className="font-bold text-sm text-slate-900 dark:text-white">
          {formatCurrency(Number(row.original.total))}
        </span>
      ),
    },
    {
      accessorKey: 'lines',
      header: 'Items Sold',
      cell: ({ row }) => {
        const count = row.original.lines?.length ?? 0;
        return <span className="text-xs text-slate-500 font-medium">{count} SKU(s)</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment Method',
      cell: ({ row }) => {
        const payments = (row.original as any).payments || [];
        const method = payments[0]?.method ?? 'CASH';
        return (
          <Badge variant="outline" className="text-[11px] uppercase font-mono">
            {method}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date & Time',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs rounded-lg"
          onClick={() => {
            setSelectedSale(row.original);
            setDetailModalOpen(true);
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Sales & Operations"
          description="View daily item counts, store transactions, and monthly registers"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-10 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="orders" className="text-xs px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold">
              <Receipt className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              Invoices Log
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
              Daily Sales & Items
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
              Monthly Breakdown
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL INVOICES & ORDERS LOG */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Revenue</p>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {formatCurrency(totalRevenue)}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Sales</p>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {total}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Avg Order Value</p>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {formatCurrency(avgOrderValue)}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cancelled / Void</p>
                  <h3 className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                    {voidedCount}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={sales}
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
            searchPlaceholder="Search receipt #, customer name, notes..."
            toolbarActions={
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={selectedBranchId}
                  onValueChange={(branchId) => {
                    setSelectedBranchId(branchId);
                    reset();
                  }}
                >
                  <SelectTrigger className="h-9 w-44 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
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
                  <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={dateFilter}
                  onValueChange={(val) => {
                    setDateFilter(val);
                    reset();
                  }}
                >
                  <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today's Sales</SelectItem>
                    <SelectItem value="week">Past 7 Days</SelectItem>
                    <SelectItem value="month">Past 30 Days</SelectItem>
                  </SelectContent>
                </Select>

                {(search || selectedBranchId !== 'all' || statusFilter !== 'all' || dateFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSelectedBranchId('all');
                      setStatusFilter('all');
                      setDateFilter('all');
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
            emptyMessage="No sales transactions found matching query filters"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY SALES & ITEMS REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Daily Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date:</Label>
                <Input
                  type="date"
                  value={selectedDailyDate}
                  onChange={(e) => setSelectedDailyDate(e.target.value)}
                  className="h-9 w-40 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant={selectedDailyDate === todayStr ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDailyDate(todayStr)}
                  className="h-8 text-xs rounded-lg px-2.5"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    setSelectedDailyDate(yesterday);
                  }}
                  className="h-8 text-xs rounded-lg px-2.5"
                >
                  Yesterday
                </Button>
              </div>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

              <Select value={dailyBranchId} onValueChange={setDailyBranchId}>
                <SelectTrigger className="h-9 w-44 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
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
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDailyCsv}
                disabled={!dailyData || !dailyData.itemsSold.length}
                className="h-9 gap-1.5 text-xs rounded-lg"
              >
                <Download className="h-3.5 w-3.5" />
                Export Items CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-9 gap-1.5 text-xs rounded-lg"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Register
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={fetchDailyRegister}
                disabled={loadingDaily}
                className="h-9 gap-1.5 text-xs rounded-lg"
              >
                {loadingDaily ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Refresh
              </Button>
            </div>
          </div>

          {/* Daily 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Gross Sales (QAR)</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatCurrency(dailyData?.summary?.grossRevenue || 0)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Subtotal: {formatCurrency(dailyData?.summary?.subtotal || 0)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Invoices / Receipts</p>
                  <h3 className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                    {dailyData?.summary?.invoicesCount || 0}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Completed Bills</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Items Sold Count</p>
                  <h3 className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {dailyData?.summary?.totalItemsSold || 0}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Total product units sold</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Package className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Avg Order Value</p>
                  <h3 className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                    {formatCurrency(dailyData?.summary?.avgOrderValue || 0)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Per customer ticket</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Badges */}
          {dailyData?.payments && dailyData.payments.length > 0 && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-4 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Settled Collections:
              </span>
              {dailyData.payments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{p.method}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(p.amount)}</span>
                  <span className="text-[11px] text-slate-400">({p.count} bills)</span>
                </div>
              ))}
            </div>
          )}

          {/* MAIN SECTION: Items Sold Breakdown Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  Items Sold Register (Product Breakdown)
                  <Badge variant="outline" className="text-xs font-semibold font-mono">
                    {filteredDailyItems.length} Products
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  List of each product sold on {dailyData?.dateFormatted || selectedDailyDate} with units count and revenue
                </p>
              </div>

              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter product name, SKU..."
                  value={dailyItemSearch}
                  onChange={(e) => setDailyItemSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Product Name & SKU</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center">Quantity Sold</th>
                      <th className="px-4 py-3 text-right">Total Revenue (QAR)</th>
                      <th className="px-4 py-3 text-right">Sales Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingDaily ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                          Loading daily items sold register...
                        </td>
                      </tr>
                    ) : filteredDailyItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          No items sold on this day matching the filters.
                        </td>
                      </tr>
                    ) : (
                      filteredDailyItems.map((item, idx) => (
                        <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{item.productName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              {item.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {item.quantitySold} Units
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {formatCurrency(item.totalRevenue)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-slate-600 dark:text-slate-300">
                            {item.contributionPercent}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LOWER SECTION: Transactions Log of the day & Hourly Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hourly breakdown */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                Hourly Sales Activity
              </h3>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                {dailyData?.hourlyBreakdown && dailyData.hourlyBreakdown.length > 0 ? (
                  dailyData.hourlyBreakdown.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800/80 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{h.hour}</p>
                        <p className="text-[11px] text-slate-400">{h.orders} order(s) • {h.items} unit(s)</p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(h.revenue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No hourly transactions recorded</p>
                )}
              </div>
            </div>

            {/* Individual Invoices of that day */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" />
                Completed Receipts on {dailyData?.dateFormatted || selectedDailyDate}
              </h3>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5">Time</th>
                        <th className="px-3 py-2.5">Receipt #</th>
                        <th className="px-3 py-2.5">Cashier</th>
                        <th className="px-3 py-2.5 text-center">Items</th>
                        <th className="px-3 py-2.5">Payment</th>
                        <th className="px-3 py-2.5 text-right">Total (QAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {!dailyData?.transactions || dailyData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400">
                            No receipts found on this date.
                          </td>
                        </tr>
                      ) : (
                        dailyData.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{tx.time}</td>
                            <td className="px-3 py-2.5 font-bold font-mono text-slate-900 dark:text-white">{tx.saleNumber}</td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{tx.cashier}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{tx.itemsCount}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {tx.paymentMethod}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                              {formatCurrency(tx.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONTHLY SALES BREAKDOWN & CALENDAR */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Month:</Label>
                <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="h-9 w-36 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { val: 1, name: 'January' },
                      { val: 2, name: 'February' },
                      { val: 3, name: 'March' },
                      { val: 4, name: 'April' },
                      { val: 5, name: 'May' },
                      { val: 6, name: 'June' },
                      { val: 7, name: 'July' },
                      { val: 8, name: 'August' },
                      { val: 9, name: 'September' },
                      { val: 10, name: 'October' },
                      { val: 11, name: 'November' },
                      { val: 12, name: 'December' },
                    ].map((m) => (
                      <SelectItem key={m.val} value={String(m.val)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Year:</Label>
                <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="h-9 w-28 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

              <Select value={monthlyBranchId} onValueChange={setMonthlyBranchId}>
                <SelectTrigger className="h-9 w-44 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
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
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={fetchMonthlyRegister}
              disabled={loadingMonthly}
              className="h-9 gap-1.5 text-xs rounded-lg"
            >
              {loadingMonthly ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Refresh Month
            </Button>
          </div>

          {/* Monthly KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Month Total Revenue</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatCurrency(monthlyData?.summary?.totalRevenue || 0)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {monthlyData?.monthName || 'Current Month'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Monthly Invoices</p>
                  <h3 className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                    {monthlyData?.summary?.totalInvoices || 0}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Billed Transactions</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Monthly Items Sold</p>
                  <h3 className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                    {monthlyData?.summary?.totalItemsSold || 0}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Total units moved</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Package className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Daily Average Sales</p>
                  <h3 className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(monthlyData?.summary?.avgDailyRevenue || 0)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {monthlyData?.summary?.activeSellingDays || 0} active selling days
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Peak Day Banner */}
          {monthlyData?.summary?.peakDay && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Peak Selling Day: {monthlyData.summary.peakDay.date} with {formatCurrency(monthlyData.summary.peakDay.revenue)} ({monthlyData.summary.peakDay.itemsSold} units sold)</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDrillDownToDay(monthlyData.summary.peakDay!.date)}
                className="h-7 text-xs rounded-lg gap-1 border-amber-300 dark:border-amber-700"
              >
                View Peak Day Items <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Day-by-Day Table */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-500" />
                Day-by-Day Monthly Register (Daily Breakdown)
              </h3>
              <p className="text-xs text-slate-500">
                Detailed daily collection and items sold for {monthlyData?.monthName || 'this month'}. Click "View Day Register" to inspect each day's exact products.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3 text-center">Bills Count</th>
                      <th className="px-4 py-3 text-center">Items Sold (Qty)</th>
                      <th className="px-4 py-3 text-right">Revenue (QAR)</th>
                      <th className="px-4 py-3">Top Product of the Day</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingMonthly ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                          Loading monthly register...
                        </td>
                      </tr>
                    ) : (monthlyData?.dailyBreakdown || []).map((day) => (
                      <tr
                        key={day.date}
                        className={
                          day.revenue > 0
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'
                            : 'opacity-40 hover:opacity-100 transition-opacity'
                        }
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                          {day.date}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-500">{day.dayOfWeek}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {day.invoicesCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {day.itemsSold > 0 ? (
                            <Badge variant="outline" className="text-xs font-bold text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30">
                              {day.itemsSold} Units
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(day.revenue)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                          {day.topItem}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={day.invoicesCount === 0}
                            onClick={() => handleDrillDownToDay(day.date)}
                            className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg gap-1"
                          >
                            View Day <ArrowRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LOWER MONTHLY SECTION: Top Products & Category Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Monthly Top Selling Products
              </h3>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Product</th>
                      <th className="px-3 py-2.5 text-center">Units Sold</th>
                      <th className="px-3 py-2.5 text-right">Revenue (QAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(monthlyData?.monthlyTopItems || []).slice(0, 8).map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                          {item.quantitySold}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Performance */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                Category Performance in Month
              </h3>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
                {(monthlyData?.categoryDistribution || []).map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(cat.revenue)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">{cat.itemsSold} units sold in this category</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT DETAILS MODAL */}
      {/* ========================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Receipt #{selectedSale?.saleNumber}</span>
              <StatusBadge status={(selectedSale?.status || '').toLowerCase()} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between text-slate-500">
                <span>Branch Location:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSale?.branch?.name || 'Main Branch'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Timestamp:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSale?.createdAt ? formatDateTime(selectedSale.createdAt) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cashier / Operator:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSale?.user?.firstName || 'System Cashier'}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                <span>Item</span>
                <span>Qty × Price = Subtotal</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {selectedSale?.lines?.map((line: any, idx: number) => (
                  <div key={idx} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {line.product?.name || `Item #${line.productId?.slice(0, 8)}`}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {line.product?.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(line.total || line.quantity * line.unitPrice))}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {line.quantity} × {formatCurrency(Number(line.unitPrice))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(Number(selectedSale?.subtotal || selectedSale?.total || 0))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (QAR):</span>
                <span>{formatCurrency(Number(selectedSale?.tax || 0))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span>{formatCurrency(Number(selectedSale?.discount || 0))}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Grand Total:</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(Number(selectedSale?.total || 0))}</span>
              </div>
            </div>

            {/* Payments list */}
            {selectedSale?.payments && selectedSale.payments.length > 0 && (
              <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">
                  Settled Payment Methods
                </p>
                {selectedSale.payments.map((pm: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs text-blue-900 dark:text-blue-200">
                    <span>{pm.method}</span>
                    <span className="font-mono font-bold">{formatCurrency(Number(pm.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </Button>
              {selectedSale?.status === 'COMPLETED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleOpenReturnModal(selectedSale);
                  }}
                  className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Process Return
                </Button>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SALES RETURN MODAL */}
      {/* ========================================================================= */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-rose-600" />
                Sales Return — Receipt #{selectedSale?.saleNumber}
              </span>
              <Badge variant="outline" className="text-xs font-mono text-rose-600 border-rose-200">
                Authoritative Stock Refund
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select items and quantities being returned. Stock balance will be automatically restored to branch inventory with an authoritative audit ledger entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Return
              </Label>
              <Input
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Defective item, customer changed mind, wrong item"
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 grid grid-cols-12 text-xs">
                <span className="col-span-6">Item / SKU</span>
                <span className="col-span-3 text-center">Qty to Return</span>
                <span className="col-span-3 text-right">Est. Refund</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {selectedSale?.lines?.map((line: any) => {
                  const currentQty = returnQuantities[line.productId] || 0;
                  const maxQty = line.quantity;
                  const estRefund = Math.round(currentQty * Number(line.unitPrice) * 100) / 100;

                  return (
                    <div key={line.id || line.productId} className="p-3 grid grid-cols-12 items-center text-xs gap-2">
                      <div className="col-span-6">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {line.product?.name || `Product #${line.productId.slice(0, 8)}`}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Sold: {line.quantity} × {formatCurrency(Number(line.unitPrice))}
                        </p>
                      </div>

                      <div className="col-span-3 flex items-center justify-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max={maxQty}
                          value={currentQty}
                          onChange={(e) =>
                            handleReturnQtyChange(line.productId, parseInt(e.target.value) || 0, maxQty)
                          }
                          className="h-8 w-16 text-center font-bold text-xs rounded-lg p-1"
                        />
                        <span className="text-[11px] text-slate-400">/ {maxQty}</span>
                      </div>

                      <div className="col-span-3 text-right">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(estRefund)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(() => {
              const totalEstRefund = Object.entries(returnQuantities).reduce((acc, [productId, qty]) => {
                const l = selectedSale?.lines?.find((lineItem: any) => lineItem.productId === productId);
                const price = Number(l?.unitPrice || 0);
                return acc + qty * price;
              }, 0);

              const itemsCount = Object.values(returnQuantities).reduce((acc, q) => acc + q, 0);

              return (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Total Items to Return: <span className="font-bold text-slate-900 dark:text-white">{itemsCount}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Authoritative unit prices will be enforced by the server.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Estimated Refund
                    </p>
                    <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(Math.round(totalEstRefund * 100) / 100)}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Backend Zero-Trust: The server verifies previous return history and prevents over-returns. Stock balances will be atomically incremented in real-time.
              </span>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturnModalOpen(false)}
              disabled={submittingReturn}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSubmitReturn}
              disabled={submittingReturn || Object.values(returnQuantities).every((q) => q === 0)}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submittingReturn ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing Return...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Confirm & Restore Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
