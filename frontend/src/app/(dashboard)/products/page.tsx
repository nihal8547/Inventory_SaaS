'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Filter, RotateCcw, Tag, Building, Layers, FileSpreadsheet } from 'lucide-react';
import { Product, Category, Brand } from '@/types';
import { productsService } from '@/services/products.service';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { usePagination } from '@/hooks/use-pagination';

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
        {row.original.sku}
      </span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Product Name',
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-sm text-slate-900 dark:text-white">{row.original.name}</p>
        {row.original.description && (
          <p className="text-xs text-slate-400 truncate max-w-xs">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {row.original.category?.name ?? 'Uncategorized'}
      </span>
    ),
  },
  {
    accessorKey: 'brand',
    header: 'Brand',
    cell: ({ row }) => (
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {row.original.brand?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'costPrice',
    header: 'Cost (QAR)',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-500">
        QAR {Number(row.original.costPrice || 0).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: 'sellingPrice',
    header: 'Selling Price (QAR)',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
        QAR {Number(row.original.sellingPrice || 0).toFixed(2)}
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
    cell: ({ row }) => (
      <Link href={`/products/${row.original.id}`}>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 rounded-lg">
          View & Edit
        </Button>
      </Link>
    ),
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  const { page, limit, goToPage, setLimit, reset } = usePagination(1, 10);

  // Fetch Aux Data (Categories & Brands)
  useEffect(() => {
    Promise.all([
      productsService.listCategories(),
      productsService.listBrands(),
    ])
      .then(([cr, br]) => {
        const cList = (cr.data as any)?.data ?? cr.data ?? [];
        const bList = (br.data as any)?.data ?? br.data ?? [];
        setCategories(Array.isArray(cList) ? cList : []);
        setBrands(Array.isArray(bList) ? bList : []);
      })
      .catch(console.error);
  }, []);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params: any = {
      page,
      limit,
      search: search.trim() || undefined,
    };
    if (selectedCategory !== 'all') params.categoryId = selectedCategory;
    if (selectedBrand !== 'all') params.brandId = selectedBrand;

    productsService
      .list(params)
      .then((res) => {
        const d = (res.data as any)?.data ?? res.data;
        setProducts(d?.data ?? d ?? []);
        setTotal(d?.meta?.total ?? 0);
        setTotalPages(d?.meta?.totalPages ?? 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, limit, search, selectedCategory, selectedBrand]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    reset();
  };

  const hasActiveFilters = search || selectedCategory !== 'all' || selectedBrand !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${total} total items registered in catalog`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/settings?tab=excel-import">
              <Button variant="outline" size="sm" className="rounded-xl shadow-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                Import Excel
              </Button>
            </Link>
            <Link href="/products/barcodes">
              <Button variant="outline" size="sm" className="rounded-xl shadow-xs">
                Barcodes Manager
              </Button>
            </Link>
            <Link href="/products/new">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Product
              </Button>
            </Link>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        page={page}
        pageSize={limit}
        totalRows={total}
        totalPages={totalPages}
        onPageChange={goToPage}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit);
          reset();
        }}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          reset();
        }}
        searchPlaceholder="Search catalog by name, SKU, or description..."
        toolbarActions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Category:</span>
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  reset();
                }}
              >
                <SelectTrigger className="h-9 w-40 rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Brand:</span>
              <Select
                value={selectedBrand}
                onValueChange={(val) => {
                  setSelectedBrand(val);
                  reset();
                }}
              >
                <SelectTrigger className="h-9 w-36 rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
