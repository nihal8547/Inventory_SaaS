'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Plus,
  CreditCard,
  ArrowRightLeft,
  FileText,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  Store,
  Users,
  ArrowUpRight,
  Clock,
  Wallet,
  Building2,
  RefreshCw,
  CheckCircle2,
  Truck,
  Box,
  ChevronRight,
  PieChart as PieChartIcon,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reportsService } from '@/services/reports.service';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  totalRevenue: number;
}

interface LowStockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branchName: string;
  onHand: number;
  minStock: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK';
}

interface RecentSale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone: string | null;
  cashierName: string;
  branchName: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface CategoryDist {
  name: string;
  productCount: number;
  stockValue: number;
  percentage: number;
}

interface PaymentStat {
  method: string;
  count: number;
  amount: number;
}

interface DashboardData {
  totalProducts: number;
  todaySalesCount: number;
  todayRevenue: number;
  lowStockCount: number;
  pendingTransfers: number;
  pendingPOs: number;
  salesTrend: { date: string; label: string; revenue: number; count: number }[];
  sales: {
    today: number;
    month: number;
    yesterday: number;
  };
  revenue: {
    today: number;
    yesterday: number;
    month: number;
    lastMonth: number;
    dayGrowthPercent: number;
    monthGrowthPercent: number;
  };
  financials: {
    todayAOV: number;
    todayTax: number;
    todayDiscount: number;
    monthAOV: number;
    monthTax: number;
    monthDiscount: number;
  };
  inventory: {
    totalCostValue: number;
    totalRetailValue: number;
    potentialProfit: number;
    profitMarginPercent: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoryDistribution: CategoryDist[];
    lowStockWatchlist: LowStockItem[];
  };
  operations: {
    pendingTransfers: number;
    pendingPOs: number;
    pendingGoodsReceipts: number;
    totalCustomers: number;
    activeBranches: number;
  };
  topSellingProducts: TopProduct[];
  recentSales: RecentSale[];
  paymentMethodStats: PaymentStat[];
}

const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'count'>('revenue');

  const { user, currentTenant, currentBranch } = useAuthStore();

  const fetchDashboardData = async (branchId?: string) => {
    try {
      if (data) setRefreshing(true);
      else setLoading(true);

      const params = branchId && branchId !== 'ALL' ? { branchId } : undefined;
      const res = await reportsService.getDashboard(params);
      const raw = (res.data as any)?.data ?? res.data;
      setData(raw);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    api.get('/branches')
      .then((res) => {
        const raw = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        setBranches(Array.isArray(raw) ? raw : []);
      })
      .catch(console.error);
  }, []);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ======================= HERO HEADER & ENTERPRISE CONTROLS ======================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 shadow-xl text-white p-6 md:p-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>{currentTenant?.name ?? 'Store'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {greeting}, {user?.firstName ?? 'Admin'}!
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Overview of your store sales, inventory levels, and branch operations.
            </p>
          </div>

          {/* Quick Actions & Branch Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Branch Filter Dropdown */}
            <div className="min-w-[200px]">
              <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v)}>
                <SelectTrigger className="h-10 bg-slate-900/80 border-slate-700 text-white rounded-xl text-xs font-medium focus:ring-blue-500">
                  <Building2 className="h-3.5 w-3.5 mr-2 text-indigo-400 shrink-0" />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                  <SelectItem value="ALL">All Branches (Consolidated)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchDashboardData(selectedBranch)}
              disabled={refreshing}
              className="h-10 w-10 bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-white rounded-xl shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-400' : 'text-slate-300'}`} />
            </Button>

            {/* Quick Launch Buttons */}
            <div className="flex items-center gap-2">
              <Link href="/pos">
                <Button className="h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/30 gap-2 text-xs">
                  <CreditCard className="h-4 w-4" />
                  <span>POS Terminal</span>
                </Button>
              </Link>

              <Link href="/inventory/entry">
                <Button variant="outline" className="h-10 px-3 bg-slate-900/60 hover:bg-slate-800 border-slate-700/80 text-white rounded-xl gap-1.5 text-xs">
                  <Layers className="h-3.5 w-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Stock Entry</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ======================= EXECUTIVE KPI STRIP (6 CARDS) ======================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Today's Revenue */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : formatCurrency(data?.todayRevenue ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {(data?.revenue?.dayGrowthPercent ?? 0) >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 font-medium">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +{data?.revenue?.dayGrowthPercent ?? 0}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 font-medium">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {data?.revenue?.dayGrowthPercent ?? 0}%
                </span>
              )}
              <span className="text-muted-foreground">vs yesterday</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-muted-foreground">
            {data?.todaySalesCount ?? 0} sales &bull; AOV {formatCurrency(data?.financials?.todayAOV ?? 0)}
          </div>
        </Card>

        {/* KPI 2: Month-to-Date Revenue */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Month Sales</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : formatCurrency(data?.revenue?.month ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-blue-600 font-medium">
                {data?.sales?.month ?? 0} orders
              </span>
              <span className="text-muted-foreground">this month</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-muted-foreground">
            MoM Run-rate {formatCurrency(data?.financials?.monthAOV ?? 0)} avg
          </div>
        </Card>

        {/* KPI 3: Stock Valuation */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Valuation</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : formatCurrency(data?.inventory?.totalRetailValue ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-emerald-600 font-medium">
                +{data?.inventory?.profitMarginPercent ?? 0}%
              </span>
              <span className="text-muted-foreground">unrealized margin</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-muted-foreground truncate">
            Cost: {formatCurrency(data?.inventory?.totalCostValue ?? 0)}
          </div>
        </Card>

        {/* KPI 4: Catalog & Stock Health */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catalog Health</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : `${data?.inventory?.inStockCount ?? 0} In-Stock`}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-amber-600 font-semibold">
                {data?.inventory?.lowStockCount ?? 0} low stock
              </span>
              <span className="text-muted-foreground">&bull; {data?.totalProducts ?? 0} SKUs</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-muted-foreground">
            {data?.inventory?.outOfStockCount === 0 ? '✓ Zero Out-of-Stock SKUs' : `${data?.inventory?.outOfStockCount} Depleted`}
          </div>
        </Card>

        {/* KPI 5: Pending Workflows */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workflows</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : (data?.operations?.pendingTransfers ?? 0) + (data?.operations?.pendingPOs ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-indigo-600 font-medium">
                {data?.operations?.pendingTransfers ?? 0} Transfers
              </span>
              <span className="text-muted-foreground">&bull; {data?.operations?.pendingPOs ?? 0} POs</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-muted-foreground">
            {data?.operations?.pendingGoodsReceipts ?? 0} Goods Receipts in-draft
          </div>
        </Card>

        {/* KPI 6: Active Outlets */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outlets & Network</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : `${data?.operations?.activeBranches ?? branches.length} Branches`}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-emerald-600 font-medium">All Online</span>
              <span className="text-muted-foreground">&bull; {data?.operations?.totalCustomers ?? 0} clients</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-muted-foreground">
            Qatar Localization (QAR)
          </div>
        </Card>
      </div>

      {/* ======================= ANALYTICS ROW: 14-DAY VELOCITY & CATEGORY DONUT ======================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Trend (8 Cols) */}
        <Card className="lg:col-span-8 rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>14-Day Sales Velocity & Volume Trend</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Daily order receipts, transaction volume, and QAR revenue flow
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTrendMetric('revenue')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    trendMetric === 'revenue'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Revenue (QAR)
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric('count')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    trendMetric === 'count'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Orders Volume
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.salesTrend ?? []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (trendMetric === 'revenue' ? formatCurrency(v) : v.toString())}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(v: number) => [
                      trendMetric === 'revenue' ? formatCurrency(v) : `${v} orders`,
                      trendMetric === 'revenue' ? 'Daily Revenue' : 'Completed Sales',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={trendMetric}
                    stroke={trendMetric === 'revenue' ? '#3b82f6' : '#8b5cf6'}
                    strokeWidth={2.5}
                    fill={trendMetric === 'revenue' ? 'url(#revenueGrad)' : 'url(#orderGrad)'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown (4 Cols) */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-6">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>Category Stock Distribution</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Portfolio valuation weight across primary lines
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.inventory?.categoryDistribution ?? []}
                    dataKey="stockValue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {(data?.inventory?.categoryDistribution ?? []).map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(v: number, name: string) => [formatCurrency(v), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Progress Bars */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {(data?.inventory?.categoryDistribution ?? []).slice(0, 4).map((cat, idx) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[170px]">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cat.percentage}%
                    </span>
                  </div>
                  <Progress value={cat.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 dark:border-slate-800/60 p-4">
            <Link href="/products" className="w-full">
              <Button variant="ghost" className="w-full text-xs text-blue-600 dark:text-blue-400 justify-between">
                <span>View Complete Stock Catalog</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* ======================= OPERATIONAL INTELLIGENCE ROW ======================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fast Movers / Top Selling (6 Cols) */}
        <Card className="lg:col-span-6 rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Fast-Moving Items (Top Sellers)</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Highest turnover products ranked by sales quantity and revenue
              </CardDescription>
            </div>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400 gap-1">
                <span>All Items</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.topSellingProducts ?? []).length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No sales recorded yet. Process POS transactions to see velocity.
                </div>
              ) : (
                (data?.topSellingProducts ?? []).map((p, idx) => (
                  <div key={p.productId} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {p.name}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          SKU: {p.sku}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.totalRevenue)}
                      </p>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                        {p.unitsSold} units sold
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Low Stock Watchlist (6 Cols) */}
        <Card className="lg:col-span-6 rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Urgent Stock Reorder Watchlist</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                SKUs below safety reorder threshold requiring replenishment
              </CardDescription>
            </div>
            <Link href="/inventory/stock">
              <Button variant="ghost" size="sm" className="text-xs text-amber-600 dark:text-amber-400 gap-1">
                <span>Stock Balances</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.inventory?.lowStockWatchlist ?? []).length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  All active items are healthy and above reorder thresholds!
                </div>
              ) : (
                (data?.inventory?.lowStockWatchlist ?? []).slice(0, 5).map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="space-y-0.5 max-w-[65%]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{item.sku}</span>
                        <span>&bull;</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{item.branchName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-rose-600">
                          {item.onHand} on hand
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Min: {item.minStock}
                        </p>
                      </div>
                      <Link href="/purchasing/orders">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-medium rounded-lg border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                          <Plus className="h-3 w-3 mr-1" />
                          PO
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================= LIVE TRANSACTIONS STREAM & PAYMENT METHODS ======================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Real-Time Sales Table (8 Cols) */}
        <Card className="lg:col-span-8 rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>Recent POS Sales & Invoices</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Real-time operational stream of orders across all connected counters
              </CardDescription>
            </div>
            <Link href="/sales">
              <Button variant="outline" size="sm" className="text-xs rounded-xl">
                <span>View All Sales</span>
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Amount (QAR)</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.recentSales ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No sales transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    (data?.recentSales ?? []).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                          {sale.saleNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                            {sale.customerName}
                          </p>
                          {sale.customerPhone && (
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {sale.customerPhone}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {sale.branchName}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wide">
                            {sale.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge
                            className={`text-[10px] ${
                              sale.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}
                          >
                            {sale.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown (4 Cols) */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-6">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Payment Tender Breakdown</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Settlements by Cash, POS Cards, and Bank Transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              {(data?.paymentMethodStats ?? []).map((p) => {
                const totalSettled = (data?.paymentMethodStats ?? []).reduce((acc, curr) => acc + curr.amount, 0);
                const pct = totalSettled > 0 ? Number(((p.amount / totalSettled) * 100).toFixed(1)) : 0;
                return (
                  <div key={p.method} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {p.method}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{p.count} transactions</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{pct}% of total</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 dark:border-slate-800/60 p-4">
            <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Audited Drawer Records
              </span>
              <Link href="/finance">
                <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Finance Hub &rarr;
                </span>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
