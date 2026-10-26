'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Award,
  ShoppingBag,
  Edit2,
  Trash2,
  Loader2,
  FileText,
  RotateCcw
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints: number;
  createdAt: string;
  _count?: { sales: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-side Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loyaltyTierFilter, setLoyaltyTierFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Doha');
  const [preferredChannel, setPreferredChannel] = useState('WhatsApp');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Customer History Drawer/Modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/sales/customers', params);
      const resData = (res.data as any)?.data;
      const dataList = Array.isArray(resData) ? resData : (resData?.data ?? []);
      const meta = (res.data as any)?.data?.meta ?? (res.data as any)?.meta;

      setCustomers(dataList);
      if (meta) {
        setTotal(meta.total ?? dataList.length);
        setTotalPages(meta.totalPages ?? 1);
      }
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('Doha');
    setPreferredChannel('WhatsApp');
    setLoyaltyPoints(0);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCity('Doha');
    setPreferredChannel('WhatsApp');
    setLoyaltyPoints(c.loyaltyPoints || 0);
    setModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setSubmitting(true);
    try {
      const fullAddress = address.trim() ? `${address.trim()}, ${city}, Qatar` : `${city}, Qatar`;
      if (editingCustomer) {
        await api.patch(`/sales/customers/${editingCustomer.id}`, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: fullAddress,
          loyaltyPoints: Number(loyaltyPoints),
        });
        toast.success('Customer updated successfully');
      } else {
        await api.post('/sales/customers', {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: fullAddress,
          loyaltyPoints: Number(loyaltyPoints),
        });
        toast.success('New customer profile created');
      }

      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!confirm(`Are you sure you want to deactivate customer "${customerName}"?`)) return;
    try {
      await api.delete(`/sales/customers/${id}`);
      toast.success('Customer profile deactivated');
      fetchCustomers();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleViewHistory = async (id: string) => {
    setLoadingHistory(true);
    setHistoryOpen(true);
    try {
      const res = await api.get(`/sales/customers/${id}`);
      setSelectedCustomer((res.data as any)?.data ?? res.data);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }: any) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
              {c.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{c.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Location / City',
      cell: ({ row }: any) => {
        const addr = row.original.address;
        return addr ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{addr}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Qatar</span>
        );
      },
    },
    {
      accessorKey: 'loyaltyPoints',
      header: 'Loyalty Club',
      cell: ({ row }: any) => {
        const pts = row.original.loyaltyPoints || 0;
        const isVip = pts >= 1000;
        return (
          <Badge
            variant="outline"
            className={
              isVip
                ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold gap-1'
                : 'text-slate-600 border-slate-200 gap-1 font-mono text-xs'
            }
          >
            <Award className="h-3 w-3" />
            {pts} pts {isVip && '• VIP'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'salesCount',
      header: 'Orders',
      cell: ({ row }: any) => {
        const count = row.original._count?.sales ?? 0;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistory(row.original.id)}
            className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg"
          >
            <ShoppingBag className="h-3.5 w-3.5 mr-1" />
            {count} invoices
          </Button>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined Date',
      cell: ({ row }: any) => (
        <span className="text-xs text-slate-500 font-mono">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: any) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(c)}
              className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-lg"
              title="Edit Profile"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(c.id, c.name)}
              className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg"
              title="Deactivate"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const displayedCustomers = customers.filter((c) => {
    const pts = c.loyaltyPoints || 0;
    if (loyaltyTierFilter === 'vip') return pts >= 1000;
    if (loyaltyTierFilter === 'silver') return pts >= 500 && pts < 1000;
    if (loyaltyTierFilter === 'regular') return pts < 500;
    return true;
  });

  const hasFilters = search || loyaltyTierFilter !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer profiles and purchase history"
        action={
          <Button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{total}</p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600">VIP Club Members</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {customers.filter((c) => (c.loyaltyPoints || 0) >= 1000).length}
          </p>
        </Card>
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-blue-600">Total Awarded Points</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0).toLocaleString()}
          </p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={displayedCustomers}
        loading={loading}
        serverPagination
        page={page}
        pageSize={limit}
        totalRows={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setLimit(newSize);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={(query) => {
          setSearch(query);
          setPage(1);
        }}
        searchPlaceholder="Search customer by name, mobile number, or email..."
        toolbarActions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Club Tier:</span>
            <Select
              value={loyaltyTierFilter}
              onValueChange={(val) => setLoyaltyTierFilter(val)}
            >
              <SelectTrigger className="h-9 w-40 rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loyalty Tiers</SelectItem>
                <SelectItem value="vip">VIP Club (1000+ pts)</SelectItem>
                <SelectItem value="silver">Silver Club (500-999)</SelectItem>
                <SelectItem value="regular">Standard (&lt; 500 pts)</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setLoyaltyTierFilter('all');
                  setPage(1);
                }}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 rounded-lg"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        }
      />

      {/* CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              {editingCustomer ? 'Edit Customer Profile' : 'New Customer Profile'}
            </DialogTitle>
            <DialogDescription>
              Store contact details and loyalty account configurations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g. Sheikh Nasser Al-Thani"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mobile Number</Label>
                <Input
                  placeholder="+974 5511 2233"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 font-mono rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="nasser@example.qa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">City / Location</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Doha">Doha</SelectItem>
                    <SelectItem value="The Pearl">The Pearl-Qatar</SelectItem>
                    <SelectItem value="Lusail">Lusail</SelectItem>
                    <SelectItem value="West Bay">West Bay</SelectItem>
                    <SelectItem value="Al Rayyan">Al Rayyan</SelectItem>
                    <SelectItem value="Al Wakrah">Al Wakrah</SelectItem>
                    <SelectItem value="Al Khor">Al Khor</SelectItem>
                    <SelectItem value="Umm Salal">Umm Salal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Preferred Channel</Label>
                <Select value={preferredChannel} onValueChange={setPreferredChannel}>
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp Message</SelectItem>
                    <SelectItem value="SMS">SMS Text</SelectItem>
                    <SelectItem value="Email">Email Receipt</SelectItem>
                    <SelectItem value="Phone">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Delivery Address / Villa / Area</Label>
              <Input
                placeholder="e.g. West Bay Lagoon, Street 14, Villa 8"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Opening Loyalty Points</Label>
              <Input
                type="number"
                min="0"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                className="mt-1 font-mono rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomer}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAST INVOICES HISTORY MODAL */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-500" />
              Invoice Purchase History: {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Recent retail transactions and payment methods in QAR
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-slate-500">Loading purchase ledger...</span>
            </div>
          ) : selectedCustomer?.sales?.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm">
              No sales recorded for this customer yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedCustomer?.sales?.map((sale: any) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {sale.saleNumber}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(sale.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(sale.total)}
                    </p>
                    <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
                      {sale.payments?.[0]?.method || 'PAID'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
