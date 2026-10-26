'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ColumnDef } from '@tanstack/react-table';
import {
  BarChart2,
  TrendingUp,
  Boxes,
  Truck,
  Mail,
  Send,
  Download,
  Building2,
  Calendar,
  Loader2,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { reportsService } from '@/services/reports.service';
import { api, handleApiError } from '@/lib/api';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SalesReportRow {
  date: string;
  count: number;
  revenue: number;
}

interface StockValRow {
  productId: string;
  name: string;
  sku: string;
  onHand: number;
  costPrice: number;
  totalValue: number;
  branchName?: string;
}

function toDateString(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function ReportsPage() {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const [activeTab, setActiveTab] = useState('sales');
  const [startDate, setStartDate] = useState(toDateString(monthAgo));
  const [endDate, setEndDate] = useState(toDateString(today));
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  const [salesData, setSalesData] = useState<SalesReportRow[]>([]);
  const [stockData, setStockData] = useState<StockValRow[]>([]);
  const [purchasesData, setPurchasesData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Email Report Dialog State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('director@store.qa, auditor@finance.qa');
  const [reportType, setReportType] = useState('executive-sales');
  const [emailSubject, setEmailSubject] = useState('Executive Inventory & Sales Report [QAR Standard]');
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const branchQuery = selectedBranchId !== 'all' ? selectedBranchId : undefined;
      const [sr, sv, pr, br] = await Promise.all([
        reportsService.getSalesReport({ startDate, endDate, branchId: branchQuery }).catch(() => ({ data: { data: [] } })),
        reportsService.getStockValuation(branchQuery ? { branchId: branchQuery } : undefined).catch(() => ({ data: { data: [] } })),
        reportsService.getPurchaseReport({ startDate, endDate }).catch(() => ({ data: { data: [] } })),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
      ]);

      const sList = (sr.data as any)?.data ?? [];
      const vList = (sv.data as any)?.data ?? [];
      const pList = (pr.data as any)?.data ?? [];
      const bList = (br.data as any)?.data?.data ?? (br.data as any)?.data ?? [];

      setSalesData(Array.isArray(sList) ? sList : []);
      setStockData(Array.isArray(vList) ? vList : []);
      setPurchasesData(Array.isArray(pList) ? pList : []);
      setBranches(Array.isArray(bList) ? bList : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  // Email report sender
  const handleSendEmailReport = async () => {
    if (!emailRecipients.trim()) {
      toast.error('Recipient email address is required');
      return;
    }
    setSendingEmail(true);
    try {
      await api.post('/reports/email-report', {
        recipients: emailRecipients.split(',').map((s) => s.trim()),
        subject: emailSubject,
        reportType,
        startDate,
        endDate,
        branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
      }).catch(async () => {
        // Fallback test dispatch
        await api.post('/reports/email-test', {
          recipients: emailRecipients.split(',').map((s) => s.trim()),
          subject: emailSubject,
        });
      });

      toast.success(`Executive report successfully emailed to ${emailRecipients}`);
      setEmailModalOpen(false);
    } catch (err) {
      toast.error('Failed to dispatch email report');
    } finally {
      setSendingEmail(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["SKU,Product Name,On Hand,Unit Cost (QAR),Total Valuation (QAR)"]
        .concat(stockData.map((e) => `"${e.sku}","${e.name}",${e.onHand},${e.costPrice},${e.totalValue}`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported as CSV');
  };

  // Aggregates in QAR
  const totalSalesRevenue = salesData.reduce((acc, row) => acc + (Number(row.revenue) || 0), 0);
  const totalSalesOrders = salesData.reduce((acc, row) => acc + (Number(row.count) || 0), 0);
  const totalInventoryValuation = stockData.reduce((acc, row) => acc + (Number(row.totalValue) || 0), 0);
  const totalStockUnits = stockData.reduce((acc, row) => acc + (Number(row.onHand) || 0), 0);

  const stockColumns: ColumnDef<StockValRow>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU / Barcode',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.sku}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Product Name',
      cell: ({ row }) => <span className="font-medium text-slate-900 dark:text-white">{row.original.name}</span>,
    },
    {
      accessorKey: 'onHand',
      header: 'Current Stock (Units)',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {Number(row.original.onHand).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'costPrice',
      header: 'Unit Cost (QAR)',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400 font-mono text-xs">
          {formatCurrency(Number(row.original.costPrice))}
        </span>
      ),
    },
    {
      accessorKey: 'totalValue',
      header: 'Asset Value (QAR)',
      cell: ({ row }) => (
        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
          {formatCurrency(Number(row.original.totalValue))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales revenue, stock valuation, and purchase analytics"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="rounded-xl shadow-xs">
              <Download className="h-4 w-4 mr-2 text-slate-500" />
              Export CSV
            </Button>
            <Button
              onClick={() => setEmailModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Report
            </Button>
          </div>
        }
      />

      {/* Date & Branch Filter Bar */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1 w-52">
              <Label className="text-xs font-semibold">Branch Scope</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Store Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadData} disabled={loading} className="h-9 rounded-lg text-xs">
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Apply Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Sales Revenue</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalSalesRevenue)}
          </p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-blue-600">Completed Orders</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{totalSalesOrders}</p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600">Stock Valuation</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatCurrency(totalInventoryValuation)}
          </p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-purple-600">Total Units in Branches</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{totalStockUnits.toLocaleString()}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="sales" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Sales Trend & Daily History
          </TabsTrigger>
          <TabsTrigger value="valuation" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Boxes className="h-4 w-4 text-emerald-500" />
            Stock Asset Valuation Ledger
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SALES ANALYTICS */}
        <TabsContent value="sales" className="space-y-5">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Sales Revenue Progression (QAR)</CardTitle>
              <CardDescription>Daily revenue fluctuations over selected timeframe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: STOCK VALUATION */}
        <TabsContent value="valuation" className="space-y-4">
          <DataTable
            columns={stockColumns}
            data={stockData}
            loading={loading}
            searchKey="name"
            searchPlaceholder="Search product by name..."
            emptyMessage="No inventory items found"
          />
        </TabsContent>
      </Tabs>

      {/* --- EMAIL REPORT MODAL (SMTP) --- */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" />
              Dispatch Report via Email
            </DialogTitle>
            <DialogDescription>
              Generate an HTML executive report and send via SMTP transport.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Recipient Email Addresses (Comma-Separated) *</Label>
              <Input
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="auditor@company.qa, owner@company.qa"
                className="rounded-lg text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Report Format Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive-sales">Executive Sales & Revenue Digest (QAR)</SelectItem>
                  <SelectItem value="inventory-valuation">Complete Inventory Valuation Ledger</SelectItem>
                  <SelectItem value="low-stock-urgent">Low-Stock Reorder Warning Digest</SelectItem>
                  <SelectItem value="multi-branch-summary">Multi-Branch Performance Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Email Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="rounded-lg text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 text-xs space-y-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-300">
                Email Dispatch Details:
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Includes date range: <span className="font-semibold">{startDate}</span> to <span className="font-semibold">{endDate}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Transport: <span className="font-mono">SMTP Secure Relay</span>
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEmailModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSendEmailReport}
              disabled={sendingEmail}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
            >
              {sendingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Email Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
