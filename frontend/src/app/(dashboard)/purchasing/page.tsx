'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { PurchaseOrder } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'info'> = {
  DRAFT: 'default',
  CONFIRMED: 'info',
  PARTIAL: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'destructive',
};

const columns: ColumnDef<PurchaseOrder>[] = [
  { accessorKey: 'poNumber', header: 'PO Number' },
  {
    id: 'supplier',
    header: 'Supplier',
    cell: ({ row }) => (row.original as any).supplier?.name ?? '—',
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => formatCurrency((row.original as any).total ?? row.original.totalAmount ?? 0),
  },
  {
    accessorKey: 'expectedDate',
    header: 'Expected Date',
    cell: ({ row }) => row.original.expectedDate ? formatDate(row.original.expectedDate) : '—',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusColors[row.original.status] ?? 'default'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export default function PurchasingPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchasing/orders', {
        page,
        limit: 20,
        search: search.trim() || undefined,
      });
      const d = (res.data as any)?.data ?? res.data;
      setOrders(d?.data ?? (Array.isArray(d) ? d : []));
      setTotal((res.data as any)?.data?.meta?.total ?? d?.meta?.total ?? 0);
      setTotalPages((res.data as any)?.data?.meta?.totalPages ?? d?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage supplier purchase orders and goods receipts"
        action={
          <Link href="/purchasing/orders">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
              <Plus className="mr-2 h-4 w-4" /> Manage & Create Orders
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={orders}
            loading={loading}
            page={page}
            pageSize={20}
            totalRows={total}
            totalPages={totalPages}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder="Search by PO # or supplier..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
