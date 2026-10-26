'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Building2, Phone, Mail, MapPin, Edit2, Loader2, User, RotateCcw, Filter, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Supplier } from '@/types';
import { api, handleApiError } from '@/lib/api';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { usePagination } from '@/hooks/use-pagination';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: 'Doha',
    paymentTerms: 'Net 30 Days',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      const res = await api.get('/purchasing/suppliers', params);
      const resData = (res.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setSuppliers(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSaveSupplier = async () => {
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        contactPerson: form.contactPerson,
        email: form.email,
        phone: form.phone,
        address: `${form.address ? form.address + ', ' : ''}${form.city}, Qatar`,
      };
      if (editingSupplier) {
        await api.patch(`/purchasing/suppliers/${editingSupplier.id}`, payload);
        toast.success(`Supplier "${form.name}" updated successfully`);
      } else {
        await api.post('/purchasing/suppliers', payload);
        toast.success(`Supplier "${form.name}" registered`);
      }
      setModalOpen(false);
      setEditingSupplier(null);
      setForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: 'Doha',
        paymentTerms: 'Net 30 Days',
        isActive: true,
      });
      fetchSuppliers();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const displayedSuppliers = suppliers.filter((s) => {
    if (statusFilter === 'active') return s.isActive;
    if (statusFilter === 'inactive') return !s.isActive;
    return true;
  });

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'name',
      header: 'Supplier / Vendor',
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            {row.original.name}
          </span>
          {row.original.address && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-slate-400" />
              {row.original.address}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'contactPerson',
      header: 'Representative',
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-slate-400" />
          {row.original.contactPerson || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Direct Email',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          {row.original.email ? (
            <>
              <Mail className="h-3 w-3 text-slate-400" />
              {row.original.email}
            </>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Contact Phone',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
          {row.original.phone || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs rounded-lg text-slate-500 hover:text-blue-600"
            onClick={() => {
              setEditingSupplier(s);
              setForm({
                name: s.name,
                contactPerson: s.contactPerson || '',
                email: s.email || '',
                phone: s.phone || '',
                address: s.address || '',
                city: 'Doha',
                paymentTerms: 'Net 30 Days',
                isActive: s.isActive,
              });
              setModalOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        );
      },
    },
  ];

  const hasFilters = search || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Vendors"
        description="Maintain authorized vendor directories, payment terms, and procurement contracts in Qatar"
        action={
          <Button
            onClick={() => {
              setEditingSupplier(null);
              setForm({
                name: '',
                contactPerson: '',
                email: '',
                phone: '',
                address: '',
                city: 'Doha',
                paymentTerms: 'Net 30 Days',
                isActive: true,
              });
              setModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={displayedSuppliers}
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
        searchPlaceholder="Search suppliers by company name, contact, email..."
        toolbarActions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Status:</span>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
              }}
            >
              <SelectTrigger className="h-9 w-36 rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
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
        emptyMessage="No suppliers found matching your query"
      />

      {/* --- ADD / EDIT SUPPLIER MODAL --- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
            </DialogTitle>
            <DialogDescription>
              Enter supplier business details, Qatar location, and direct representative contact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Company / Supplier Name *</Label>
              <Input
                placeholder="e.g. Gulf Trading & Imports W.L.L"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input
                  placeholder="e.g. Mohammed Al-Kuwari"
                  value={form.contactPerson}
                  onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
                  className="rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Terms</Label>
                <Select
                  value={form.paymentTerms}
                  onValueChange={(val) => setForm((p) => ({ ...p, paymentTerms: val }))}
                >
                  <SelectTrigger className="rounded-lg h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 30 Days">Net 30 Days Credit</SelectItem>
                    <SelectItem value="Net 15 Days">Net 15 Days Credit</SelectItem>
                    <SelectItem value="Net 60 Days">Net 60 Days Credit</SelectItem>
                    <SelectItem value="Cash on Delivery">Cash on Delivery (COD)</SelectItem>
                    <SelectItem value="Advance Wire">Advance Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  placeholder="orders@supplier.qa"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  placeholder="+974 4433 2211"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City / Municipality</Label>
                <Select
                  value={form.city}
                  onValueChange={(val) => setForm((p) => ({ ...p, city: val }))}
                >
                  <SelectTrigger className="rounded-lg h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Doha">Doha</SelectItem>
                    <SelectItem value="Industrial Area">Industrial Area</SelectItem>
                    <SelectItem value="Al Rayyan">Al Rayyan</SelectItem>
                    <SelectItem value="Al Wakrah">Al Wakrah</SelectItem>
                    <SelectItem value="Al Khor">Al Khor</SelectItem>
                    <SelectItem value="Lusail">Lusail</SelectItem>
                    <SelectItem value="Umm Salal">Umm Salal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Street / Building Address</Label>
                <Input
                  placeholder="e.g. Street 15, Gate 4"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Active Vendor Status</p>
                <p className="text-[11px] text-slate-400">Permit issuance of new purchase orders</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(c) => setForm((p) => ({ ...p, isActive: c }))}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
