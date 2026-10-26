'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RotateCw,
  Printer,
  Download,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
  Layers,
  DollarSign,
  CircleDollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { salesService } from '@/services/sales.service';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export default function PosTodayLiveSummaryPage() {
  const router = useRouter();
  const { currentTenant, currentBranch } = useAuthStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchItem, setSearchItem] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'HOURLY' | 'TRANSACTIONS'>('ITEMS');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await api.get('/branches');
        const raw = res.data as any;
        const list = raw?.data ?? (Array.isArray(raw) ? raw : []);
        setBranches(list);
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    }
    loadBranches();
  }, []);

  // Fetch today's authoritative register
  const fetchTodayData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await salesService.getDailyRegister({
        date: todayStr,
        branchId: selectedBranchId || undefined,
      });
      const raw = res.data as any;
      const payload = raw?.data ?? raw;
      setData(payload);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error(err);
      if (!isSilent) toast.error('Failed to load today live sales data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [todayStr, selectedBranchId]);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  // Live auto-refresh polling (every 15 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTodayData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTodayData]);

  const formatCurrency = (val: number) => {
    return `${Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} QAR`;
  };

  // Filter sold items
  const filteredItems = useMemo(() => {
    if (!data?.itemsSold) return [];
    if (!searchItem.trim()) return data.itemsSold;
    const q = searchItem.toLowerCase();
    return data.itemsSold.filter(
      (i: any) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.category && i.category.toLowerCase().includes(q))
    );
  }, [data?.itemsSold, searchItem]);

  // Export CSV
  const handleExportCSV = () => {
    if (!data?.itemsSold || data.itemsSold.length === 0) {
      toast.info('No sold items to export');
      return;
    }
    const headers = ['SKU', 'Product Name', 'Category', 'Quantity Sold', 'Unit Price (QAR)', 'Total Revenue (QAR)', 'Sales Share %'];
    const rows = data.itemsSold.map((i: any) => [
      `"${i.sku}"`,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.category || 'General'}"`,
      i.quantitySold,
      Number(i.unitPrice).toFixed(2),
      Number(i.totalRevenue).toFixed(2),
      `${Number(i.salesSharePercentage).toFixed(1)}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POS_Today_Sales_Items_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Items report exported to CSV');
  };

  // Print Daily Z-Report Slip
  const handlePrintZReport = () => {
    if (!data) return;
    const existingIframe = document.getElementById('daily-z-print-frame');
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'daily-z-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const itemsSummaryRows = (data.itemsSold || [])
      .slice(0, 20)
      .map(
        (it: any) => `
        <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
          <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${it.name} (x${it.quantitySold})</span>
          <span style="font-family:monospace; font-weight:bold;">${Number(it.totalRevenue).toFixed(2)}</span>
        </div>`
      )
      .join('');

    const paymentsRows = (data.paymentMethods || [])
      .map(
        (pm: any) => `
        <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:2px;">
          <span>${pm.method} (${pm.count} txns):</span>
          <span style="font-family:monospace; font-weight:bold;">${Number(pm.amount).toFixed(2)} QAR</span>
        </div>`
      )
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Today Live Sales Z-Report</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: monospace; font-size: 11px; color: #000; padding: 6px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #666; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3 style="margin:0; font-size:14px;">INVENTORYOS POS</h3>
            <p style="margin:2px 0; font-size:10px;">DAILY REGISTER Z-REPORT</p>
            <p style="margin:2px 0; font-size:9px;">Date: ${todayStr} | Printed: ${new Date().toLocaleTimeString()}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Gross Sales:</span><span class="bold">${Number(data.summary?.grossRevenue || 0).toFixed(2)} QAR</span></div>
          <div class="row"><span>Total Invoices:</span><span class="bold">${data.summary?.invoicesCount || 0}</span></div>
          <div class="row"><span>Total Items Sold:</span><span class="bold">${data.summary?.itemsSoldCount || 0} Units</span></div>
          <div class="row"><span>Average Basket:</span><span class="bold">${Number(data.summary?.avgTicketSize || 0).toFixed(2)} QAR</span></div>
          <div class="divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:4px;">COLLECTIONS BREAKDOWN:</div>
          ${paymentsRows}
          <div class="divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:4px;">ITEMS SOLD BREAKDOWN:</div>
          ${itemsSummaryRows}
          <div class="divider"></div>
          <div class="center" style="font-size:9px; margin-top:8px;">*** END OF Z-REPORT ***</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Breadcrumb & Live Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link href="/pos">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>POS Terminal</span>
              </Button>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Live Sales Feed
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Today&apos;s Live Sales Summary & Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time authoritative register for{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </strong>
            . Auto-refreshing directly from the database.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Auto Refresh Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-9 text-xs rounded-xl gap-1.5 font-medium transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                : 'text-slate-500'
            }`}
            title="Auto-refresh every 15s"
          >
            <Radio className={`h-3.5 w-3.5 ${autoRefresh ? 'text-emerald-500 animate-pulse' : ''}`} />
            <span>{autoRefresh ? 'Live Polling: ON' : 'Live Polling: OFF'}</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTodayData(false)}
            disabled={loading}
            className="h-9 text-xs rounded-xl gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs rounded-xl gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Items CSV</span>
          </Button>

          {/* Print Z-Report */}
          <Button
            size="sm"
            onClick={handlePrintZReport}
            className="h-9 text-xs rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Z-Report</span>
          </Button>
        </div>
      </div>

      {/* 5 Real-Time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Today&apos;s Gross Sales
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CircleDollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {formatCurrency(data?.summary?.grossRevenue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total revenue collected today</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Invoices Processed
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {data?.summary?.invoicesCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Completed checkout receipts</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Items Sold
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              {data?.summary?.itemsSoldCount || 0}{' '}
              <span className="text-xs font-normal text-slate-400">Units</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cumulative product count</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Average Basket (AOV)
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {formatCurrency(data?.summary?.avgTicketSize || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Average sale per invoice</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Distinct Products
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {data?.itemsSold?.length || 0}{' '}
              <span className="text-xs font-normal text-slate-400">Lines</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unique catalog items</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Tenders Breakdown Bar */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-slate-50/50 dark:bg-slate-900/40">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payment Tender Settlements Today
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Last synced at {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(data?.paymentMethods || []).map((pm: any) => (
              <div
                key={pm.method}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {pm.method}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {pm.percentage}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{pm.count} transactions</p>
                </div>
                <div className="text-right font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                  {formatCurrency(pm.amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Register Container */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`text-xs font-medium px-4 py-2 rounded-xl transition-all ${
                activeTab === 'ITEMS'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Items Sold Today ({data?.itemsSold?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('HOURLY')}
              className={`text-xs font-medium px-4 py-2 rounded-xl transition-all ${
                activeTab === 'HOURLY'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              24-Hour Distribution
            </button>

            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`text-xs font-medium px-4 py-2 rounded-xl transition-all ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Live Invoices Log ({data?.transactions?.length || 0})
            </button>
          </div>

          {/* Search bar inside tab */}
          {activeTab === 'ITEMS' && (
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search items by name or SKU..."
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
          )}
        </div>

        {/* TAB 1: ITEMS SOLD TODAY REGISTER TABLE */}
        {activeTab === 'ITEMS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200/80 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Quantity Sold</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No sold items recorded for today yet.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item: any, idx: number) => (
                    <tr
                      key={item.productId || idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{item.sku}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {item.category || 'General'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono">
                          {item.quantitySold} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {Number(item.salesSharePercentage || 0).toFixed(1)}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${Math.min(100, item.salesSharePercentage || 0)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: HOURLY DISTRIBUTION */}
        {activeTab === 'HOURLY' && (
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Today&apos;s Hourly Sales Progression
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(data?.hourlyBreakdown || []).map((h: any) => (
                <div
                  key={h.hour}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    h.revenue > 0
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/40 opacity-60'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                    {h.hour}
                  </span>
                  <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 block mt-1">
                    {formatCurrency(h.revenue)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {h.invoices} {h.invoices === 1 ? 'sale' : 'sales'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE TRANSACTIONS STREAM */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200/80 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tender</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {(!data?.transactions || data.transactions.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No invoices recorded yet today.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((tx: any) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {tx.saleNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tx.time}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {tx.cashierName || 'Cashier'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{tx.branchName || 'Main Store'}</td>
                      <td className="py-3 px-4 text-slate-500">{tx.customerName || 'Walk-in'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {tx.paymentMethod}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(tx.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
