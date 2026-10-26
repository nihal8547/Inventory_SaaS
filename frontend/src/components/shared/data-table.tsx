"use client";
import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  toolbarActions?: React.ReactNode;

  // Server-side pagination
  serverPagination?: boolean;
  page?: number;               // 1-indexed current page
  pageSize?: number;           // Current limit/size
  totalRows?: number;          // Total count from server
  totalPages?: number;         // Total pages from server
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];

  // Server-side search
  searchValue?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;

  // Client-side search fallback
  searchKey?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  loading = false,
  onRowClick,
  emptyMessage = "No records found",
  toolbarActions,

  // Server-side controls
  serverPagination,
  page = 1,
  pageSize = 10,
  totalRows,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],

  // Server search
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search records...",

  // Client search fallback
  searchKey,
}: DataTableProps<TData, TValue>) {
  const effectiveLoading = isLoading || loading;
  const isServerSide = serverPagination ?? Boolean(onPageChange);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Debounced search state for server-side search
  const [localSearch, setLocalSearch] = React.useState(searchValue ?? "");

  // Sync incoming searchValue if changed externally
  React.useEffect(() => {
    if (searchValue !== undefined && searchValue !== localSearch) {
      setLocalSearch(searchValue);
    }
  }, [searchValue]);

  // Debounce server search trigger
  React.useEffect(() => {
    if (!onSearchChange) return;
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const computedTotalPages = totalPages ?? Math.max(1, Math.ceil((totalRows || 0) / pageSize));

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerSide
      ? {
          manualPagination: true,
          pageCount: computedTotalPages,
          manualFiltering: true,
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          initialState: { pagination: { pageSize } },
        }),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      ...(isServerSide
        ? {
            pagination: {
              pageIndex: Math.max(0, page - 1),
              pageSize,
            },
          }
        : {}),
    },
  });

  // Calculate entry range display
  const startRow = isServerSide
    ? (totalRows || 0) === 0 ? 0 : (page - 1) * pageSize + 1
    : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1;

  const endRow = isServerSide
    ? Math.min(page * pageSize, totalRows || 0)
    : Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length);

  const totalDisplay = isServerSide
    ? totalRows ?? data.length
    : table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3.5">
      {/* Toolbar / Search Header */}
      {(onSearchChange || searchKey || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {onSearchChange ? (
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9 pr-8 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg shadow-xs"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    onSearchChange("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : searchKey ? (
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
                className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg shadow-xs"
              />
            </div>
          ) : <div />}

          {toolbarActions && <div className="flex items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200/90 dark:border-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-200/90 dark:border-slate-800">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {effectiveLoading ? (
              Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                <TableRow key={i} className="border-slate-100 dark:border-slate-800/60">
                  {columns.map((_, j) => (
                    <TableCell key={j} className="p-3.5 px-4">
                      <Skeleton className="h-4 w-full rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3.5 px-4 text-sm text-slate-700 dark:text-slate-200">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm font-medium text-slate-400 dark:text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-700 dark:text-slate-300">{startRow}</span> to{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">{endRow}</span> of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">{totalDisplay}</span> entries
          </p>

          {/* Rows per page selector */}
          {onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Show:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => onPageSizeChange(Number(val))}
              >
                <SelectTrigger className="h-7 w-16 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Pagination Navigation */}
        <div className="flex items-center gap-1.5">
          {isServerSide ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(1)}
                disabled={page <= 1 || effectiveLoading}
                className="h-8 w-8 p-0 text-xs rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.max(1, page - 1))}
                disabled={page <= 1 || effectiveLoading}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <div className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-w-16 text-center">
                {page} / {computedTotalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.min(computedTotalPages, page + 1))}
                disabled={page >= computedTotalPages || effectiveLoading}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(computedTotalPages)}
                disabled={page >= computedTotalPages || effectiveLoading}
                className="h-8 w-8 p-0 text-xs rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <div className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-w-16 text-center">
                {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
