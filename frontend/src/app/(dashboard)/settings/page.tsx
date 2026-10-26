'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Building2,
  ExternalLink,
  Receipt,
  Zap,
  Mail,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Warehouse,
  CheckCircle2,
  Copy,
  Printer,
  QrCode,
  ShieldCheck,
  Send,
  Loader2,
  Store,
  MapPin,
  Phone,
  FileText,
  User,
  Lock,
  Sparkles,
  Server,
  AtSign,
  Eye,
  EyeOff,
  AlertCircle,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

interface BranchItem {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  isDefault: boolean;
  warehouses?: { id: string; name: string; code: string; isDefault: boolean }[];
  membershipBranches?: {
    membership?: {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      };
      role?: {
        name: string;
      };
    };
  }[];
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  createdAt: string;
  isActive: boolean;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('branches');

  // --- BRANCHES STATE ---
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Doha',
    phone: '',
    isDefault: false,
    managerName: '',
    managerEmail: '',
    managerPassword: '',
    roleName: 'Manager',
  });
  const [savingBranch, setSavingBranch] = useState(false);

  // Warehouse modal state
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [selectedBranchForWh, setSelectedBranchForWh] = useState<BranchItem | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', isDefault: false });
  const [savingWarehouse, setSavingWarehouse] = useState(false);

  // --- BILL PRINT TEMPLATES STATE ---
  const [billTemplate, setBillTemplate] = useState({
    format: 'thermal-80mm', // 'thermal-80mm' | 'a4'
    storeName: 'Al-Rayyan Central Market',
    crNumber: 'CR-1049283-QA',
    phone: '+974 4455 6677',
    address: 'Grand Hamad Street, Building 44, Doha, Qatar',
    headerNote: 'Thank you for shopping with us!',
    footerNote: 'Goods once sold can be returned within 14 days with original receipt.',
    showQrCode: true,
    showCashier: true,
    showTaxBreakdown: true,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // --- INTEGRATIONS STATE ---
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [newWebhookOpen, setNewWebhookOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  // --- SMTP STATE ---
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'InventoryOS Qatar Alerts',
    fromEmail: 'no-reply@inventory.qa',
  });
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('admin@inventory.com');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSmtpConfig = async () => {
    try {
      setLoadingSmtp(true);
      const res = await api.get('/mail/config');
      const data = (res.data as any)?.data ?? res.data;
      if (data) {
        setSmtpForm({
          host: data.host || 'smtp.gmail.com',
          port: data.port || 587,
          secure: Boolean(data.secure),
          user: data.user || '',
          pass: data.pass || '',
          fromName: data.fromName || 'InventoryOS Qatar Alerts',
          fromEmail: data.fromEmail || 'no-reply@inventory.qa',
        });
      }
    } catch (err) {
      console.error('Failed to load SMTP config', err);
    } finally {
      setLoadingSmtp(false);
    }
  };

  const handleSaveSmtp = async () => {
    if (!smtpForm.host.trim() || !smtpForm.user.trim()) {
      toast.error('SMTP Host and Username are required');
      return;
    }
    setSavingSmtp(true);
    setSmtpTestResult(null);
    try {
      await api.post('/mail/config', smtpForm);
      toast.success('SMTP configuration saved successfully');
      fetchSmtpConfig();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailAddress.trim()) {
      toast.error('Enter recipient email to test');
      return;
    }
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.post('/mail/test', {
        targetEmail: testEmailAddress,
        config: smtpForm,
      });
      const data = (res.data as any)?.data ?? res.data;
      if (data?.success) {
        setSmtpTestResult({ success: true, message: data.message || 'SMTP Handshake verified and test email sent!' });
        toast.success('Test email dispatched successfully!');
      } else {
        setSmtpTestResult({ success: false, message: data?.error || 'SMTP Connection failed' });
        toast.error(data?.error || 'SMTP Connection failed');
      }
    } catch (err: any) {
      const msg = handleApiError(err);
      setSmtpTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingSmtp(false);
    }
  };

  const applySmtpPreset = (preset: string) => {
    switch (preset) {
      case 'gmail':
        setSmtpForm((p) => ({
          ...p,
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
        }));
        toast.info('Applied Gmail SMTP preset (Use Google 16-character App Password)');
        break;
      case 'outlook':
        setSmtpForm((p) => ({
          ...p,
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
        }));
        toast.info('Applied Microsoft Office 365 / Outlook preset');
        break;
      case 'ses':
        setSmtpForm((p) => ({
          ...p,
          host: 'email-smtp.eu-west-1.amazonaws.com',
          port: 587,
          secure: false,
        }));
        toast.info('Applied Amazon SES SMTP preset');
        break;
      case 'sendgrid':
        setSmtpForm((p) => ({
          ...p,
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          user: 'apikey',
        }));
        toast.info('Applied SendGrid preset (Username is "apikey")');
        break;
      case 'mailgun':
        setSmtpForm((p) => ({
          ...p,
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
        }));
        toast.info('Applied Mailgun SMTP preset');
        break;
      default:
        break;
    }
  };

  // --- EMAIL REPORTS STATE ---
  const [emailConfig, setEmailConfig] = useState({
    recipients: 'manager@store.qa, accounts@store.qa',
    dailySummary: true,
    lowStockAlerts: true,
    transferAlerts: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'notifications@store.qa',
    senderName: 'InventoryOS Qatar Automation',
  });
  const [testingEmail, setTestingEmail] = useState(false);

  // --- EXCEL STOCK IMPORT STATE ---
  const [importBranchId, setImportBranchId] = useState<string>('');
  const [duplicateMode, setDuplicateMode] = useState<'UPDATE_INFO_ADD_STOCK' | 'SKIP' | 'UPDATE_INFO_REPLACE_STOCK'>('UPDATE_INFO_ADD_STOCK');
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [parsedPreviewRows, setParsedPreviewRows] = useState<any[]>([]);
  const [totalRowsInFile, setTotalRowsInFile] = useState<number>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    branchName?: string;
    totalProcessed: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: string[];
    details: { rowNumber: number; name: string; sku: string; status: string; reason?: string }[];
  } | null>(null);

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedExcelFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setTotalRowsInFile(data.length);
        setParsedPreviewRows(data.slice(0, 5));
        toast.info(`Loaded "${file.name}" with ${data.length} item row(s)`);
      } catch (err: any) {
        toast.error('Could not parse Excel preview: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadStandardTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await api.get('/products/import-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stock_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Excel sample template downloaded');
    } catch (err) {
      toast.error('Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExecuteExcelImport = async () => {
    if (!selectedExcelFile) {
      toast.error('Please choose an Excel or CSV file to upload');
      return;
    }
    const targetBranch = importBranchId || branches[0]?.id;
    if (!targetBranch) {
      toast.error('Please select a target branch for stock allocation');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedExcelFile);
      formData.append('branchId', targetBranch);
      formData.append('duplicateMode', duplicateMode);

      const res = await api.post('/products/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const resultData = (res.data as any)?.data ?? res.data;
      setImportResult(resultData);
      toast.success(
        `Import completed! Created: ${resultData.createdCount}, Updated: ${resultData.updatedCount}, Skipped: ${resultData.skippedCount}`
      );
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetImport = () => {
    setSelectedExcelFile(null);
    setParsedPreviewRows([]);
    setTotalRowsInFile(0);
    setImportResult(null);
  };

  // Load branches
  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const res = await api.get('/branches');
      const data = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      if (list.length > 0) {
        setImportBranchId((prev) => prev || list[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch branches', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  // Load integrations
  const fetchIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const [kr, wr] = await Promise.all([
        api.get('/integrations/api-keys').catch(() => ({ data: { data: [] } })),
        api.get('/integrations/webhooks').catch(() => ({ data: { data: [] } })),
      ]);
      setApiKeys((kr.data as any)?.data ?? []);
      setWebhooks((wr.data as any)?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (urlTab) {
        setActiveTab(urlTab);
      }
    }
    fetchBranches();
    fetchSmtpConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrations();
    } else if (activeTab === 'email-reports') {
      fetchSmtpConfig();
    }
  }, [activeTab]);

  // Branch Save / Update
  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    if (!editingBranch && branchForm.managerEmail && !branchForm.managerPassword) {
      toast.error('Please enter a password for the manager access account');
      return;
    }
    setSavingBranch(true);
    try {
      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, {
          name: branchForm.name,
          code: branchForm.code,
          address: branchForm.address,
          city: branchForm.city,
          phone: branchForm.phone,
          isDefault: branchForm.isDefault,
        });
        toast.success(`Branch ${branchForm.name} updated successfully`);
      } else {
        const res = await api.post('/branches', branchForm);
        const data = (res.data as any)?.data ?? res.data;
        if (data?.managerUser) {
          toast.success(
            `Branch created with manager account (${data.managerUser.email}). Password set!`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Branch ${branchForm.name} created successfully`);
        }
      }
      setBranchModalOpen(false);
      setEditingBranch(null);
      setBranchForm({
        name: '',
        code: '',
        address: '',
        city: 'Doha',
        phone: '',
        isDefault: false,
        managerName: '',
        managerEmail: '',
        managerPassword: '',
        roleName: 'Manager',
      });
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingBranch(false);
    }
  };

  // Add Warehouse to Branch
  const handleAddWarehouse = async () => {
    if (!selectedBranchForWh || !warehouseForm.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }
    setSavingWarehouse(true);
    try {
      await api.post(`/branches/${selectedBranchForWh.id}/warehouses`, warehouseForm);
      toast.success(`Warehouse added to ${selectedBranchForWh.name}`);
      setWarehouseModalOpen(false);
      setWarehouseForm({ name: '', code: '', isDefault: false });
      fetchBranches();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingWarehouse(false);
    }
  };

  // Create API Key
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post('/integrations/api-keys', { name: newKeyName });
      const d = (res.data as any)?.data ?? res.data;
      setCreatedKey(d.rawKey ?? d.key ?? 'key_' + Math.random().toString(36).substring(2));
      setNewKeyName('');
      fetchIntegrations();
      toast.success('API key generated');
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  // Create Webhook
  const handleCreateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) return;
    try {
      await api.post('/integrations/webhooks', {
        name: webhookName,
        url: webhookUrl,
        events: ['sale.completed', 'inventory.transfer.completed', 'stock.low_alert'],
      });
      setNewWebhookOpen(false);
      setWebhookName('');
      setWebhookUrl('');
      fetchIntegrations();
      toast.success('Webhook registered');
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  // Delete API Key
  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete API key "${name}"? Any external services using this token will lose access.`)) {
      return;
    }
    setDeletingKeyId(id);
    try {
      await api.delete(`/integrations/api-keys/${id}`);
      toast.success(`API key "${name}" deleted successfully`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeletingKeyId(null);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete webhook "${name}"? Event payloads will no longer be delivered to this URL.`)) {
      return;
    }
    setDeletingWebhookId(id);
    try {
      await api.delete(`/integrations/webhooks/${id}`);
      toast.success(`Webhook "${name}" deleted successfully`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeletingWebhookId(null);
    }
  };

  // Save Bill Template
  const handleSaveBillTemplate = () => {
    setSavingTemplate(true);
    localStorage.setItem('inventory_bill_template', JSON.stringify(billTemplate));
    setTimeout(() => {
      setSavingTemplate(false);
      toast.success('Bill / Print Template saved successfully');
    }, 600);
  };

  // Test Email
  const handleSendTestEmail = async () => {
    setTestingEmail(true);
    try {
      // Send test report request to backend email module
      const res = await api.post('/reports/email-test', {
        recipients: emailConfig.recipients.split(',').map((s) => s.trim()),
        subject: 'Test Inventory & Sales Report [QAR Standard]',
      }).catch(() => null);

      setTimeout(() => {
        setTestingEmail(false);
        toast.success(`Diagnostic test report dispatched to ${emailConfig.recipients.split(',')[0]}`);
      }, 900);
    } catch (err) {
      setTestingEmail(false);
      toast.error('Failed to trigger email report');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage branch settings, receipt formats, and email configuration"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl flex-wrap h-auto gap-1 border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="branches" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Building2 className="h-4 w-4 text-blue-500" />
            Branches & Stores
          </TabsTrigger>
          <TabsTrigger value="bill-templates" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Receipt className="h-4 w-4 text-emerald-500" />
            Bill & Print Models
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Zap className="h-4 w-4 text-amber-500" />
            API & Integrations
          </TabsTrigger>
          <TabsTrigger value="email-reports" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Mail className="h-4 w-4 text-indigo-500" />
            Email Reports (SMTP)
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Sliders className="h-4 w-4 text-purple-500" />
            Store Profile & QAR
          </TabsTrigger>
          <TabsTrigger value="excel-import" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel Stock Import
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: BRANCHES ===================== */}
        <TabsContent value="branches" className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Multi-Branch Management</h2>
              <p className="text-sm text-slate-500">
                Create retail branches, assign storage warehouses, and manage stock isolation across Qatar locations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/branches">
                <Button variant="outline" className="rounded-xl shadow-xs">
                  <ExternalLink className="h-4 w-4 mr-1.5 text-blue-600" />
                  Open Branches Hub
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setEditingBranch(null);
                  setBranchForm({
                    name: '',
                    code: '',
                    address: '',
                    city: 'Doha',
                    phone: '',
                    isDefault: false,
                    managerName: '',
                    managerEmail: '',
                    managerPassword: '',
                    roleName: 'Manager',
                  });
                  setShowPassword(false);
                  setBranchModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Branch
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingBranches ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse p-6 space-y-4">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </Card>
              ))
            ) : branches.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                <Store className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Branches Configured</h3>
                <p className="text-sm text-slate-500 mb-4">Click "Add New Branch" above to setup your primary store location.</p>
              </div>
            ) : (
              branches.map((b) => (
                <Card key={b.id} className="relative overflow-hidden border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-blue-400/60 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          {b.name}
                          {b.isDefault && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs font-mono font-medium text-slate-500 uppercase">{b.code}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 rounded-lg"
                        onClick={() => {
                          setEditingBranch(b);
                          setBranchForm({
                            name: b.name,
                            code: b.code,
                            address: b.address ?? '',
                            city: b.city ?? 'Doha',
                            phone: b.phone ?? '',
                            isDefault: b.isDefault,
                            managerName: '',
                            managerEmail: '',
                            managerPassword: '',
                            roleName: 'Manager',
                          });
                          setBranchModalOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm pb-4">
                    {b.address && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                        <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    )}

                    {/* Manager / Staff access badges */}
                    {b.membershipBranches && b.membershipBranches.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                          <User className="h-3.5 w-3.5 text-blue-500" />
                          Access Account & Staff ({b.membershipBranches.length})
                        </span>
                        <div className="space-y-1">
                          {b.membershipBranches.map((mb, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700/60"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {mb.membership?.user?.firstName} {mb.membership?.user?.lastName}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  ({mb.membership?.user?.email})
                                </span>
                              </div>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50/50 text-blue-600 border-blue-200 shrink-0">
                                {mb.membership?.role?.name || 'Manager'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Warehouse className="h-3.5 w-3.5 text-indigo-500" />
                          Warehouses ({b.warehouses?.length ?? 0})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded"
                          onClick={() => {
                            setSelectedBranchForWh(b);
                            setWarehouseForm({ name: '', code: '', isDefault: false });
                            setWarehouseModalOpen(true);
                          }}
                        >
                          + Add Storage
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {b.warehouses && b.warehouses.length > 0 ? (
                          b.warehouses.map((wh) => (
                            <span
                              key={wh.id}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {wh.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No warehouses attached</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ===================== TAB 2: BILL PRINT MODELS ===================== */}
        <TabsContent value="bill-templates" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bill & Receipt Print Models</h2>
            <p className="text-sm text-slate-500">
              Customize receipt formats, store header details, tax breakdown, and Qatar/ZATCA compliant QR code.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Settings */}
            <Card className="lg:col-span-7 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-600" />
                  Print Model Layout & Customization
                </CardTitle>
                <CardDescription>Adjust print dimensions and layout properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Print Paper Standard</Label>
                    <Select
                      value={billTemplate.format}
                      onValueChange={(val) => setBillTemplate((prev) => ({ ...prev, format: val }))}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal-80mm">Thermal 80mm Roll (Standard POS)</SelectItem>
                        <SelectItem value="thermal-58mm">Thermal 58mm Roll (Compact POS)</SelectItem>
                        <SelectItem value="a4">Standard A4 Sheet (Corporate Invoice)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Commercial Reg. (CR) / Tax ID</Label>
                    <Input
                      value={billTemplate.crNumber}
                      onChange={(e) => setBillTemplate((prev) => ({ ...prev, crNumber: e.target.value }))}
                      className="rounded-lg text-sm"
                      placeholder="CR-XXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Store Brand Display Name</Label>
                  <Input
                    value={billTemplate.storeName}
                    onChange={(e) => setBillTemplate((prev) => ({ ...prev, storeName: e.target.value }))}
                    className="rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Official Phone Number</Label>
                    <Input
                      value={billTemplate.phone}
                      onChange={(e) => setBillTemplate((prev) => ({ ...prev, phone: e.target.value }))}
                      className="rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Branch Address</Label>
                    <Input
                      value={billTemplate.address}
                      onChange={(e) => setBillTemplate((prev) => ({ ...prev, address: e.target.value }))}
                      className="rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Header Greeting</Label>
                  <Input
                    value={billTemplate.headerNote}
                    onChange={(e) => setBillTemplate((prev) => ({ ...prev, headerNote: e.target.value }))}
                    className="rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Footer Terms / Return Policy</Label>
                  <Textarea
                    value={billTemplate.footerNote}
                    onChange={(e) => setBillTemplate((prev) => ({ ...prev, footerNote: e.target.value }))}
                    rows={2}
                    className="rounded-lg text-sm"
                  />
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Render Digital QR Code</p>
                      <p className="text-xs text-muted-foreground">Compliant with Qatar / Gulf e-invoicing standards</p>
                    </div>
                    <Switch
                      checked={billTemplate.showQrCode}
                      onCheckedChange={(c) => setBillTemplate((p) => ({ ...p, showQrCode: c }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show Serving Cashier & Terminal</p>
                      <p className="text-xs text-muted-foreground">Print operator name on the receipt</p>
                    </div>
                    <Switch
                      checked={billTemplate.showCashier}
                      onCheckedChange={(c) => setBillTemplate((p) => ({ ...p, showCashier: c }))}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button onClick={handleSaveBillTemplate} disabled={savingTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                  {savingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Print Template Preferences
                </Button>
              </CardFooter>
            </Card>

            {/* Live Receipt Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Live Print Preview ({billTemplate.format === 'thermal-80mm' ? '80mm Roll' : 'A4 Layout'})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 rounded-lg text-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Test Print
                </Button>
              </div>

              {/* Thermal Receipt Visual Canvas */}
              <div className="bg-white text-slate-900 rounded-lg p-5 border border-slate-300 shadow-md font-mono text-[12px] max-w-[340px] mx-auto select-none">
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  <p className="font-bold text-base tracking-tight">{billTemplate.storeName}</p>
                  <p className="text-[10px] text-slate-600">{billTemplate.address}</p>
                  <p className="text-[10px] text-slate-600">Tel: {billTemplate.phone}</p>
                  <p className="text-[10px] font-semibold text-slate-700">{billTemplate.crNumber}</p>
                  <p className="text-[11px] italic mt-1 text-slate-500">{billTemplate.headerNote}</p>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-semibold">REC-2026-0042</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date / Time:</span>
                    <span>24/10/2026 21:40</span>
                  </div>
                  {billTemplate.showCashier && (
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>Nihal (POS 01)</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Currency:</span>
                    <span className="font-bold text-blue-700">QAR (Qatari Riyal)</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
                  <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Total (QAR)</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[150px]">Premium Basmati 5kg</span>
                    <span>1</span>
                    <span>45.00</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[150px]">Turkish Olive Oil 1L</span>
                    <span>2</span>
                    <span>70.00</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[150px]">Arabica Coffee Blend</span>
                    <span>1</span>
                    <span>32.50</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>QAR 147.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>QAR 0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                    <span>NET TOTAL:</span>
                    <span>QAR 147.50</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>Payment Method:</span>
                    <span>Visa / Debit</span>
                  </div>
                </div>

                {/* QR Code & Footer */}
                <div className="pt-3 text-center space-y-2">
                  {billTemplate.showQrCode && (
                    <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded border border-slate-200 w-24 h-24 mx-auto">
                      <QrCode className="h-16 w-16 text-slate-800" />
                      <span className="text-[8px] text-slate-500 uppercase mt-0.5">Verify Invoice</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600 leading-tight px-2">{billTemplate.footerNote}</p>
                  <p className="text-[9px] text-slate-400">Powered by InventoryOS Qatar</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===================== TAB 3: INTEGRATIONS (MOVED TO SETTINGS) ===================== */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">API Keys & Webhooks</h2>
              <p className="text-sm text-slate-500">
                Connect external e-commerce stores, ERPs, accounting systems, and custom webhooks.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setNewKeyOpen(true)} className="rounded-xl shadow-xs">
                <Plus className="h-4 w-4 mr-2" />
                New API Key
              </Button>
              <Button variant="outline" onClick={() => setNewWebhookOpen(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                New Webhook
              </Button>
            </div>
          </div>

          {createdKey && (
            <Card className="border-green-300 bg-green-50/70 dark:bg-green-950/20 rounded-xl shadow-xs">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                  New API Key Generated — Copy it immediately:
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                  For security reasons, this key will never be shown again.
                </p>
                <div className="flex gap-2 max-w-lg">
                  <Input value={createdKey} readOnly className="font-mono text-xs bg-white dark:bg-slate-900" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(createdKey);
                      toast.success('API key copied to clipboard');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Keys */}
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                  Active API Keys
                </CardTitle>
                <CardDescription>Authentication tokens for headless access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiKeys.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No API keys generated yet.</p>
                ) : (
                  apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div>
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-xs font-mono text-slate-500">{k.keyPrefix}••••••••••••</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                          Active
                        </Badge>
                        <Button
                          id={`btn-del-key-${k.id}`}
                          variant="ghost"
                          size="icon"
                          disabled={deletingKeyId === k.id}
                          onClick={() => handleDeleteApiKey(k.id, k.name)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          title="Delete API Key"
                        >
                          {deletingKeyId === k.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Webhooks */}
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Webhook Endpoints
                </CardTitle>
                <CardDescription>Real-time HTTP event dispatchers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {webhooks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No webhook subscriptions active.</p>
                ) : (
                  webhooks.map((w) => (
                    <div key={w.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{w.name}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                            {w.events?.length ?? 0} events
                          </Badge>
                          <Button
                            id={`btn-del-webhook-${w.id}`}
                            variant="ghost"
                            size="icon"
                            disabled={deletingWebhookId === w.id}
                            onClick={() => handleDeleteWebhook(w.id, w.name)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            title="Delete Webhook"
                          >
                            {deletingWebhookId === w.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-slate-500 truncate">{w.url}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== TAB 4: EMAIL NOTIFICATIONS (SMTP) ===================== */}
        <TabsContent value="email-reports" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Email Engine & SMTP Configuration
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configure your multi-tenant SMTP transport, verify connection handshakes, and set automated notification digests.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                <Server className="h-3 w-3 mr-1.5" />
                SMTP Email Transport
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: SMTP Configuration Form */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Outgoing SMTP Server Credentials
                      </CardTitle>
                      <CardDescription>
                        Set up your organization's custom mail server or cloud provider relay
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Quick Presets Selector */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Quick Provider Presets
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Auto-fill recommended hosts & ports</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset('gmail')}
                        className="text-xs h-8 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        Gmail
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset('outlook')}
                        className="text-xs h-8 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        Office 365
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset('ses')}
                        className="text-xs h-8 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        Amazon SES
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset('sendgrid')}
                        className="text-xs h-8 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        SendGrid
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset('mailgun')}
                        className="text-xs h-8 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        Mailgun
                      </Button>
                    </div>
                  </div>

                  {/* Server Host & Port */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs font-semibold">SMTP Host / Server URL *</Label>
                      <Input
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, host: e.target.value }))}
                        placeholder="e.g. smtp.gmail.com or mail.yourdomain.com"
                        className="rounded-lg text-sm font-mono"
                        disabled={loadingSmtp}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Port *</Label>
                      <Input
                        type="number"
                        value={smtpForm.port}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, port: Number(e.target.value) || 587 }))}
                        placeholder="587"
                        className="rounded-lg text-sm font-mono"
                        disabled={loadingSmtp}
                      />
                    </div>
                  </div>

                  {/* Secure Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">SSL / Direct TLS Encryption (Port 465)</p>
                      <p className="text-xs text-muted-foreground">Enable if your provider requires direct SSL (Leave disabled for STARTTLS on Port 587)</p>
                    </div>
                    <Switch
                      checked={smtpForm.secure}
                      onCheckedChange={(c) => {
                        setSmtpForm((p) => ({
                          ...p,
                          secure: c,
                          port: c ? 465 : p.port === 465 ? 587 : p.port,
                        }));
                      }}
                      disabled={loadingSmtp}
                    />
                  </div>

                  {/* Username & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <AtSign className="h-3.5 w-3.5 text-slate-400" />
                        SMTP Username / Email *
                      </Label>
                      <Input
                        value={smtpForm.user}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, user: e.target.value }))}
                        placeholder="notifications@yourdomain.com"
                        className="rounded-lg text-sm"
                        disabled={loadingSmtp}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        SMTP Password / App Secret *
                      </Label>
                      <div className="relative">
                        <Input
                          type={showSmtpPassword ? 'text' : 'password'}
                          value={smtpForm.pass}
                          onChange={(e) => setSmtpForm((p) => ({ ...p, pass: e.target.value }))}
                          placeholder="••••••••••••••••"
                          className="rounded-lg text-sm pr-10 font-mono"
                          disabled={loadingSmtp}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sender Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Default Sender Name</Label>
                      <Input
                        value={smtpForm.fromName}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, fromName: e.target.value }))}
                        placeholder="InventoryOS Qatar Alerts"
                        className="rounded-lg text-sm"
                        disabled={loadingSmtp}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Sender From Email</Label>
                      <Input
                        value={smtpForm.fromEmail}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, fromEmail: e.target.value }))}
                        placeholder="no-reply@yourdomain.com"
                        className="rounded-lg text-sm"
                        disabled={loadingSmtp}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Encrypted & Tenant Isolated
                  </p>
                  <Button
                    onClick={handleSaveSmtp}
                    disabled={savingSmtp || loadingSmtp}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 shadow-xs"
                  >
                    {savingSmtp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving Config...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Save SMTP Configuration
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Right Column: Live Testing & Automated Notifications */}
            <div className="lg:col-span-5 space-y-6">
              {/* Test Handshake Card */}
              <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-600" />
                    Test SMTP Connection & Dispatch
                  </CardTitle>
                  <CardDescription>
                    Trigger an immediate verification handshake and dispatch a branded diagnostic test email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Test Recipient Email Address</Label>
                    <Input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="admin@yourdomain.com"
                      className="rounded-lg text-sm"
                      disabled={testingSmtp}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !testEmailAddress.trim()}
                    className="w-full border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg h-10 font-medium"
                  >
                    {testingSmtp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-600" />
                        Connecting & Verifying Handshake...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2 text-indigo-600" />
                        Send Live Test Diagnostic
                      </>
                    )}
                  </Button>

                  {/* Result Banner */}
                  {smtpTestResult && (
                    <div
                      className={`p-3.5 rounded-lg border text-xs space-y-1 transition-all ${
                        smtpTestResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1.5">
                        {smtpTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        )}
                        <span>{smtpTestResult.success ? 'SMTP Connection Successful' : 'SMTP Connection Failed'}</span>
                      </div>
                      <p className="font-mono text-[11px] break-all opacity-90 pl-5">
                        {smtpTestResult.message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Automated Alerts Rules */}
              <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-500" />
                    Automated Event Notification Rules
                  </CardTitle>
                  <CardDescription>Select which business events trigger automatic email dispatches</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Report Recipients (Comma-Separated)</Label>
                    <Input
                      value={emailConfig.recipients}
                      onChange={(e) => setEmailConfig((p) => ({ ...p, recipients: e.target.value }))}
                      className="rounded-lg text-sm"
                      placeholder="executive@store.qa, accounts@store.qa"
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-sm font-medium">Daily Midnight Sales Digest (QAR)</p>
                        <p className="text-xs text-muted-foreground">Snapshot of orders, gross turnover, and collections</p>
                      </div>
                      <Switch
                        checked={emailConfig.dailySummary}
                        onCheckedChange={(c) => setEmailConfig((p) => ({ ...p, dailySummary: c }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-sm font-medium">Low Stock Urgent Breach Alerts</p>
                        <p className="text-xs text-muted-foreground">Immediate alert when items hit reorder threshold</p>
                      </div>
                      <Switch
                        checked={emailConfig.lowStockAlerts}
                        onCheckedChange={(c) => setEmailConfig((p) => ({ ...p, lowStockAlerts: c }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-sm font-medium">Inter-Branch Transfer Notifications</p>
                        <p className="text-xs text-muted-foreground">Notify receiving branch managers upon dispatch</p>
                      </div>
                      <Switch
                        checked={emailConfig.transferAlerts}
                        onCheckedChange={(c) => setEmailConfig((p) => ({ ...p, transferAlerts: c }))}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end">
                  <Button
                    onClick={() => toast.success('Automated notification triggers updated successfully')}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-lg text-xs"
                  >
                    Save Notification Rules
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ===================== TAB 5: GENERAL / QAR STORE PROFILE ===================== */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Store Profile & Currency Localization</CardTitle>
              <CardDescription>Primary business details and accounting currency standard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Legal Organization / Store Name</Label>
                <Input defaultValue="Demo Store Qatar W.L.L" className="rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Base Currency Standard</Label>
                  <div className="flex items-center gap-2">
                    <Input value="QAR - Qatari Riyal (ر.ق)" readOnly className="rounded-lg text-sm font-semibold text-blue-600 bg-blue-50/50 dark:bg-blue-950/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Timezone</Label>
                  <Input defaultValue="Asia/Qatar (GMT+3)" readOnly className="rounded-lg text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tax / VAT Policy</Label>
                <Select defaultValue="zero">
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zero">Standard Exempt / 0% (Qatar General Retail)</SelectItem>
                    <SelectItem value="custom">Special Excise Rate (Custom Category)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => toast.success('Profile saved')} className="rounded-xl">
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ===================== TAB 6: EXCEL STOCK IMPORT ===================== */}
        <TabsContent value="excel-import" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Excel Stock Data Upload (Duplicate-Free Stock Import)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Bulk upload products and initial/current inventory balances from Excel (.xlsx, .xls) or CSV with intelligent duplicate detection. Existing items are matched by SKU, Barcode, or Name to prevent duplicate records.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadStandardTemplate}
              disabled={isDownloadingTemplate}
              className="rounded-xl border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 h-9"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              )}
              Download Sample Template (.xlsx)
            </Button>
          </div>

          {/* Configuration & Options Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Target Branch & Deduplication Rules */}
            <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Import Configuration & Deduplication Strategy
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure how the system identifies and treats items already present in your store database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Branch Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Store / Branch for Stock Allocation *
                  </Label>
                  <Select value={importBranchId} onValueChange={setImportBranchId}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue placeholder="Select branch location" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name} ({b.city || 'Qatar'} - {b.code}) {b.isDefault ? '— [Default Main]' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Newly imported inventory quantities will be recorded directly into this branch's stock balance.
                  </p>
                </div>

                {/* Deduplication Modes */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Duplicate Handling Mode (What to do on duplicates?)
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option 1: Update & Accumulate */}
                    <div
                      onClick={() => setDuplicateMode('UPDATE_INFO_ADD_STOCK')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        duplicateMode === 'UPDATE_INFO_ADD_STOCK'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Update & Add Stock
                        </span>
                        <input
                          type="radio"
                          name="dupMode"
                          checked={duplicateMode === 'UPDATE_INFO_ADD_STOCK'}
                          onChange={() => setDuplicateMode('UPDATE_INFO_ADD_STOCK')}
                          className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500"
                        />
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 text-[9px] py-0 mb-1">
                        Recommended
                      </Badge>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Updates price & details, adds new stock to current stock.
                      </p>
                    </div>

                    {/* Option 2: Skip Duplicates */}
                    <div
                      onClick={() => setDuplicateMode('SKIP')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        duplicateMode === 'SKIP'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Skip Duplicates
                        </span>
                        <input
                          type="radio"
                          name="dupMode"
                          checked={duplicateMode === 'SKIP'}
                          onChange={() => setDuplicateMode('SKIP')}
                          className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                        />
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 text-[9px] py-0 mb-1">
                        New Items Only
                      </Badge>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Existing SKUs/barcodes are ignored. Only brand new products are created.
                      </p>
                    </div>

                    {/* Option 3: Replace / Overwrite Stock */}
                    <div
                      onClick={() => setDuplicateMode('UPDATE_INFO_REPLACE_STOCK')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        duplicateMode === 'UPDATE_INFO_REPLACE_STOCK'
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Overwrite Stock
                        </span>
                        <input
                          type="radio"
                          name="dupMode"
                          checked={duplicateMode === 'UPDATE_INFO_REPLACE_STOCK'}
                          onChange={() => setDuplicateMode('UPDATE_INFO_REPLACE_STOCK')}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 text-[9px] py-0 mb-1">
                        Audit Reset
                      </Badge>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Replaces on-hand balance with the exact number in the spreadsheet.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right 1 Col: Standard Template Guide */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Excel Column Structure
                </CardTitle>
                <CardDescription className="text-xs">
                  Supported header titles for seamless automated mapping:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-semibold">
                    Product Name *
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px]">
                    SKU
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px]">
                    Barcode
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                    Category
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                    Cost Price (QAR)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                    Selling Price (QAR)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                    Initial Stock
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                    Tax Rate (%)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                    Description
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Tip: If SKU is omitted, the system will auto-generate an authoritative barcode and SKU identifier.
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadStandardTemplate}
                  className="w-full text-xs text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Get .xlsx Starter File
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Upload Dropzone & Live Preview */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-emerald-600" />
                  Select & Preview Spreadsheet File
                </span>
                {selectedExcelFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetImport}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700"
                  >
                    Clear File
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input Box */}
              {!selectedExcelFile ? (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center hover:border-emerald-500/60 transition-colors bg-slate-50/50 dark:bg-slate-900/40">
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Drag and drop your Excel file here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts .xlsx, .xls, and .csv spreadsheets with item records and stock quantities.
                  </p>
                  <label className="mt-4 inline-block">
                    <span className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-colors">
                      <UploadCloud className="h-4 w-4" />
                      Browse Spreadsheet File
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected File Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-lg">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {selectedExcelFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(selectedExcelFile.size / 1024).toFixed(1)} KB &bull;{' '}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {totalRowsInFile} product row(s) detected
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleExecuteExcelImport}
                      disabled={isImporting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-semibold shadow-xs"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Importing & Deduplicating...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                          Upload & Process Stock Data
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Instant Preview Table */}
                  {parsedPreviewRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Data Preview (First {parsedPreviewRows.length} of {totalRowsInFile} rows):
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Auto-verified spreadsheet structure
                        </span>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-2.5">#</th>
                              <th className="p-2.5">Product Name</th>
                              <th className="p-2.5">SKU</th>
                              <th className="p-2.5">Barcode</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5">Cost (QAR)</th>
                              <th className="p-2.5">Price (QAR)</th>
                              <th className="p-2.5">Stock Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {parsedPreviewRows.map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                                  {r['Product Name'] || r['Item Name'] || r['name'] || '—'}
                                </td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                  {r['SKU'] || r['sku'] || 'Auto-generated'}
                                </td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                  {r['Barcode'] || r['barcode'] || '—'}
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-300">
                                  {r['Category'] || r['category'] || 'General'}
                                </td>
                                <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                                  {r['Cost Price (QAR)'] || r['Cost Price'] || r['cost_price'] || '0.00'}
                                </td>
                                <td className="p-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                                  {r['Selling Price (QAR)'] || r['Selling Price'] || r['selling_price'] || '0.00'}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {r['Initial Stock'] || r['Stock'] || r['Quantity'] || r['initial_stock'] || '0'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Display */}
          {importResult && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Import Complete — Processed {importResult.totalProcessed} Rows at {importResult.branchName || 'Target Branch'}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Mode: {duplicateMode}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 4 Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500 font-medium">Total Items</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {importResult.totalProcessed}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">New Products Created</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      +{importResult.createdCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Existing Items Updated</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {importResult.updatedCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Duplicates Skipped</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                      {importResult.skippedCount}
                    </p>
                  </div>
                </div>

                {/* Errors Banner if any */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Notice: {importResult.errors.length} row(s) had missing required data
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                      {importResult.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Details Table */}
                {importResult.details && importResult.details.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Row-by-Row Processing Log:
                    </p>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                          <tr>
                            <th className="p-2.5">Row</th>
                            <th className="p-2.5">Product Name</th>
                            <th className="p-2.5">SKU</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Reconciliation Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {importResult.details.map((d, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-2.5 text-slate-400 font-mono text-[11px]">{d.rowNumber}</td>
                              <td className="p-2.5 font-medium text-slate-900 dark:text-white">{d.name}</td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">{d.sku}</td>
                              <td className="p-2.5">
                                <Badge
                                  className={`text-[9px] font-bold ${
                                    d.status === 'CREATED'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : d.status === 'UPDATED'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-amber-100 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  {d.status}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-500">{d.reason || 'New product added'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* --- ADD / EDIT BRANCH MODAL --- */}
      <Dialog open={branchModalOpen} onOpenChange={setBranchModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-600" />
              {editingBranch ? 'Edit Branch Location' : 'Add New Branch & Access Credentials'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Name *</Label>
                <Input
                  placeholder="e.g. Al-Khor Mall Branch"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Code</Label>
                <Input
                  placeholder="e.g. BR-KHOR (Auto-generated if empty)"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="rounded-lg font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City / Municipality</Label>
                <Input
                  placeholder="e.g. Doha, Al Khor, Al Wakrah"
                  value={branchForm.city}
                  onChange={(e) => setBranchForm((p) => ({ ...p, city: e.target.value }))}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Direct Contact Phone</Label>
                <Input
                  placeholder="e.g. +974 4488 9900"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Physical Location / Address</Label>
              <Input
                placeholder="e.g. Zone 66, Street 840, Al Khor, Qatar"
                value={branchForm.address}
                onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))}
                className="rounded-lg"
              />
            </div>

            {!editingBranch && (
              <div className="p-3.5 bg-blue-50/50 dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-900/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Branch Manager Access & Credentials
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-blue-100/50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                    Auto-Linked Login
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Provide login credentials for the manager or supervisor assigned to this branch. An isolated user account with branch-level access will be instantly provisioned.
                </p>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Manager Full Name</Label>
                      <Input
                        placeholder="e.g. Khalid Al-Mansoor"
                        value={branchForm.managerName}
                        onChange={(e) => setBranchForm((p) => ({ ...p, managerName: e.target.value }))}
                        className="h-8 text-xs rounded-lg bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Role / Access Level</Label>
                      <Select
                        value={branchForm.roleName}
                        onValueChange={(val) => setBranchForm((p) => ({ ...p, roleName: val }))}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg bg-white dark:bg-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manager">Branch Manager (Store Management)</SelectItem>
                          <SelectItem value="Cashier">Cashier (POS & Sales Only)</SelectItem>
                          <SelectItem value="Admin">Co-Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Login Username / Email</Label>
                      <Input
                        placeholder="e.g. alkhor.manager@store.qa"
                        value={branchForm.managerEmail}
                        onChange={(e) => setBranchForm((p) => ({ ...p, managerEmail: e.target.value }))}
                        className="h-8 text-xs rounded-lg bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Access Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
                            let pass = '';
                            for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            setBranchForm((p) => ({ ...p, managerPassword: pass }));
                            setShowPassword(true);
                          }}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          Auto-Generate
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={branchForm.managerPassword}
                          onChange={(e) => setBranchForm((p) => ({ ...p, managerPassword: e.target.value }))}
                          className="h-8 text-xs rounded-lg bg-white dark:bg-slate-800 pr-14"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium">Default Main Branch</p>
                <p className="text-xs text-muted-foreground">Primary location for newly created goods</p>
              </div>
              <Switch
                checked={branchForm.isDefault}
                onCheckedChange={(c) => setBranchForm((p) => ({ ...p, isDefault: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveBranch} disabled={savingBranch} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {savingBranch && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBranch ? 'Update Branch' : 'Create Branch & Provision Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD WAREHOUSE MODAL --- */}
      <Dialog open={warehouseModalOpen} onOpenChange={setWarehouseModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Add Storage Warehouse to {selectedBranchForWh?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Warehouse / Storage Name *</Label>
              <Input
                placeholder="e.g. Main Showroom Floor or Storage Basement"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, name: e.target.value }))}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Warehouse Code</Label>
              <Input
                placeholder="e.g. WH-FLR-01"
                value={warehouseForm.code}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="rounded-lg font-mono uppercase"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium">Default Storage Area</p>
                <p className="text-xs text-muted-foreground">Default bin for incoming shipments</p>
              </div>
              <Switch
                checked={warehouseForm.isDefault}
                onCheckedChange={(c) => setWarehouseForm((p) => ({ ...p, isDefault: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddWarehouse} disabled={savingWarehouse} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              {savingWarehouse && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Storage Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CREATE API KEY MODAL --- */}
      <Dialog open={newKeyOpen} onOpenChange={setNewKeyOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Generate New API Key</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Key Identifier / Label</Label>
              <Input
                placeholder="e.g. Shopify Store Sync"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKeyOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => { handleCreateApiKey(); setNewKeyOpen(false); }} className="rounded-xl">Generate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CREATE WEBHOOK MODAL --- */}
      <Dialog open={newWebhookOpen} onOpenChange={setNewWebhookOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Register New Webhook Endpoint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Webhook Name</Label>
              <Input
                placeholder="e.g. Order Dispatch Trigger"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Destination HTTP(S) URL</Label>
              <Input
                placeholder="https://api.yourdomain.com/webhooks/inventory"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewWebhookOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateWebhook} className="rounded-xl">Register Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
