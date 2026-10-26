'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Barcode as BarcodeIcon, Printer, Search, RotateCcw } from 'lucide-react';
import { Barcode } from '@/types';
import { barcodesService } from '@/services/barcodes.service';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { handleApiError } from '@/lib/api';
import { ColumnDef } from '@tanstack/react-table';
import { usePagination } from '@/hooks/use-pagination';

const columns: ColumnDef<Barcode>[] = [
  { accessorKey: 'barcodeValue', header: 'Barcode', cell: ({ row }) => <span className="font-mono text-xs">{row.original.barcodeValue}</span> },
  { accessorKey: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name ?? row.original.productId },
  { accessorKey: 'barcodeFormat', header: 'Format', cell: ({ row }) => <Badge variant="outline">{row.original.barcodeFormat}</Badge> },
  { accessorKey: 'barcodeType', header: 'Type', cell: ({ row }) => row.original.barcodeType },
  { accessorKey: 'isPrimary', header: 'Primary', cell: ({ row }) => row.original.isPrimary ? <Badge>Primary</Badge> : '—' },
];

export default function BarcodesPage() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formatFilter, setFormatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<Barcode | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  const fetchBarcodes = useCallback(() => {
    setLoading(true);
    barcodesService.list({
      page,
      limit,
      search: search.trim() || undefined,
      format: formatFilter !== 'all' ? formatFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
    })
      .then((r) => {
        const resData = (r.data as any)?.data;
        const list = resData?.data ?? resData ?? [];
        setBarcodes(Array.isArray(list) ? list : []);
        setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
        setTotalPages(resData?.meta?.totalPages ?? 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, limit, search, formatFilter, typeFilter]);

  useEffect(() => {
    fetchBarcodes();
  }, [fetchBarcodes]);

  const handleLookup = async () => {
    if (!lookup.trim()) return;
    setLookupLoading(true);
    try {
      const r = await barcodesService.lookup(lookup.trim());
      setLookupResult((r.data as any)?.data ?? r.data);
    } catch (err) {
      toast.error(handleApiError(err));
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barcode Management"
        description="View, generate and print barcodes for your products"
      />

      <div className="flex gap-2 items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium">Quick Scanner / Barcode Lookup</p>
          <div className="flex gap-2">
            <Input
              placeholder="Scan or enter barcode value..."
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="w-72"
            />
            <Button onClick={handleLookup} disabled={lookupLoading} variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {lookupResult && (
        <div className="border rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">Barcode Identified!</p>
          <p>Product: <span className="font-bold">{lookupResult.product?.name}</span> (SKU: {lookupResult.product?.sku})</p>
          <p>Format: {lookupResult.barcodeFormat} · Type: {lookupResult.barcodeType}</p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={barcodes}
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
        searchPlaceholder="Search barcodes by value, product name, or SKU..."
        toolbarActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={formatFilter}
              onValueChange={(val) => {
                setFormatFilter(val);
                reset();
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="CODE128">CODE128</SelectItem>
                <SelectItem value="EAN13">EAN-13</SelectItem>
                <SelectItem value="UPC_A">UPC-A</SelectItem>
                <SelectItem value="QR_CODE">QR Code</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                reset();
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PRODUCT">Product SKU</SelectItem>
                <SelectItem value="SERIAL">Serial Number</SelectItem>
                <SelectItem value="BIN">Bin / Location</SelectItem>
              </SelectContent>
            </Select>

            {(search || formatFilter !== 'all' || typeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFormatFilter('all');
                  setTypeFilter('all');
                  reset();
                }}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Filters
              </Button>
            )}
          </div>
        }
        emptyMessage="No barcodes generated or found matching query"
      />
    </div>
  );
}
