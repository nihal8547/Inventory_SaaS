'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Store, Building2, Warehouse, Users, Plus, Search, MapPin, Phone,
  Mail, CheckCircle2, ShieldCheck, Edit2, Trash2, ArrowUpRight,
  Eye, EyeOff, KeyRound, Sparkles, AlertCircle, RefreshCw, Layers,
  ExternalLink, Check, ShoppingBag, Box, Filter, Send, UserPlus,
  Shield, CheckCheck, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, handleApiError } from '@/lib/api';
import { toast } from 'sonner';

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  isDefault?: boolean;
}

interface MemberUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
}

interface MembershipBranchItem {
  membership?: {
    id: string;
    role?: {
      name: string;
    };
    user?: MemberUser;
  };
}

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  isDefault: boolean;
  isActive: boolean;
  warehouses?: WarehouseItem[];
  membershipBranches?: MembershipBranchItem[];
  _count?: {
    warehouses?: number;
    stockBalances?: number;
    sales?: number;
    membershipBranches?: number;
  };
  createdAt?: string;
}

interface BranchStaff {
  membershipId: string;
  branchId: string;
  user: MemberUser;
  role: {
    id: string;
    name: string;
    description?: string;
  };
  isActive: boolean;
}

interface BranchQuota {
  current: number;
  base: number;
  extra: number;
  totalAllowed: number;
  remaining: number;
  isLimitReached: boolean;
  allowExtraBranches: boolean;
}

const QATAR_CITIES = [
  'Doha',
  'Al Rayyan',
  'Al Wakrah',
  'Al Khor',
  'Lusail',
  'Umm Salal',
  'Al Daayen',
  'Al Shamal'
];

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [quota, setQuota] = useState<BranchQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Branch Modal (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editModeTab, setEditModeTab] = useState<'all' | 'password'>('all');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: 'Doha',
    address: '',
    phone: '',
    email: '',
    isDefault: false,
    managerName: '',
    managerEmail: '',
    managerPassword: '',
    roleName: 'Manager',
    sendCredentialsEmail: true,
  });

  // Staff Password Change Modal
  const [staffPasswordModalOpen, setStaffPasswordModalOpen] = useState(false);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<BranchStaff | null>(null);
  const [staffNewPassword, setStaffNewPassword] = useState('');
  const [staffShowNewPassword, setStaffShowNewPassword] = useState(false);
  const [staffSendEmailToggle, setStaffSendEmailToggle] = useState(true);
  const [savingStaffPassword, setSavingStaffPassword] = useState(false);

  // Warehouse Modal
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [savingWh, setSavingWh] = useState(false);
  const [whFormData, setWhFormData] = useState({
    name: '',
    code: '',
  });

  // Branch Access & Staff Modal
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedBranchForAccess, setSelectedBranchForAccess] = useState<Branch | null>(null);
  const [staffList, setStaffList] = useState<BranchStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [accessTab, setAccessTab] = useState<'list' | 'add'>('list');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [resendingStaffId, setResendingStaffId] = useState<string | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);

  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleName: 'Cashier',
    sendCredentialsEmail: true,
  });

  const fetchQuota = async () => {
    try {
      const res = await api.get('/branches/quota');
      const data = (res.data as any)?.data ?? res.data;
      if (data) {
        setQuota(data);
      }
    } catch (err) {
      console.warn('Failed to fetch branch quota:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/branches');
      const data = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
      setBranches(Array.isArray(data) ? data : []);
      fetchQuota();
    } catch (err) {
      toast.error('Failed to load branches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchQuota();
  }, []);

  const openAddModal = () => {
    if (quota?.isLimitReached) {
      toast.error(
        `Branch quota limit reached (${quota.current}/${quota.totalAllowed}). Contact Super Admin to authorize additional branches.`,
        { duration: 5000 }
      );
      return;
    }
    setEditingBranch(null);
    setEditModeTab('all');
    setFormData({
      name: '',
      code: '',
      city: 'Doha',
      address: '',
      phone: '',
      email: '',
      isDefault: branches.length === 0,
      managerName: '',
      managerEmail: '',
      managerPassword: '',
      roleName: 'Manager',
      sendCredentialsEmail: true,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setEditModeTab('all');
    const existingManager = b.membershipBranches?.[0]?.membership;
    setFormData({
      name: b.name,
      code: b.code,
      city: b.city || 'Doha',
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || '',
      isDefault: b.isDefault,
      managerName: existingManager?.user
        ? `${existingManager.user.firstName} ${existingManager.user.lastName}`
        : '',
      managerEmail: existingManager?.user?.email || '',
      managerPassword: '',
      roleName: existingManager?.role?.name || 'Manager',
      sendCredentialsEmail: true,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const openPasswordOnlyModal = (b: Branch) => {
    setEditingBranch(b);
    setEditModeTab('password');
    const existingManager = b.membershipBranches?.[0]?.membership;
    setFormData({
      name: b.name,
      code: b.code,
      city: b.city || 'Doha',
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || '',
      isDefault: b.isDefault,
      managerName: existingManager?.user
        ? `${existingManager.user.firstName} ${existingManager.user.lastName}`
        : '',
      managerEmail: existingManager?.user?.email || '',
      managerPassword: '',
      roleName: existingManager?.role?.name || 'Manager',
      sendCredentialsEmail: true,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const autoCode = !editingBranch && !prev.code
        ? 'BR-' + val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12)
        : prev.code;
      return { ...prev, name: val, code: autoCode };
    });
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Str8!';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, managerPassword: pass }));
    setShowPassword(true);
    toast.info('Secure password generated!');
  };

  const handleGenerateStaffPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Staff!';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffFormData((prev) => ({ ...prev, password: pass }));
    setShowStaffPassword(true);
    toast.info('Secure staff password generated!');
  };

  const openStaffPasswordModal = (staff: BranchStaff) => {
    setSelectedStaffForPassword(staff);
    setStaffNewPassword('');
    setStaffShowNewPassword(false);
    setStaffSendEmailToggle(true);
    setStaffPasswordModalOpen(true);
  };

  const handleGenerateStaffNewPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Staff!';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffNewPassword(pass);
    setStaffShowNewPassword(true);
    toast.info('Secure staff password generated!');
  };

  const handleSaveStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchForAccess || !selectedStaffForPassword) return;

    if (!staffNewPassword || staffNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSavingStaffPassword(true);
    try {
      const res = await api.post(`/branches/${selectedBranchForAccess.id}/access/resend`, {
        userId: selectedStaffForPassword.user.id,
        newPassword: staffNewPassword,
        sendEmail: staffSendEmailToggle,
      });
      const data = (res.data as any)?.data ?? res.data;
      const emailNote = data?.mailResult?.emailSent
        ? ' (Updated credentials dispatched via email!)'
        : '';
      toast.success(
        `Password changed for ${selectedStaffForPassword.user.email}! (New: ${data?.temporaryPassword || staffNewPassword})${emailNote}`,
        { duration: 6000 }
      );
      setStaffPasswordModalOpen(false);
      setSelectedStaffForPassword(null);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingStaffPassword(false);
    }
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Branch Name is required');
      return;
    }

    if (!editingBranch && formData.managerEmail && !formData.managerPassword) {
      toast.error('Please specify a password for the Manager Access account');
      return;
    }

    if (editingBranch && formData.managerPassword && formData.managerPassword.length < 6) {
      toast.error('Manager password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      if (editingBranch) {
        const res = await api.patch(`/branches/${editingBranch.id}`, formData);
        const data = (res.data as any)?.data ?? res.data;
        if (data?.managerUser?.passwordChanged) {
          const emailNote = data.managerUser.emailSent
            ? ' (Updated credentials dispatched via email!)'
            : '';
          toast.success(
            `Branch "${formData.name}" & manager password updated successfully!${emailNote}`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Branch "${formData.name}" updated successfully!`);
        }
      } else {
        const res = await api.post('/branches', formData);
        const data = (res.data as any)?.data ?? res.data;
        if (data?.managerUser) {
          const emailNote = data.managerUser.emailSent
            ? ' (Credentials dispatched via email!)'
            : '';
          toast.success(
            `Branch "${formData.name}" created with manager account (${data.managerUser.email})${emailNote}`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Branch "${formData.name}" created successfully!`);
        }
      }
      setModalOpen(false);
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePasswordOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    if (!formData.managerPassword || formData.managerPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        managerPassword: formData.managerPassword,
        sendCredentialsEmail: formData.sendCredentialsEmail,
      };
      if (formData.managerEmail) {
        payload.managerEmail = formData.managerEmail;
      }
      if (formData.managerName) {
        payload.managerName = formData.managerName;
      }

      const res = await api.patch(`/branches/${editingBranch.id}`, payload);
      const data = (res.data as any)?.data ?? res.data;
      const emailNote = data?.managerUser?.emailSent
        ? ' (Updated credentials dispatched via email!)'
        : '';
      toast.success(
        `Manager password updated successfully for ${formData.managerEmail || editingBranch.name}!${emailNote}`,
        { duration: 5000 }
      );
      setModalOpen(false);
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (b: Branch) => {
    if (b.isDefault) return;
    try {
      await api.patch(`/branches/${b.id}/set-default`);
      toast.success(`"${b.name}" is now set as the primary default branch!`);
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleAddWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !whFormData.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }
    setSavingWh(true);
    try {
      await api.post(`/branches/${selectedBranch.id}/warehouses`, whFormData);
      toast.success(`Warehouse "${whFormData.name}" added to ${selectedBranch.name}`);
      setWhModalOpen(false);
      setWhFormData({ name: '', code: '' });
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingWh(false);
    }
  };

  // Open Access Control Modal for a branch
  const openAccessModal = async (b: Branch) => {
    setSelectedBranchForAccess(b);
    setAccessTab('list');
    setStaffFormData({
      name: '',
      email: '',
      password: '',
      roleName: 'Cashier',
      sendCredentialsEmail: true,
    });
    setShowStaffPassword(false);
    setAccessModalOpen(true);
    await fetchBranchStaff(b.id);
  };

  const fetchBranchStaff = async (branchId: string) => {
    try {
      setLoadingStaff(true);
      const res = await api.get(`/branches/${branchId}/access`);
      const data = (res.data as any)?.data ?? res.data ?? [];
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load branch staff access');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchForAccess || !staffFormData.email.trim()) {
      toast.error('Staff email address is required');
      return;
    }

    setSavingStaff(true);
    try {
      const res = await api.post(`/branches/${selectedBranchForAccess.id}/access`, staffFormData);
      const data = (res.data as any)?.data ?? res.data;
      const emailNote = data?.mailResult?.emailSent
        ? ' Credentials dispatched via email!'
        : '';
      toast.success(`Access granted to ${staffFormData.email}!${emailNote}`);

      setStaffFormData({
        name: '',
        email: '',
        password: '',
        roleName: 'Cashier',
        sendCredentialsEmail: true,
      });
      setAccessTab('list');
      fetchBranchStaff(selectedBranchForAccess.id);
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingStaff(false);
    }
  };

  const handleRemoveStaff = async (userId: string, userName: string) => {
    if (!selectedBranchForAccess) return;
    if (!confirm(`Are you sure you want to revoke branch access for ${userName}?`)) return;

    try {
      await api.delete(`/branches/${selectedBranchForAccess.id}/access/${userId}`);
      toast.success(`Access revoked for ${userName}`);
      fetchBranchStaff(selectedBranchForAccess.id);
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleResendCredentials = async (staff: BranchStaff) => {
    if (!selectedBranchForAccess) return;
    setResendingStaffId(staff.user.id);
    try {
      const res = await api.post(`/branches/${selectedBranchForAccess.id}/access/resend`, {
        userId: staff.user.id,
      });
      const data = (res.data as any)?.data ?? res.data;
      toast.success(
        `Login credentials dispatched to ${staff.user.email} (Temporary Password: ${data?.temporaryPassword || 'sent'})`,
        { duration: 6000 }
      );
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setResendingStaffId(null);
    }
  };

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchSearch =
        search === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        (b.city && b.city.toLowerCase().includes(search.toLowerCase())) ||
        (b.address && b.address.toLowerCase().includes(search.toLowerCase()));

      const matchCity = cityFilter === 'ALL' || b.city === cityFilter;

      return matchSearch && matchCity;
    });
  }, [branches, search, cityFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalBranches = branches.length;
    const totalWarehouses = branches.reduce((acc, b) => acc + (b.warehouses?.length || 0), 0);
    const totalStaff = branches.reduce((acc, b) => acc + (b.membershipBranches?.length || 0), 0);
    const defaultBranch = branches.find((b) => b.isDefault);
    return {
      totalBranches,
      totalWarehouses,
      totalStaff,
      defaultBranchName: defaultBranch ? defaultBranch.name : 'None',
    };
  }, [branches]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>Store Operations</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Branches</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Store className="h-6 w-6 text-blue-600" />
            Branches & Locations
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage retail branches, warehouses, and staff access credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            id="btn-refresh-branches"
            variant="outline"
            size="sm"
            onClick={fetchBranches}
            disabled={loading}
            className="rounded-xl h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            id="btn-add-branch"
            onClick={openAddModal}
            disabled={quota?.isLimitReached}
            className={`rounded-xl h-9 shadow-sm ${
              quota?.isLimitReached
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={quota?.isLimitReached ? 'Branch quota limit reached. Contact Super Admin to authorize more branches.' : undefined}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add New Branch
          </Button>
        </div>
      </div>

      {/* Branch Quota Allocation Banner */}
      {quota && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            quota.isLimitReached
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  quota.isLimitReached
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Branch Quota: {quota.current} / {quota.totalAllowed} Branches Active
                  </h4>
                  {quota.extra > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-[10px] py-0 font-mono">
                      +{quota.extra} Authorized Add-ons
                    </Badge>
                  )}
                  {quota.isLimitReached ? (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[10px] py-0">
                      Quota Limit Reached
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 text-[10px] py-0">
                      {quota.remaining} Available
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {quota.isLimitReached
                    ? 'Your organization has reached its authorized branch limit. Contact Super Admin to expand your plan quota or allocate extra branches.'
                    : `Base plan includes ${quota.base} branches. You have room for ${quota.remaining} additional branch location(s).`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 min-w-[220px]">
              <div className="flex-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Quota Utilized</span>
                  <span>{Math.round((quota.current / Math.max(1, quota.totalAllowed)) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quota.isLimitReached ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((quota.current / Math.max(1, quota.totalAllowed)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Branches</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.totalBranches}
              </h3>
              <p className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Active store networks
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Store className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Storage Hubs</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.totalWarehouses}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1 font-medium">
                <Warehouse className="h-3 w-3" /> Total Warehouses
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Warehouse className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned Staff</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.totalStaff}
              </h3>
              <p className="text-[11px] text-indigo-600 mt-0.5 flex items-center gap-1 font-medium">
                <ShieldCheck className="h-3 w-3" /> Branch Managers & Cashiers
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Default Branch</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[150px]">
                {metrics.defaultBranchName}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3" /> System Primary Hub
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search, City Filter & View Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="input-branch-search"
              placeholder="Search by branch name, code, city, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>
          {search && (
            <Button
              id="btn-clear-search"
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              className="h-9 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> City:
          </span>
          <button
            id="btn-city-all"
            onClick={() => setCityFilter('ALL')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
              cityFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Cities
          </button>
          {QATAR_CITIES.map((c) => (
            <button
              key={c}
              id={`btn-city-${c.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setCityFilter(c)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
                cityFilter === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Branches List Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse p-6 space-y-4 rounded-xl border-slate-200 dark:border-slate-800">
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded" />
            </Card>
          ))}
        </div>
      ) : filteredBranches.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border-dashed border-slate-300 dark:border-slate-800">
          <Store className="h-12 w-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {search || cityFilter !== 'ALL' ? 'No matching branches found' : 'No Branches Configured'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {search || cityFilter !== 'ALL'
              ? 'Try modifying your search query or city filter to locate your store branch.'
              : 'Add your retail locations and warehouses so your POS, sales orders, and inventory can be mapped accurately.'}
          </p>
          <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Branch
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.map((b) => {
            const staffCount = b.membershipBranches?.length || 0;
            const primaryStaff = b.membershipBranches?.[0]?.membership;
            return (
              <Card
                key={b.id}
                className={`relative flex flex-col rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md ${
                  b.isDefault
                    ? 'border-blue-400/80 dark:border-blue-500/60 bg-gradient-to-b from-blue-50/20 to-transparent dark:from-blue-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Branch Top Status Ribbon */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {b.code}
                    </span>
                    {b.city && (
                      <Badge variant="outline" className="text-[10px] font-normal border-slate-200 dark:border-slate-700">
                        <MapPin className="h-3 w-3 mr-0.5 text-slate-400" />
                        {b.city}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {b.isDefault ? (
                      <Badge className="bg-blue-600 text-white text-[10px] font-semibold shadow-xs">
                        <Sparkles className="h-2.5 w-2.5 mr-1" /> Primary Hub
                      </Badge>
                    ) : (
                      <Button
                        id={`btn-set-default-${b.code.toLowerCase()}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(b)}
                        className="h-6 px-2 text-[10px] text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded"
                        title="Set this branch as system default"
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 flex-1 space-y-4">
                  {/* Branch Name & Address */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span className="truncate pr-2">{b.name}</span>
                      <div className="flex items-center gap-1 shrink-0 -mr-1.5">
                        <Button
                          id={`btn-pwd-${b.code.toLowerCase()}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => openPasswordOnlyModal(b)}
                          className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg flex items-center gap-1 font-semibold"
                          title="Change Manager Password Only"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span className="hidden sm:inline">Password</span>
                        </Button>
                        <Button
                          id={`btn-edit-${b.code.toLowerCase()}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(b)}
                          className="h-7 w-7 text-slate-400 hover:text-blue-600 rounded-lg"
                          title="Edit Branch Settings & Manager Credentials"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </h3>

                    <div className="mt-1 space-y-1 text-xs text-slate-500">
                      {b.address && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{b.address}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                        {b.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{b.phone}</span>
                          </div>
                        )}
                        {b.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{b.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manager & Staff Access Card (Enhanced with Manage Access button) */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                        Branch Access & Staff ({staffCount})
                      </span>
                      <Button
                        id={`btn-manage-access-${b.code.toLowerCase()}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => openAccessModal(b)}
                        className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded font-medium"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Manage Access
                      </Button>
                    </div>

                    {primaryStaff?.user ? (
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                            {primaryStaff.user.firstName} {primaryStaff.user.lastName}
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active Account" />
                          </p>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-indigo-50/50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                            {primaryStaff.role?.name || 'Staff'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Login: <span className="font-mono text-slate-700 dark:text-slate-300">{primaryStaff.user.email}</span>
                        </p>
                        {staffCount > 1 && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            + {staffCount - 1} more staff member(s) assigned
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>No credentials assigned yet</span>
                        <Button
                          id={`btn-set-login-${b.code.toLowerCase()}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => openAccessModal(b)}
                          className="h-6 px-1.5 text-[11px] text-blue-600 hover:text-blue-700 p-0 font-medium"
                        >
                          + Grant Access
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Warehouses / Storage Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Warehouse className="h-3.5 w-3.5 text-emerald-500" />
                        Storage Warehouses ({b.warehouses?.length || 0})
                      </span>
                      <Button
                        id={`btn-add-wh-${b.code.toLowerCase()}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBranch(b);
                          setWhFormData({
                            name: '',
                            code: `WH-${b.code}-${(b.warehouses?.length || 0) + 1}`,
                          });
                          setWhModalOpen(true);
                        }}
                        className="h-6 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded font-medium"
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add Warehouse
                      </Button>
                    </div>

                    {b.warehouses && b.warehouses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {b.warehouses.map((wh) => (
                          <div
                            key={wh.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">{wh.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({wh.code})</span>
                            {wh.isDefault && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Default Warehouse" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No storage warehouse attached.</p>
                    )}
                  </div>

                  {/* Stock & Operational Indicators */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block uppercase">Stock SKUs</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {b._count?.stockBalances ?? 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block uppercase">Sales Orders</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {b._count?.sales ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="px-5 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/inventory/stock?branchId=${b.id}`}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                  >
                    View Branch Inventory <ArrowUpRight className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAccessModal(b)}
                      className="h-7 text-xs rounded-lg text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <KeyRound className="h-3 w-3 mr-1" /> Access
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(b)}
                      className="h-7 text-xs rounded-lg"
                    >
                      Edit
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===================== ADD / EDIT BRANCH MODAL ===================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-blue-600" />
              {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Retail Branch'}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? 'Update store location details or change branch manager passwords and login credentials.'
                : 'Provide store location details, official phone/email, and configure Store Manager credentials with automatic email dispatch.'}
            </DialogDescription>
          </DialogHeader>

          {editingBranch && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 -mx-6 px-6 pt-1 mb-2">
              <button
                type="button"
                onClick={() => setEditModeTab('all')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                  editModeTab === 'all'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                Full Branch Details
              </button>
              <button
                type="button"
                onClick={() => setEditModeTab('password')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                  editModeTab === 'password'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Change Password Only
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Quick
                </span>
              </button>
            </div>
          )}

          {editingBranch && editModeTab === 'password' ? (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Store Manager Password Reset
                    </h4>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-indigo-600 font-semibold border border-indigo-200 dark:border-indigo-800">
                      {editingBranch.code}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Update login credentials for store branch <strong>{editingBranch.name}</strong>.
                  </p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Manager: <span className="text-slate-800 dark:text-slate-200 font-semibold">{formData.managerName || 'Store Manager'}</span> &bull; Login Email:{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{formData.managerEmail || 'manager@store.qa'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    New Password <span className="text-rose-500">*</span>
                  </Label>
                  <Button
                    id="btn-gen-pwd-only"
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Auto-Generate Secure Password
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="input-password-only"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new manager password (min 6 characters)"
                    value={formData.managerPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, managerPassword: e.target.value }))}
                    required
                    className="rounded-lg text-sm pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Minimum 6 characters. Only this manager account's password will be updated. Branch inventory and orders remain unaffected.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Send Updated Credentials via Email
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Dispatches the new password and sign-in link to {formData.managerEmail || 'the manager'}.
                    </p>
                  </div>
                </div>
                <Switch
                  id="switch-pwd-only-email"
                  checked={formData.sendCredentialsEmail}
                  onCheckedChange={(checked) => setFormData((p) => ({ ...p, sendCredentialsEmail: checked }))}
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  id="btn-cancel-pwd-only"
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  id="btn-submit-pwd-only"
                  type="button"
                  onClick={handleUpdatePasswordOnly}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-1.5" />
                      Update Password Only
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSaveBranch} className="space-y-4 py-2">
              {/* Section 1: Store Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-blue-500" />
                  Store Location Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Branch Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="modal-branch-name"
                      placeholder="e.g. Lusail Marina Branch"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Branch Code <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="modal-branch-code"
                      placeholder="e.g. BR-LUSAIL"
                      value={formData.code}
                      onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                      required
                      className="rounded-lg text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">City / Municipality</Label>
                    <select
                      id="modal-branch-city"
                      value={formData.city}
                      onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {QATAR_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Official Contact Phone</Label>
                    <Input
                      id="modal-branch-phone"
                      placeholder="+974 4455 6677"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      className="rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Street Address / Zone / Building</Label>
                  <Input
                    id="modal-branch-address"
                    placeholder="e.g. Marina Promenade, Building 42, Floor 1"
                    value={formData.address}
                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    className="rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Official Store Email</Label>
                  <Input
                    id="modal-branch-email"
                    type="email"
                    placeholder="store.lusail@inventory.qa"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Set as Default Primary Branch
                    </p>
                    <p className="text-[11px] text-slate-500">
                      New orders, terminal POS shifts, and default stock balance lookups will default to this branch.
                    </p>
                  </div>
                  <Switch
                    id="modal-branch-default-switch"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData((p) => ({ ...p, isDefault: checked }))}
                  />
                </div>
              </div>

              {/* Section 2: Manager Credentials & Mail Option */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                    Branch Manager Access Credentials
                  </h4>
                  <Button
                    id="btn-generate-password"
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Auto-Generate Password
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500 -mt-1">
                  Assign a manager account for this branch. The user can log in to manage store stock, oversee POS registers, and review daily sales.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Manager Full Name</Label>
                    <Input
                      id="modal-manager-name"
                      placeholder="e.g. Khalid Al-Kuwari"
                      value={formData.managerName}
                      onChange={(e) => setFormData((p) => ({ ...p, managerName: e.target.value }))}
                      className="rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Role</Label>
                    <select
                      id="modal-manager-role"
                      value={formData.roleName}
                      onChange={(e) => setFormData((p) => ({ ...p, roleName: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Manager">Store Manager</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Admin">Store Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Manager Login Username / Email</Label>
                    <Input
                      id="modal-manager-email"
                      type="email"
                      placeholder="manager.lusail@store.qa"
                      value={formData.managerEmail}
                      onChange={(e) => setFormData((p) => ({ ...p, managerEmail: e.target.value }))}
                      className="rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {editingBranch ? 'Change / Reset Password' : 'Login Password'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="modal-manager-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editingBranch ? 'Leave blank to keep current' : 'Min 6 characters'}
                        value={formData.managerPassword}
                        onChange={(e) => setFormData((p) => ({ ...p, managerPassword: e.target.value }))}
                        className="rounded-lg text-sm pr-9 font-mono"
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
                </div>

                {/* Credentials Email Option */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Send Login Credentials via Email
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Automatically dispatch username, password, role, and branch login portal link to the manager's email inbox.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="modal-branch-send-email-switch"
                    checked={formData.sendCredentialsEmail}
                    onCheckedChange={(checked) => setFormData((p) => ({ ...p, sendCredentialsEmail: checked }))}
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  id="btn-cancel-branch"
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  id="btn-submit-branch"
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : editingBranch ? (
                    'Update Branch'
                  ) : (
                    'Create Branch'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================== BRANCH ACCESS & STAFF CREDENTIALS MODAL ===================== */}
      <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              Branch Access & Credentials — {selectedBranchForAccess?.name}
            </DialogTitle>
            <DialogDescription>
              Grant, revoke, or resend login credentials and terminal permissions for staff assigned to {selectedBranchForAccess?.code}.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={accessTab} onValueChange={(v: any) => setAccessTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="list" className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5" />
                Assigned Staff ({staffList.length})
              </TabsTrigger>
              <TabsTrigger value="add" className="gap-2 text-xs">
                <UserPlus className="h-3.5 w-3.5" />
                Grant New Staff Access
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Assigned Staff List */}
            <TabsContent value="list" className="space-y-3">
              {loadingStaff ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs text-slate-500">Loading branch staff memberships...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Users className="h-10 w-10 mx-auto text-slate-400 mb-2 opacity-60" />
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Staff Assigned Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    There are no users linked to this branch. Click below to grant access to a manager or cashier.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setAccessTab('add')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Grant First Staff Access
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {staffList.map((st) => (
                    <div
                      key={st.user.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {st.user.firstName} {st.user.lastName}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40">
                            {st.role?.name || 'Staff'}
                          </Badge>
                          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active" />
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {st.user.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStaffPasswordModal(st)}
                          className="h-8 text-xs rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-indigo-200 hover:border-indigo-300"
                          title="Change password for this staff member"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Change Password
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resendingStaffId === st.user.id}
                          onClick={() => handleResendCredentials(st)}
                          className="h-8 text-xs rounded-lg text-slate-700 dark:text-slate-200 hover:text-indigo-600 border-slate-200 hover:border-indigo-300"
                          title="Generate a new password and email credentials directly"
                        >
                          {resendingStaffId === st.user.id ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                          )}
                          Resend Email
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStaff(st.user.id, `${st.user.firstName} ${st.user.lastName}`)}
                          className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          title="Revoke access from this branch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Grant / Add New Staff Access */}
            <TabsContent value="add" className="space-y-3">
              <form onSubmit={handleAssignStaff} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Staff Full Name</Label>
                    <Input
                      id="modal-staff-name"
                      placeholder="e.g. Tariq Al-Kuwari"
                      value={staffFormData.name}
                      onChange={(e) => setStaffFormData((p) => ({ ...p, name: e.target.value }))}
                      className="rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Role & Permissions</Label>
                    <select
                      id="modal-staff-role"
                      value={staffFormData.roleName}
                      onChange={(e) => setStaffFormData((p) => ({ ...p, roleName: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Cashier">Cashier (POS & Sales Registers)</option>
                      <option value="Manager">Store Manager (Full Branch Control)</option>
                      <option value="Supervisor">Store Supervisor</option>
                      <option value="Admin">Store Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Login Email Address <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="modal-staff-email"
                      type="email"
                      placeholder="tariq.pos@store.qa"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData((p) => ({ ...p, email: e.target.value }))}
                      required
                      className="rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Temporary Password</Label>
                      <button
                        type="button"
                        onClick={handleGenerateStaffPassword}
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                      >
                        <Sparkles className="h-2.5 w-2.5" /> Generate
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="modal-staff-password"
                        type={showStaffPassword ? 'text' : 'password'}
                        placeholder="Leave blank to use default 'Staff123!'"
                        value={staffFormData.password}
                        onChange={(e) => setStaffFormData((p) => ({ ...p, password: e.target.value }))}
                        className="rounded-lg text-sm pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showStaffPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Credentials Email Option */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Send Credentials Email to Staff Member
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Dispatches username, password, and portal link directly to this email address.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="modal-staff-send-email-switch"
                    checked={staffFormData.sendCredentialsEmail}
                    onCheckedChange={(checked) => setStaffFormData((p) => ({ ...p, sendCredentialsEmail: checked }))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAccessTab('list')}
                    className="rounded-xl text-xs"
                  >
                    Back to Staff List
                  </Button>
                  <Button
                    id="btn-submit-grant-access"
                    type="submit"
                    disabled={savingStaff}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs shadow-xs"
                  >
                    {savingStaff ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Granting Access...
                      </>
                    ) : (
                      <>
                        <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                        Grant Branch Access & Send Email
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ===================== ADD WAREHOUSE MODAL ===================== */}
      <Dialog open={whModalOpen} onOpenChange={setWhModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Warehouse className="h-5 w-5 text-emerald-600" />
              Add Warehouse Storage Hub
            </DialogTitle>
            <DialogDescription>
              Create an extra storage location or backroom for {selectedBranch?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddWarehouseSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Warehouse / Storage Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="modal-wh-name"
                placeholder="e.g. Backroom Cold Storage"
                value={whFormData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoCode = selectedBranch
                    ? `WH-${selectedBranch.code}-${val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8)}`
                    : '';
                  setWhFormData({ name: val, code: autoCode });
                }}
                required
                className="rounded-lg text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Warehouse Code</Label>
              <Input
                id="modal-wh-code"
                placeholder="e.g. WH-LUSAIL-COLD"
                value={whFormData.code}
                onChange={(e) => setWhFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="rounded-lg text-sm font-mono uppercase"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                id="btn-cancel-warehouse"
                type="button"
                variant="outline"
                onClick={() => setWhModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                id="btn-submit-warehouse"
                type="submit"
                disabled={savingWh}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
              >
                {savingWh ? 'Creating...' : 'Create Storage Warehouse'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== CHANGE STAFF PASSWORD DIALOG ===================== */}
      <Dialog open={staffPasswordModalOpen} onOpenChange={setStaffPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Change Staff Password
            </DialogTitle>
            <DialogDescription>
              Set a new login password for {selectedStaffForPassword?.user.firstName} {selectedStaffForPassword?.user.lastName} ({selectedStaffForPassword?.role?.name || 'Staff'}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStaffPassword} className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Member:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedStaffForPassword?.user.firstName} {selectedStaffForPassword?.user.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Login Email:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedStaffForPassword?.user.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {selectedBranchForAccess?.name} ({selectedBranchForAccess?.code})
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">New Password <span className="text-rose-500">*</span></Label>
                <Button
                  id="btn-gen-staff-pwd"
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateStaffNewPassword}
                  className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Auto-Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="input-staff-new-pwd"
                  type={staffShowNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min 6 characters)"
                  value={staffNewPassword}
                  onChange={(e) => setStaffNewPassword(e.target.value)}
                  required
                  className="rounded-lg text-sm pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setStaffShowNewPassword(!staffShowNewPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {staffShowNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Email New Password to Staff
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Send notification with new login credentials.
                  </p>
                </div>
              </div>
              <Switch
                id="switch-staff-email"
                checked={staffSendEmailToggle}
                onCheckedChange={setStaffSendEmailToggle}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                id="btn-cancel-staff-pwd"
                type="button"
                variant="outline"
                onClick={() => setStaffPasswordModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                id="btn-save-staff-pwd"
                type="submit"
                disabled={savingStaffPassword}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
              >
                {savingStaffPassword ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
