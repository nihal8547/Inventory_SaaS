'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  PackagePlus,
  Building2,
  Barcode,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Boxes,
  ArrowRight,
  History,
  TrendingUp,
  TrendingDown,
  Warehouse,
  AlertTriangle,
  FileText,
  Eye,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Copy
} from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Branch, Product } from '@/types';
import { formatDate } from '@/lib/utils';

interface EntryLine {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  quantity: number; // positive for in, negative for out
  direction: 'in' | 'out';
  unitCost: number;
  reason: string;
}

interface PastAdjustment {
  id: string;
  adjustmentNumber: string;
  branchId: string;
  reason: string;
  notes?: string;
  status: string;
  createdAt: string;
  branch?: { id: string; name: string; code: string };
  lines: {
    id: string;
    productId: string;
    quantity: number;
    reason?: string;
    product?: {
      id: string;
      name: string;
      sku: string;
      costPrice: number;
      sellingPrice: number;
    };
  }[];
}

const INFLOW_REASONS = [
  { value: 'Opening Stock', label: 'Opening Inventory Initial Load' },
  { value: 'Physical Count Surplus', label: 'Surplus Discovered in Audit' },
  { value: 'Supplier Bonus / Sample', label: 'Supplier Sample / Promotional Inflow' },
  { value: 'Customer Return Restock', label: 'Customer Return Restocked to Shelf' },
  { value: 'Found Unrecorded Inventory', label: 'Found Unrecorded Inventory' },
];

const OUTFLOW_REASONS = [
  { value: 'Damaged Goods Write-off', label: 'Damaged or Broken in Storage' },
  { value: 'Expired Batch Scrap', label: 'Expired Past Shelf-life' },
  { value: 'Audit Shrinkage Deficit', label: 'Discrepancy / Physical Shrinkage' },
  { value: 'Internal Store Use', label: 'Used Internally for Store Operations' },
  { value: 'Defective Return to Vendor', label: 'Defective Stock Write-off' },
];

function StockEntryContent() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('product');

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Configuration
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'in' | 'out'>('in');
  const [primaryReason, setPrimaryReason] = useState('Opening Stock');
  const [entryNotes, setEntryNotes] = useState('');
  const [lines, setLines] = useState<EntryLine[]>([]);

  // Item Picker State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentStockOnHand, setCurrentStockOnHand] = useState<number | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const [itemUnits, setItemUnits] = useState(10);
  const [itemLineReason, setItemLineReason] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History State
  const [adjustments, setAdjustments] = useState<PastAdjustment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyBranchFilter, setHistoryBranchFilter] = useState('ALL');
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingAdj, setInspectingAdj] = useState<PastAdjustment | null>(null);

  // Load initial branches and products
  useEffect(() => {
    Promise.all([
      api.get('/branches'),
      api.get('/products?limit=250'),
    ])
      .then(([br, pr]) => {
        const bList = (br.data as any)?.data?.data ?? (br.data as any)?.data ?? [];
        const pList = (pr.data as any)?.data?.data ?? (pr.data as any)?.data ?? [];
        const cleanBranches = Array.isArray(bList) ? bList : [];
        const cleanProducts = Array.isArray(pList) ? pList : [];

        setBranches(cleanBranches);
        setProducts(cleanProducts);

        if (cleanBranches.length > 0) {
          const def = cleanBranches.find((b: any) => b.isDefault) || cleanBranches[0];
          setSelectedBranchId(def.id);
          if (def.warehouses && def.warehouses.length > 0) {
            setSelectedWarehouseId(def.warehouses[0].id);
          }
        }

        if (preselectedProductId && cleanProducts.length > 0) {
          const matched = cleanProducts.find((p: any) => p.id === preselectedProductId);
          if (matched) setSelectedProduct(matched);
        }
      })
      .catch((err) => toast.error(handleApiError(err)))
      .finally(() => setLoading(false));
  }, [preselectedProductId]);

  // When branch changes, update default warehouse
  useEffect(() => {
    if (!selectedBranchId) return;
    const currentBranch = branches.find((b) => b.id === selectedBranchId) as any;
    if (currentBranch?.warehouses && currentBranch.warehouses.length > 0) {
      setSelectedWarehouseId(currentBranch.warehouses[0].id);
    } else {
      setSelectedWarehouseId('');
    }
  }, [selectedBranchId, branches]);

  // When product or branch changes, fetch current on-hand stock
  useEffect(() => {
    if (!selectedProduct || !selectedBranchId) {
      setCurrentStockOnHand(null);
      return;
    }
    setCheckingStock(true);
    api
      .get(`/inventory/stock?productId=${selectedProduct.id}&branchId=${selectedBranchId}`)
      .then((res) => {
        const stockData = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        if (Array.isArray(stockData) && stockData.length > 0) {
          const totalOnHand = stockData.reduce((acc, row) => acc + Number(row.onHand || 0), 0);
          setCurrentStockOnHand(totalOnHand);
        } else {
          setCurrentStockOnHand(0);
        }
      })
      .catch(() => setCurrentStockOnHand(0))
      .finally(() => setCheckingStock(false));
  }, [selectedProduct, selectedBranchId]);

  // Toggle Direction effect: update primary reason default
  const handleDirectionChange = (dir: 'in' | 'out') => {
    setAdjustmentDirection(dir);
    if (dir === 'in') {
      setPrimaryReason('Opening Stock');
    } else {
      setPrimaryReason('Damaged Goods Write-off');
    }
  };

  // Barcode / SKU scan lookup
  const handleBarcodeLookup = (code: string) => {
    setBarcodeSearch(code);
    if (!code) return;
    const match = products.find(
      (p) =>
        p.sku.toLowerCase() === code.trim().toLowerCase() ||
        (p as any).barcode?.toLowerCase() === code.trim().toLowerCase()
    );
    if (match) {
      setSelectedProduct(match);
      toast.info(`Selected: ${match.name}`);
    }
  };

  // Add line to batch
  const handleAddLine = () => {
    if (!selectedProduct) {
      toast.error('Please choose or scan an item first');
      return;
    }
    if (itemUnits <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    const effectiveQty = adjustmentDirection === 'in' ? itemUnits : -itemUnits;

    // Safety check for write-offs
    if (adjustmentDirection === 'out' && currentStockOnHand !== null) {
      const existingInBatch = lines
        .filter((l) => l.productId === selectedProduct.id)
        .reduce((sum, l) => sum + l.quantity, 0);
      const resultingStock = currentStockOnHand + existingInBatch + effectiveQty;
      if (resultingStock < 0) {
        toast.warning(
          `Notice: Stock balance will go below zero (${resultingStock} units). Ensure physical count is verified.`
        );
      }
    }

    const existingIndex = lines.findIndex(
      (l) => l.productId === selectedProduct.id && l.direction === adjustmentDirection
    );

    if (existingIndex >= 0) {
      const updated = [...lines];
      updated[existingIndex].quantity += effectiveQty;
      setLines(updated);
      toast.success(`Updated batch quantity for ${selectedProduct.name}`);
    } else {
      setLines([
        ...lines,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          sku: selectedProduct.sku,
          currentStock: currentStockOnHand ?? 0,
          quantity: effectiveQty,
          direction: adjustmentDirection,
          unitCost: Number(selectedProduct.costPrice || 0),
          reason: itemLineReason || primaryReason,
        },
      ]);
      toast.success(`Added ${selectedProduct.name} to adjustment batch`);
    }

    setSelectedProduct(null);
    setBarcodeSearch('');
    setItemUnits(10);
    setItemLineReason('');
    setCurrentStockOnHand(null);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  // Commit Stock Entry
  const handleSubmitStockEntry = async () => {
    if (!selectedBranchId) {
      toast.error('Please select a target destination branch');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one product line to commit');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/adjustments', {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId || undefined,
        reason: primaryReason,
        notes: entryNotes,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          reason: l.reason,
        })),
      });

      toast.success(`Successfully posted stock adjustment (${lines.length} items committed to ledger)!`);
      setLines([]);
      setEntryNotes('');
      fetchAdjustmentHistory();
      setActiveTab('history');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Adjustment History
  const fetchAdjustmentHistory = async () => {
    setLoadingHistory(true);
    try {
      let url = '/inventory/adjustments?limit=50';
      if (historyBranchFilter && historyBranchFilter !== 'ALL') {
        url += `&branchId=${historyBranchFilter}`;
      }
      if (historySearch) {
        url += `&search=${encodeURIComponent(historySearch)}`;
      }
      const res = await api.get(url);
      const data = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
      setAdjustments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAdjustmentHistory();
    }
  }, [activeTab, historyBranchFilter]);

  // Derived metrics for summary cards
  const summaryMetrics = useMemo(() => {
    const totalAdjustments = adjustments.length;
    let totalInflowUnits = 0;
    let totalOutflowUnits = 0;

    adjustments.forEach((adj) => {
      adj.lines?.forEach((line) => {
        const q = Number(line.quantity || 0);
        if (q > 0) totalInflowUnits += q;
        else totalOutflowUnits += Math.abs(q);
      });
    });

    return { totalAdjustments, totalInflowUnits, totalOutflowUnits };
  }, [adjustments]);

  // Batch summary calculations
  const totalBatchUnitsIn = lines.filter((l) => l.quantity > 0).reduce((s, l) => s + l.quantity, 0);
  const totalBatchUnitsOut = lines.filter((l) => l.quantity < 0).reduce((s, l) => s + Math.abs(l.quantity), 0);
  const totalBatchValuationQAR = lines.reduce((s, l) => s + Math.abs(l.quantity) * l.unitCost, 0);

  const selectedBranchData = branches.find((b) => b.id === selectedBranchId) as any;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Entry"
        description="Record opening stock, adjust counts, and process inventory adjustments"
      />

      {/* --- QUICK KPI SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adjustment Batches</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {summaryMetrics.totalAdjustments}
              </h3>
              <p className="text-[11px] text-slate-400">Total ledger adjustment records</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Inflow (+)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +{summaryMetrics.totalInflowUnits.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-600/80 font-medium">Units added via entry & surplus</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Written-off (-)</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                -{summaryMetrics.totalOutflowUnits.toLocaleString()}
              </h3>
              <p className="text-[11px] text-rose-600/80 font-medium">Units removed (damage / scrap)</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currency Base</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">QAR (ر.ق)</h3>
              <p className="text-[11px] text-slate-400">Standard Qatari Riyal</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- TABS --- */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <TabsTrigger
            value="create"
            className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
          >
            <PackagePlus className="h-4 w-4 text-blue-600" />
            Create Stock Entry / Adjustment
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
          >
            <History className="h-4 w-4 text-indigo-600" />
            Adjustment Audit History
          </TabsTrigger>
        </TabsList>

        {/* ======================= TAB 1: CREATE ======================= */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Setup & Product Picker */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card 1: Destination & Nature */}
              <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Branch & Nature of Adjustment
                  </CardTitle>
                  <CardDescription>Select the location and choose entry or write-off</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Branch & Warehouse */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Target Branch *</Label>
                      <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                        <SelectTrigger className="rounded-lg h-9">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Storage Warehouse</Label>
                      <Select
                        value={selectedWarehouseId}
                        onValueChange={setSelectedWarehouseId}
                        disabled={!selectedBranchData?.warehouses?.length}
                      >
                        <SelectTrigger className="rounded-lg h-9">
                          <SelectValue placeholder="Default Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedBranchData?.warehouses?.map((wh: any) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name} {wh.isDefault ? '(Main)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Direction Selector (Inflow vs Outflow) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Adjustment Type / Direction *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDirectionChange('in')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          adjustmentDirection === 'in'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span>➕ Stock Inflow (Add)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDirectionChange('out')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          adjustmentDirection === 'out'
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <TrendingDown className="h-4 w-4 text-rose-600" />
                        <span>➖ Stock Outflow (Deduct)</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Reason */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Primary Reason / Category *</Label>
                    <Select value={primaryReason} onValueChange={setPrimaryReason}>
                      <SelectTrigger className="rounded-lg h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustmentDirection === 'in'
                          ? INFLOW_REASONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))
                          : OUTFLOW_REASONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes / Reference */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Audit Memo / Reference Ref</Label>
                    <Input
                      placeholder="e.g. Audit ledger ref #QAT-2026-OCT or Damage report #04"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      className="rounded-lg text-sm h-9"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Pick or Scan Product */}
              <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-emerald-600" />
                    Scan Barcode or Search Catalog
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Barcode / SKU Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Scan Barcode / SKU</Label>
                    <div className="relative">
                      <Input
                        placeholder="Scan barcode or type exact SKU..."
                        value={barcodeSearch}
                        onChange={(e) => handleBarcodeLookup(e.target.value)}
                        className="rounded-lg text-sm pl-8 font-mono h-9"
                      />
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Catalog Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Or Pick from Catalog</Label>
                    <Select
                      value={selectedProduct?.id || ''}
                      onValueChange={(val) => {
                        const found = products.find((p) => p.id === val);
                        setSelectedProduct(found || null);
                      }}
                    >
                      <SelectTrigger className="rounded-lg h-9">
                        <SelectValue placeholder="Browse catalog items..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Item Stock & Valuation Badge */}
                  {selectedProduct && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {selectedProduct.name}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">SKU: {selectedProduct.sku}</p>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          Cost: QAR {Number(selectedProduct.costPrice || 0).toFixed(2)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Boxes className="h-3.5 w-3.5 text-slate-400" />
                          Branch Current On-Hand:
                        </span>
                        {checkingStock ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-white">
                            {currentStockOnHand ?? 0} units
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quantity to adjust */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        {adjustmentDirection === 'in' ? 'Units to Add (+)' : 'Units to Deduct (-)'}
                      </Label>
                      <div className="flex items-center gap-1">
                        {[5, 10, 25, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setItemUnits(num)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            +{num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={itemUnits}
                      onChange={(e) => setItemUnits(Math.max(1, parseInt(e.target.value) || 0))}
                      className="rounded-lg text-sm font-bold h-9"
                    />
                  </div>

                  {/* Line reason override */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Item Specific Note (Optional)</Label>
                    <Input
                      placeholder={`e.g. ${
                        adjustmentDirection === 'in' ? 'Found on shelf 2' : 'Cracked box / broken bottle'
                      }`}
                      value={itemLineReason}
                      onChange={(e) => setItemLineReason(e.target.value)}
                      className="rounded-lg text-xs h-8"
                    />
                  </div>

                  <Button
                    onClick={handleAddLine}
                    disabled={!selectedProduct}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl h-9"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Item to Adjustment Batch
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Adjustment Batch Table */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-blue-600" />
                        Adjustment Batch Ledger Items ({lines.length})
                      </CardTitle>
                      <CardDescription>
                        Review all line items, net stock changes, and value before posting
                      </CardDescription>
                    </div>
                    {lines.length > 0 && (
                      <div className="flex items-center gap-2">
                        {totalBatchUnitsIn > 0 && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            +{totalBatchUnitsIn} In
                          </Badge>
                        )}
                        {totalBatchUnitsOut > 0 && (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                            -{totalBatchUnitsOut} Out
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {lines.length === 0 ? (
                    <div className="p-12 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800 space-y-2">
                      <PackagePlus className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        No Items in Current Batch
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Scan items or browse your product catalog from the left panel. Added lines will appear
                        here ready for ledger verification.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                          <TableRow>
                            <TableHead className="text-xs font-semibold">Product</TableHead>
                            <TableHead className="text-xs font-semibold">Direction</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Adjustment</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Preview Stock</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Cost Value</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line, idx) => {
                            const newStock = line.currentStock + line.quantity;
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <div className="space-y-0.5">
                                    <p className="font-medium text-xs text-slate-900 dark:text-slate-100">
                                      {line.productName}
                                    </p>
                                    <p className="font-mono text-[10px] text-slate-400">{line.sku}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {line.direction === 'in' ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                      Stock In (+)
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                      Write-off (-)
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-bold text-xs">
                                  <span
                                    className={
                                      line.quantity > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }
                                  >
                                    {line.quantity > 0 ? `+${line.quantity}` : line.quantity}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  <span className="text-slate-400 font-mono text-[11px]">{line.currentStock} ➔ </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
                                    {newStock}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                                  QAR {(Math.abs(line.quantity) * line.unitCost).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded"
                                    onClick={() => handleRemoveLine(idx)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>

                {lines.length > 0 && (
                  <CardFooter className="pt-3 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <span>
                        Total Batch Valuation:{' '}
                        <strong className="text-slate-900 dark:text-white font-mono">
                          QAR {totalBatchValuationQAR.toFixed(2)}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => setLines([])}
                        className="rounded-xl text-xs h-9 flex-1 sm:flex-none"
                      >
                        Clear Batch
                      </Button>
                      <Button
                        onClick={handleSubmitStockEntry}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs text-xs h-9 flex-1 sm:flex-none"
                      >
                        {submitting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                        Commit Stock Entry to Ledger
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ======================= TAB 2: AUDIT HISTORY ======================= */}
        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-600" />
                    Past Stock Entries & Adjustment Logs
                  </CardTitle>
                  <CardDescription>
                    Permanent audit records of stock increments, physical reconciliations, and written-off inventory
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAdjustmentHistory}
                  disabled={loadingHistory}
                  className="rounded-lg text-xs gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div className="relative">
                  <Input
                    placeholder="Search adjustment # or notes..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="rounded-lg text-xs pl-8 h-8"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <div>
                  <Select value={historyBranchFilter} onValueChange={setHistoryBranchFilter}>
                    <SelectTrigger className="rounded-lg text-xs h-8">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Store Locations</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={fetchAdjustmentHistory}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs h-8"
                  >
                    Filter Logs
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loadingHistory ? (
                <div className="py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs text-slate-500">Loading ledger adjustments...</p>
                </div>
              ) : adjustments.length === 0 ? (
                <div className="py-16 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                  <History className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                    No Adjustment Logs Found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Recorded stock entries and adjustments will be chronologically logged here.
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Reference #</TableHead>
                        <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                        <TableHead className="text-xs font-semibold">Branch</TableHead>
                        <TableHead className="text-xs font-semibold">Reason & Notes</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Items Count</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Net Units</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustments.map((adj) => {
                        const netUnits = adj.lines?.reduce((sum, l) => sum + Number(l.quantity || 0), 0) ?? 0;
                        return (
                          <TableRow key={adj.id}>
                            <TableCell className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {adj.adjustmentNumber}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                              {formatDate(adj.createdAt)}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {adj.branch?.name ?? 'Branch'}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5 max-w-xs">
                                <Badge variant="secondary" className="text-[10px]">
                                  {adj.reason}
                                </Badge>
                                {adj.notes && (
                                  <p className="text-[11px] text-slate-500 truncate">{adj.notes}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {adj.lines?.length ?? 0}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs font-bold">
                              <span
                                className={
                                  netUnits > 0
                                    ? 'text-emerald-600'
                                    : netUnits < 0
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                                }
                              >
                                {netUnits > 0 ? `+${netUnits}` : netUnits}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                {adj.status || 'APPROVED'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                onClick={() => {
                                  setInspectingAdj(adj);
                                  setInspectModalOpen(true);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- INSPECT ADJUSTMENT MODAL --- */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Adjustment Batch Details
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                {inspectingAdj?.adjustmentNumber}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {inspectingAdj && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Branch:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectingAdj.branch?.name ?? 'Branch'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Date Committed:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(inspectingAdj.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Primary Reason:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{inspectingAdj.reason}</p>
                </div>
                {inspectingAdj.notes && (
                  <div className="col-span-full">
                    <span className="text-slate-400">Audit Memo / Notes:</span>
                    <p className="text-slate-700 dark:text-slate-300 italic">{inspectingAdj.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Adjusted Line Items ({inspectingAdj.lines?.length ?? 0})
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Product</TableHead>
                        <TableHead className="text-xs font-semibold">SKU</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Adjustment Quantity</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Line Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspectingAdj.lines?.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-xs text-slate-800 dark:text-slate-200">
                            {line.product?.name ?? 'Product'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">
                            {line.product?.sku ?? '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">
                            <span
                              className={
                                Number(line.quantity) > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }
                            >
                              {Number(line.quantity) > 0 ? `+${line.quantity}` : line.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500">
                            {line.reason || inspectingAdj.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInspectModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StockEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Loading Stock Entry & Adjustment workspace...</p>
        </div>
      }
    >
      <StockEntryContent />
    </Suspense>
  );
}
