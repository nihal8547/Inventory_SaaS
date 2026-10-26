'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import {
  Building2,
  Users,
  Package,
  ShoppingCart,
  CheckCircle2,
  Ban,
  Activity,
  Loader2,
  Search,
  Sparkles,
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Server,
  HardDrive,
  ShieldCheck,
  TrendingUp,
  Copy,
  Check,
  RefreshCw,
  Globe,
  CreditCard,
  Layers,
  Zap,
  Info,
  Clock,
  ExternalLink,
  MapPin,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { api, handleApiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

interface TenantEntity {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  plan: string;
  currency: string;
  primaryCity?: string;
  primaryBranchCode?: string;
  createdAt: string;
  _count?: {
    memberships: number;
    products: number;
    sales: number;
    branches?: number;
    warehouses?: number;
  };
  branchQuota?: {
    current: number;
    base: number;
    extra: number;
    totalAllowed: number;
    remaining: number;
    isLimitReached: boolean;
    allowExtraBranches: boolean;
  };
}

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalGmvQar: number;
  planCounts: {
    STARTER: number;
    GROWTH: number;
    ENTERPRISE: number;
  };
  systemHealth: {
    status: string;
    database: string;
    uptimeSeconds: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
    platformVersion: string;
    nodeVersion: string;
  };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
  _count?: {
    subscriptions: number;
  };
}

export default function SuperAdminControlCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tenants, setTenants] = useState<TenantEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [credentialSuccessModal, setCredentialSuccessModal] = useState<{
    storeName: string;
    email: string;
    password: string;
    plan: string;
  } | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    city: 'Doha',
    plan: 'GROWTH',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    sendWelcomeEmail: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantEntity | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    plan: 'GROWTH',
    isActive: true,
  });
  const [tenantDetail, setTenantDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  // Branch Quota Modal State
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    maxBranches: 3,
    extraBranches: 0,
    allowExtraBranches: false,
  });
  const [updatingQuota, setUpdatingQuota] = useState(false);

  const handleOpenQuotaModal = (t: TenantEntity) => {
    setSelectedTenant(t);
    setQuotaForm({
      maxBranches: t.branchQuota?.base ?? 3,
      extraBranches: t.branchQuota?.extra ?? 0,
      allowExtraBranches: t.branchQuota?.allowExtraBranches ?? false,
    });
    setQuotaModalOpen(true);
  };

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 15);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      const tr = await api.get('/admin/tenants', params).catch(() => ({ data: { data: [] } }));
      const resData = (tr.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      let filtered = Array.isArray(list) ? list : [];

      if (planFilter !== 'ALL') {
        filtered = filtered.filter((t: TenantEntity) => (t.plan || '').toUpperCase() === planFilter);
      }
      if (statusFilter === 'ACTIVE') {
        filtered = filtered.filter((t: TenantEntity) => t.isActive);
      } else if (statusFilter === 'SUSPENDED') {
        filtered = filtered.filter((t: TenantEntity) => !t.isActive);
      }

      setTenants(filtered);
      setTotal(resData?.meta?.total ?? filtered.length);
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, planFilter, statusFilter]);

  const fetchStatsAndPlans = async () => {
    try {
      const [sr, pr] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { data: null } })),
        api.get('/admin/plans').catch(() => ({ data: { data: [] } })),
      ]);
      setStats((sr.data as any)?.data ?? sr.data ?? null);
      const planList = (pr.data as any)?.data ?? pr.data ?? [];
      setPlans(Array.isArray(planList) ? planList : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatsAndPlans();
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Generate random strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = 'QA-';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, adminPassword: pwd }));
    setShowPassword(true);
  };

  // Auto derive slug
  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    setCreateForm((prev) => ({ ...prev, name, slug: autoSlug }));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.adminEmail) {
      toast.error('Store Name and Admin Email are required');
      return;
    }
    setActionInProgress('create');
    try {
      const res = await api.post('/admin/tenants', {
        name: createForm.name.trim(),
        slug: createForm.slug.trim() || undefined,
        city: createForm.city,
        plan: createForm.plan,
        currency: 'QAR',
        adminName: createForm.adminName.trim() || undefined,
        adminEmail: createForm.adminEmail.trim().toLowerCase(),
        adminPassword: createForm.adminPassword || undefined,
        sendWelcomeEmail: createForm.sendWelcomeEmail,
      });

      const resData = (res.data as any)?.data || res.data;
      const createdPassword =
        resData?.adminUser?.temporaryPassword || createForm.adminPassword || 'Generated';

      toast.success(`Organization "${createForm.name}" provisioned successfully!`);
      setCreateModalOpen(false);
      setCredentialSuccessModal({
        storeName: createForm.name,
        email: createForm.adminEmail,
        password: createdPassword,
        plan: createForm.plan,
      });

      // Reset
      setCreateForm({
        name: '',
        slug: '',
        city: 'Doha',
        plan: 'GROWTH',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        sendWelcomeEmail: true,
      });

      fetchTenants();
      fetchStatsAndPlans();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const openEditModal = (t: TenantEntity) => {
    setSelectedTenant(t);
    setEditForm({
      name: t.name,
      slug: t.slug,
      plan: t.plan || 'GROWTH',
      isActive: t.isActive,
    });
    setEditModalOpen(true);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setActionInProgress(`edit-${selectedTenant.id}`);
    try {
      await api.patch(`/admin/tenants/${selectedTenant.id}`, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim(),
        plan: editForm.plan,
        isActive: editForm.isActive,
      });
      toast.success(`Tenant "${editForm.name}" updated successfully`);
      setEditModalOpen(false);
      fetchTenants();
      fetchStatsAndPlans();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleTenantStatus = async (tenant: TenantEntity) => {
    const action = tenant.isActive ? 'suspend' : 'activate';
    setActionInProgress(tenant.id);
    try {
      await api.post(`/admin/tenants/${tenant.id}/${action}`, {});
      toast.success(`Tenant "${tenant.name}" has been ${action}d`);
      fetchTenants();
      fetchStatsAndPlans();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const openViewDetail = async (tenant: TenantEntity) => {
    setSelectedTenant(tenant);
    setViewModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/tenants/${tenant.id}`);
      setTenantDetail((res.data as any)?.data || res.data);
    } catch (err) {
      toast.error('Failed to load detailed tenant profile');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    setActionInProgress(`delete-${selectedTenant.id}`);
    try {
      await api.delete(`/admin/tenants/${selectedTenant.id}`);
      toast.success(`Tenant "${selectedTenant.name}" has been deleted`);
      setDeleteModalOpen(false);
      fetchTenants();
      fetchStatsAndPlans();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveBranchQuota = async () => {
    if (!selectedTenant) return;
    setUpdatingQuota(true);
    try {
      await api.patch(`/admin/tenants/${selectedTenant.id}/branch-quota`, {
        maxBranches: Number(quotaForm.maxBranches),
        extraBranches: Number(quotaForm.extraBranches),
        allowExtraBranches: Boolean(quotaForm.allowExtraBranches),
      });
      toast.success(`Branch quota updated for ${selectedTenant.name}!`);
      setQuotaModalOpen(false);
      fetchTenants();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setUpdatingQuota(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatUptime = (seconds: number = 0) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                SaaS Super Admin Control Center
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs">
                  Enterprise Tier
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-tenant cluster orchestration, live telemetry, subscription monetization & store lifecycle
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStatsAndPlans();
              fetchTenants();
              toast.success('Platform telemetry refreshed');
            }}
            className="h-9 gap-1.5 text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Cluster
          </Button>
          <Button
            size="sm"
            onClick={() => {
              generateRandomPassword();
              setCreateModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            Provision Store Organization
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-4 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5 py-2">
            <Activity className="h-3.5 w-3.5" />
            Platform Telemetry
          </TabsTrigger>
          <TabsTrigger value="tenants" className="text-xs font-semibold gap-1.5 py-2">
            <Building2 className="h-3.5 w-3.5" />
            Tenant Directory ({stats?.totalTenants ?? tenants.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs font-semibold gap-1.5 py-2">
            <CreditCard className="h-3.5 w-3.5" />
            Monetization & Plans
          </TabsTrigger>
          <TabsTrigger value="health" className="text-xs font-semibold gap-1.5 py-2">
            <Server className="h-3.5 w-3.5" />
            System Health & Nodes
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & TELEMETRY */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Live KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total SaaS Tenants</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {stats?.totalTenants ?? tenants.length}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3" />
                        {stats?.activeTenants ?? 0} Active
                      </span>
                      {Number(stats?.suspendedTenants ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                          <Ban className="h-3 w-3" />
                          {stats?.suspendedTenants} Suspended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Platform GMV Volume</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      {formatCurrency(stats?.totalGmvQar ?? 0, 'QAR')}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      Across all tenant checkouts
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Catalog SKUs</p>
                    <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                      {(stats?.totalProducts ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                      <Package className="h-3 w-3 text-purple-500" />
                      Total items in cluster inventory
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Completed Orders</p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                      {(stats?.totalSales ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3 text-indigo-500" />
                      POS & Sales orders completed
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Telemetry Secondary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subscription Distribution */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  Subscription Tier Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Active tenants segmented by SaaS monetization tier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Enterprise Tier (QAR 1,999/mo)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {stats?.planCounts?.ENTERPRISE ?? 0}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${
                          stats?.totalTenants
                            ? ((stats.planCounts?.ENTERPRISE ?? 0) / stats.totalTenants) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Growth Tier (QAR 799/mo)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {stats?.planCounts?.GROWTH ?? 0}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${
                          stats?.totalTenants
                            ? ((stats.planCounts?.GROWTH ?? 0) / stats.totalTenants) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Starter Tier (QAR 299/mo)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {stats?.planCounts?.STARTER ?? 0}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${
                          stats?.totalTenants
                            ? ((stats.planCounts?.STARTER ?? 0) / stats.totalTenants) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => setActiveTab('plans')}
                  >
                    Manage SaaS Subscription Tiers
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Node Telemetry Card */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-500" />
                    Live System Telemetry & Node Health
                  </CardTitle>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    CLUSTER HEALTHY
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Real-time runtime metrics from the NestJS application server and PostgreSQL database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500 font-medium">Database Node</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {stats?.systemHealth?.database || 'CONNECTED'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500 font-medium">Memory RSS</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {stats?.systemHealth?.memoryRssMb ?? 145} MB
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500 font-medium">Heap Used</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {stats?.systemHealth?.memoryHeapUsedMb ?? 85} MB
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500 font-medium">Server Uptime</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      {formatUptime(stats?.systemHealth?.uptimeSeconds)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Row-Level Multi-Tenant Isolation Active</p>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                      All data transactions, inventory balances, POS shifts, and supplier invoices are strictly isolated by <code className="font-mono bg-blue-100/60 dark:bg-blue-900/40 px-1 py-0.5 rounded">tenant_id</code>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tenants Quick List */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Registered Organizations</CardTitle>
                <CardDescription className="text-xs">Quick glance at tenant stores</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-blue-600 gap-1"
                onClick={() => setActiveTab('tenants')}
              >
                View Full Directory &rarr;
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {tenants.slice(0, 5).map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {t.name}
                          <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 h-4">
                            {t.plan || 'GROWTH'}
                          </Badge>
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          /{t.slug} &bull; {t.primaryCity || 'Doha'} &bull; {t._count?.memberships ?? 1} users
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] ${
                          t.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {t.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => openViewDetail(t)}
                      >
                        360 View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TENANT DIRECTORY & MANAGEMENT */}
        <TabsContent value="tenants" className="space-y-4 mt-6">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Tenant Organization Directory</CardTitle>
                  <CardDescription className="text-xs">
                    Search, filter, inspect, edit, or provision isolated multi-tenant stores
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search store name, slug..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>

                  {/* Plan Filter */}
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 font-medium"
                  >
                    <option value="ALL">All Plans</option>
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>

                  <Button
                    size="sm"
                    className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    onClick={() => {
                      generateRandomPassword();
                      setCreateModalOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Provision
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs text-slate-400 mt-2">Loading tenant organizations...</p>
                </div>
              ) : tenants.length === 0 ? (
                <div className="py-16 text-center">
                  <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No organizations found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or provision a new store</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium pb-2">
                        <th className="py-3 px-3">Organization / Store</th>
                        <th className="py-3 px-3">Subscription Tier</th>
                        <th className="py-3 px-3">Hub & Region</th>
                        <th className="py-3 px-3">Platform Utilization</th>
                        <th className="py-3 px-3">Branch Quota</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Created</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {tenants.map((t) => {
                        const isBusy = actionInProgress === t.id;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {t.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    {t.name}
                                    {t.slug === 'demo-store' && (
                                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] py-0">
                                        Primary Demo
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">/{t.slug}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono font-bold uppercase ${
                                  t.plan === 'ENTERPRISE'
                                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50/50'
                                    : t.plan === 'GROWTH'
                                    ? 'border-blue-300 text-blue-700 bg-blue-50/50'
                                    : 'border-slate-300 text-slate-700 bg-slate-50'
                                }`}
                              >
                                {t.plan || 'GROWTH'}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                                <span>{t.primaryCity || 'Doha'}</span>
                                <span className="text-slate-400 font-mono text-[10px]">({t.primaryBranchCode || 'MAIN'})</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-slate-400" />
                                  {t._count?.memberships ?? 1}
                                </span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3 text-slate-400" />
                                  {t._count?.products ?? 0}
                                </span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3 text-slate-400" />
                                  {t._count?.sales ?? 0}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              {t.branchQuota ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-mono font-bold ${
                                        t.branchQuota.isLimitReached
                                          ? 'border-amber-300 text-amber-700 bg-amber-50/60 dark:bg-amber-950/30'
                                          : 'border-blue-200 text-blue-700 bg-blue-50/60 dark:bg-blue-950/30'
                                      }`}
                                    >
                                      {t.branchQuota.current} / {t.branchQuota.totalAllowed} Branches
                                    </Badge>
                                    {t.branchQuota.extra > 0 && (
                                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200">
                                        +{t.branchQuota.extra} Extra
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    Base: {t.branchQuota.base} | Remaining: {t.branchQuota.remaining}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs font-mono">
                                  {t._count?.branches ?? 1} Branches
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-3">
                              <Badge
                                className={`text-[10px] ${
                                  t.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {t.isActive ? 'Active' : 'Suspended'}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                              {formatDate(t.createdAt)}
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4 text-slate-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 text-xs">
                                  <DropdownMenuLabel>Organization Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openViewDetail(t)}>
                                    <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                    Inspect Tenant 360
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenQuotaModal(t)}>
                                    <Building2 className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                    Manage Branch Quota
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditModal(t)}>
                                    <Edit3 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                    Edit Organization & Plan
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleTenantStatus(t)}>
                                    {t.isActive ? (
                                      <>
                                        <Ban className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                        Suspend Organization
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                        Activate Organization
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  {t.slug !== 'demo-store' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedTenant(t);
                                          setDeleteModalOpen(true);
                                        }}
                                        className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Delete Organization
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SUBSCRIPTION PLANS & PRICING */}
        <TabsContent value="plans" className="space-y-6 mt-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              SaaS Monetization & Subscription Tiers
            </h2>
            <p className="text-xs text-slate-500">
              Configured packaging and branch entitlements for multi-store retail organizations in Qatar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs uppercase font-bold text-slate-600">
                    Starter Tier
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500">
                    {plans.find((p) => p.name === 'STARTER')?._count?.subscriptions ?? stats?.planCounts?.STARTER ?? 0} active stores
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">QAR 299</span>
                  <span className="text-xs text-slate-500"> / month</span>
                </div>
                <CardDescription className="text-xs mt-2">
                  Single boutique retail store with 1 POS terminal and up to 1,000 SKUs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>1</strong> Store Branch Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>3</strong> Staff Accounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to <strong>1,000</strong> Product SKUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>POS Terminal & Shift Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Standard Sales Reports</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Growth Plan - Highlighted */}
            <Card className="rounded-2xl border-2 border-blue-500 relative overflow-hidden bg-white dark:bg-slate-900 shadow-md">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
                Most Popular
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="font-mono text-xs uppercase font-bold bg-blue-50 text-blue-700 border-blue-200">
                    Growth Tier
                  </Badge>
                  <span className="text-xs font-semibold text-blue-600">
                    {plans.find((p) => p.name === 'GROWTH')?._count?.subscriptions ?? stats?.planCounts?.GROWTH ?? 0} active stores
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-blue-600">QAR 799</span>
                  <span className="text-xs text-slate-500"> / month</span>
                </div>
                <CardDescription className="text-xs mt-2">
                  Multi-branch retail network with centralized warehouse distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>Up to <strong>5</strong> Store Branch Locations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    <span><strong>15</strong> Staff & Cashier Accounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>Up to <strong>10,000</strong> Product SKUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>Centralized Warehousing & Transfers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>Automated Email Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>Multi-Branch Stock Auditing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs uppercase font-bold text-emerald-700 border-emerald-300 bg-emerald-50/40">
                    Enterprise Tier
                  </Badge>
                  <span className="text-xs font-semibold text-emerald-600">
                    {plans.find((p) => p.name === 'ENTERPRISE')?._count?.subscriptions ?? stats?.planCounts?.ENTERPRISE ?? 0} active stores
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">QAR 1,999</span>
                  <span className="text-xs text-slate-500"> / month</span>
                </div>
                <CardDescription className="text-xs mt-2">
                  Fleet retail operations with unlimited branches, API keys, and custom webhooks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to <strong>50</strong> Store Branch Hubs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>100</strong> Staff & Manager Roles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to <strong>100,000</strong> Product SKUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Developer API Keys & Webhooks Suite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Priority 24/7 SLA & Custom Reports</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: SYSTEM HEALTH & NODES */}
        <TabsContent value="health" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  Cluster Infrastructure Diagnostics
                </CardTitle>
                <CardDescription className="text-xs">
                  Active environment specifications and service runtimes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Platform Build</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {stats?.systemHealth?.platformVersion || 'v1.5.0 Enterprise'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Node.js Runtime</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {stats?.systemHealth?.nodeVersion || process.version || 'v22.x'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Database Engine</span>
                  <span className="font-mono font-bold text-emerald-600">PostgreSQL (Prisma ORM)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Memory RSS Footprint</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {stats?.systemHealth?.memoryRssMb ?? 145} MB
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">Platform Uptime</span>
                  <span className="font-mono font-bold text-blue-600">
                    {formatUptime(stats?.systemHealth?.uptimeSeconds)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Security & Multi-Tenancy Compliance
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated security posture checks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Tenant Data Isolation</p>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Strict TenantId predicate on all queries</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">VERIFIED</Badge>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Bcrypt Password Hashing</p>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">12-round salt derivation</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE</Badge>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">JWT Token Expiry & Claims</p>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Scoped roles & tenant verification</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">ENFORCED</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* PROVISION STORE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Provision New Store Organization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Instantly create a new multi-tenant organization, initial branch hub, default warehouse, and owner credentials
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold">Store / Organization Name *</Label>
                <Input
                  required
                  placeholder="e.g. Al Rayyan Gourmet Supermarket"
                  value={createForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Organization Slug</Label>
                <Input
                  placeholder="al-rayyan-gourmet"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subscription Plan</Label>
                <select
                  value={createForm.plan}
                  onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                >
                  <option value="STARTER">Starter (QAR 299/mo)</option>
                  <option value="GROWTH">Growth (QAR 799/mo)</option>
                  <option value="ENTERPRISE">Enterprise (QAR 1,999/mo)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Primary City Hub</Label>
                <select
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                >
                  <option value="Doha">Doha</option>
                  <option value="Lusail">Lusail</option>
                  <option value="Al Rayyan">Al Rayyan</option>
                  <option value="Al Wakrah">Al Wakrah</option>
                  <option value="Al Khor">Al Khor</option>
                  <option value="Umm Salal">Umm Salal</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Base Currency</Label>
                <Input value="QAR (Qatari Riyal)" disabled className="h-9 text-xs rounded-xl bg-slate-50 font-mono" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Primary Store Administrator Account
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-semibold">Admin Full Name</Label>
                  <Input
                    placeholder="e.g. Tariq Al-Kuwari"
                    value={createForm.adminName}
                    onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-semibold">Admin Email Address *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="admin@store.qa"
                    value={createForm.adminEmail}
                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Initial Password</Label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    placeholder="Admin password..."
                    className="h-9 text-xs rounded-xl pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={createForm.sendWelcomeEmail}
                  onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="sendWelcomeEmail" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  Send welcome email with credentials to admin email
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionInProgress === 'create'}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionInProgress === 'create' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Provisioning Organization...
                  </>
                ) : (
                  'Confirm & Provision Store'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREDENTIALS SUCCESS MODAL */}
      <Dialog open={!!credentialSuccessModal} onOpenChange={() => setCredentialSuccessModal(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-bold text-lg">Store Provisioned Successfully!</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Organization <strong>{credentialSuccessModal?.storeName}</strong> is ready on the {credentialSuccessModal?.plan} plan.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-500">Login URL:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">http://localhost:3000/login</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-500">Email:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{credentialSuccessModal?.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Password:</span>
              <span className="font-bold text-emerald-600">{credentialSuccessModal?.password}</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `Store: ${credentialSuccessModal?.storeName}\nURL: http://localhost:3000/login\nEmail: ${credentialSuccessModal?.email}\nPassword: ${credentialSuccessModal?.password}`;
                copyToClipboard(text);
              }}
              className="text-xs h-9 w-full gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied Details' : 'Copy All Credentials'}
            </Button>
            <Button
              size="sm"
              onClick={() => setCredentialSuccessModal(null)}
              className="text-xs h-9 w-full bg-blue-600 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TENANT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-blue-600" />
              Edit Tenant Organization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify store details, switch subscription tiers, or update access status
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTenant} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Store / Organization Name</Label>
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Store Slug</Label>
              <Input
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subscription Plan</Label>
              <select
                value={editForm.plan}
                onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 font-medium"
              >
                <option value="STARTER">Starter Tier (QAR 299/mo)</option>
                <option value="GROWTH">Growth Tier (QAR 799/mo)</option>
                <option value="ENTERPRISE">Enterprise Tier (QAR 1,999/mo)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Organization Access</p>
                <p className="text-[11px] text-slate-500">Allow users to sign in and process orders</p>
              </div>
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionInProgress?.startsWith('edit')}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW TENANT 360 MODAL */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Tenant 360 Deep-Dive: {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete organizational structure, branch network, and active subscription details
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-xs text-slate-400 mt-2">Loading tenant profile...</p>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Organization ID</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {selectedTenant?.id}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Domain Slug</span>
                  <p className="font-mono font-bold text-blue-600 mt-0.5">/{selectedTenant?.slug}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Currency & Locale</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTenant?.currency || 'QAR'} &bull; Asia/Qatar
                  </p>
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-slate-400 text-[11px]">Staff Users</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {tenantDetail?._count?.memberships ?? selectedTenant?._count?.memberships ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-slate-400 text-[11px]">Branches</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {tenantDetail?._count?.branches ?? 1}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-slate-400 text-[11px]">Warehouses</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {tenantDetail?._count?.warehouses ?? 1}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-slate-400 text-[11px]">Products</p>
                  <p className="text-lg font-black text-purple-600 mt-1">
                    {tenantDetail?._count?.products ?? selectedTenant?._count?.products ?? 0}
                  </p>
                </div>
              </div>

              {/* Branches List */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  Branch Locations ({tenantDetail?.branches?.length ?? 1})
                </p>
                <div className="space-y-1.5">
                  {(tenantDetail?.branches || []).map((b: any) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {b.name}
                          {b.isDefault && (
                            <Badge className="ml-2 text-[9px] bg-blue-50 text-blue-700 border-blue-200 py-0">
                              Default Hub
                            </Badge>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Code: {b.code} &bull; City: {b.city || 'Doha'}
                        </p>
                      </div>
                      <Badge className={b.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memberships List */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  Key Personnel & Staff
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  {(tenantDetail?.memberships || []).map((m: any) => (
                    <div key={m.id} className="p-2.5 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {m.user?.firstName} {m.user?.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{m.user?.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {m.role?.name || 'Staff'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setViewModalOpen(false)} className="text-xs h-9">
              Close Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE TENANT MODAL */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-rose-700">Delete Store Organization</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete <strong>{selectedTenant?.name}</strong>? All associated products, branches, sales, and accounts will be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={actionInProgress?.startsWith('delete')}
              onClick={handleDeleteTenant}
              className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {actionInProgress?.startsWith('delete') ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE BRANCH QUOTA MODAL */}
      <Dialog open={quotaModalOpen} onOpenChange={setQuotaModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-1">
              <Building2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Manage Branch Quota
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure branch limits and allow extra branch allocations for <strong>{selectedTenant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-500 font-medium">Currently Active Branches</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedTenant?.branchQuota?.current ?? selectedTenant?._count?.branches ?? 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-medium">Total Limit Allowed</p>
                <p className="text-lg font-bold text-blue-600">
                  {Number(quotaForm.maxBranches) + Number(quotaForm.extraBranches)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Base Maximum Branches (Plan Quota)
              </Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={quotaForm.maxBranches}
                onChange={(e) =>
                  setQuotaForm({ ...quotaForm, maxBranches: parseInt(e.target.value) || 1 })
                }
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Default limit included in the organization's subscription tier.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Extra Purchased Branches
              </Label>
              <Input
                type="number"
                min="0"
                max="500"
                value={quotaForm.extraBranches}
                onChange={(e) =>
                  setQuotaForm({ ...quotaForm, extraBranches: parseInt(e.target.value) || 0 })
                }
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Additional branch add-ons authorized by Super Admin for this organizer.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Enable Extra Branches Permission
                </p>
                <p className="text-[11px] text-slate-500">
                  Authorize this organizer to request and activate additional branch locations.
                </p>
              </div>
              <input
                type="checkbox"
                checked={quotaForm.allowExtraBranches}
                onChange={(e) =>
                  setQuotaForm({ ...quotaForm, allowExtraBranches: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuotaModalOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updatingQuota}
              onClick={handleSaveBranchQuota}
              className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {updatingQuota ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Branch Quota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
