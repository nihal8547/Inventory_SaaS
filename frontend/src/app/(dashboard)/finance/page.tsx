'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  FileText,
  Landmark,
  Loader2,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';

interface ExpenseVoucher {
  id: string;
  voucherNumber: string;
  category: string;
  payee: string;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  notes?: string;
  branchId?: string;
  branch?: { id: string; name: string; code: string };
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'accounts'>('overview');
  const [expenses, setExpenses] = useState<ExpenseVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);

  // Server-side Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Modal State
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [category, setCategory] = useState('Store Rent & Lease');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [modalBranchId, setModalBranchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Financial aggregates from server
  const [summary, setSummary] = useState({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    accounts: [] as any[],
  });

  const fetchSummary = useCallback(async () => {
    try {
      const branchParam = selectedBranchFilter !== 'ALL' ? selectedBranchFilter : undefined;
      const res = await api.get('/finance/summary', branchParam ? { branchId: branchParam } : undefined);
      const data = (res.data as any)?.data ?? res.data;
      if (data) {
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load financial summary:', err);
    }
  }, [selectedBranchFilter]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (selectedBranchFilter !== 'ALL') params.branchId = selectedBranchFilter;
      if (selectedCategoryFilter !== 'ALL') params.category = selectedCategoryFilter;

      const res = await api.get('/finance/expenses', params);
      const resData = (res.data as any)?.data;
      const dataList = Array.isArray(resData) ? resData : (resData?.data ?? []);
      const meta = (res.data as any)?.data?.meta ?? (res.data as any)?.meta;

      setExpenses(dataList);
      if (meta) {
        setTotal(meta.total ?? dataList.length);
        setTotalPages(meta.totalPages ?? 1);
      }
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedBranchFilter, selectedCategoryFilter]);

  useEffect(() => {
    // Load branches
    api.get('/branches')
      .then((res) => {
        const bList = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        const arr = Array.isArray(bList) ? bList : [];
        setBranches(arr);
        if (arr.length > 0 && !modalBranchId) {
          setModalBranchId(arr[0].id);
        }
      })
      .catch(console.error);

    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddExpense = async () => {
    if (!payee.trim()) {
      toast.error('Payee or Vendor name is required');
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/finance/expenses', {
        category,
        payee: payee.trim(),
        amount: Number(amount),
        paymentMethod,
        branchId: modalBranchId || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success('Expense voucher successfully posted');
      setNewExpenseOpen(false);
      setPayee('');
      setAmount(500);
      setNotes('');
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, voucherNo: string) => {
    if (!confirm(`Are you sure you want to delete voucher ${voucherNo}?`)) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      toast.success(`Voucher ${voucherNo} deleted`);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Track operating expenses, profit & loss, and register accounts"
        action={
          <Button
            onClick={() => setNewExpenseOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        }
      />

      {/* KPI Cards Ribbon in QAR */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500">Gross Sales Inflow</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(summary.revenue)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">
                {formatCurrency(summary.cogs)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-rose-600">Operating Expenses</p>
              <p className="text-xl font-bold text-rose-600 mt-1">
                {formatCurrency(summary.expenses)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-600">Net Estimated Profit</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-5">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <FileText className="h-4 w-4 text-blue-500" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Receipt className="h-4 w-4 text-rose-500" />
            Expenses ({total})
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Landmark className="h-4 w-4 text-purple-500" />
            Accounts & Balances
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: P&L STATEMENT */}
        <TabsContent value="overview" className="space-y-5">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs max-w-3xl">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold">Store Profit & Loss Summary</CardTitle>
                  <CardDescription>Live consolidated performance ledger in QAR</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-blue-600 border-blue-200">
                  Currency: QAR
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Gross Sales Revenue:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(summary.revenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-slate-600 dark:text-slate-400">
                <span>Less: Cost of Goods Sold (COGS):</span>
                <span>- {formatCurrency(summary.cogs)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b font-bold text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 px-2 rounded">
                <span>GROSS OPERATING MARGIN:</span>
                <span>{formatCurrency(summary.grossProfit)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-rose-600 dark:text-rose-400">
                <span>Less: Operational Expenses:</span>
                <span>- {formatCurrency(summary.expenses)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t-2 border-slate-900 dark:border-slate-100 text-base font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 rounded">
                <span>NET STORE PROFIT (PRE-TAX):</span>
                <span>{formatCurrency(summary.netProfit)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: EXPENSES TABLE */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search voucher #, payee..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedCategoryFilter} onValueChange={(v) => { setSelectedCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="Store Rent & Lease">Store Rent & Lease</SelectItem>
                  <SelectItem value="Utilities & Power">Utilities & Power</SelectItem>
                  <SelectItem value="Packaging & Bags">Packaging & Bags</SelectItem>
                  <SelectItem value="Staff Allowances & Transport">Staff Allowances</SelectItem>
                  <SelectItem value="Marketing & Promotion">Marketing</SelectItem>
                  <SelectItem value="Maintenance & IT">Maintenance & IT</SelectItem>
                </SelectContent>
              </Select>

              {branches.length > 0 && (
                <Select value={selectedBranchFilter} onValueChange={(v) => { setSelectedBranchFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-44 rounded-xl">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                <span className="text-sm text-slate-500">Loading expenses...</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center p-12">
                <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No expense vouchers recorded yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Record Expense Voucher" above to post store operating costs</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/90 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Voucher #</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold">Payee / Vendor</TableHead>
                    <TableHead className="text-xs font-semibold">Branch</TableHead>
                    <TableHead className="text-xs font-semibold">Method</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Amount (QAR)</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-12">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <TableCell className="font-mono text-xs font-semibold">{exp.voucherNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{exp.category}</TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300">{exp.payee}</TableCell>
                      <TableCell className="text-xs text-slate-500">{exp.branch?.name || 'General'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {exp.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-rose-600 dark:text-rose-400">
                        {formatCurrency(exp.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(exp.expenseDate)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(exp.id, exp.voucherNumber)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-slate-500">
                <span>Showing page {page} of {totalPages} ({total} entries)</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="h-8 rounded-lg"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 rounded-lg"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: CHART OF ACCOUNTS */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.accounts && summary.accounts.length > 0 ? (
              summary.accounts.map((acc: any) => (
                <Card key={acc.code} className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                      {acc.type === 'BANK_ACCOUNT' ? <Landmark className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{acc.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">Account Code: {acc.code} • {acc.type}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-slate-500">Ledger Balance:</span>
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-slate-500">No accounts configured</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- RECORD EXPENSE MODAL --- */}
      <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-rose-500" />
              Record Operating Expense
            </DialogTitle>
            <DialogDescription>
              Post an operational expense voucher into the store ledger in QAR
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Expense Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Store Rent & Lease">Store Rent & Lease</SelectItem>
                  <SelectItem value="Utilities & Power">Utilities & Power (Kahramaa)</SelectItem>
                  <SelectItem value="Packaging & Bags">Packaging & Bags</SelectItem>
                  <SelectItem value="Staff Allowances & Transport">Staff Allowances & Transport</SelectItem>
                  <SelectItem value="Marketing & Promotion">Marketing & Promotion</SelectItem>
                  <SelectItem value="Maintenance & IT">Maintenance & IT</SelectItem>
                  <SelectItem value="Sundry Office Supplies">Sundry Office Supplies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Payee / Vendor Name *</Label>
              <Input
                placeholder="e.g. Qatar Real Estate Co., Kahramaa"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Amount (QAR) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1 font-mono font-bold rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash Drawer</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer (QNB)</SelectItem>
                    <SelectItem value="CARD">Corporate Card</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {branches.length > 0 && (
              <div>
                <Label className="text-xs font-semibold">Cost Center / Branch</Label>
                <Select value={modalBranchId} onValueChange={setModalBranchId}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Notes / Reference (Optional)</Label>
              <Input
                placeholder="e.g. Invoice #9982 for monthly power bill"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewExpenseOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Expense Voucher'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
