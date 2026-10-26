'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PackageCheck,
  Building2,
  Barcode,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Truck,
  ArrowRight,
  Boxes,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { api, handleApiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Branch, Supplier, Product, PurchaseOrder } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ReceivingLine {
  productId: string;
  name: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

function ReceivingContent() {
  const searchParams = useSearchParams();
  const preselectedPoId = searchParams?.get('poId');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedPoId, setSelectedPoId] = useState<string>(preselectedPoId || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [receivingNotes, setReceivingNotes] = useState<string>('');
  const [lines, setLines] = useState<ReceivingLine[]>([]);

  // Barcode / Item adder
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null);
  const [receivedCount, setReceivedCount] = useState(1);
  const [batchNo, setBatchNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/branches'),
      api.get('/purchasing/suppliers'),
      api.get('/purchasing/orders'),
      api.get('/products?limit=150'),
    ])
      .then(([br, sr, por, pr]) => {
        const bList = (br.data as any)?.data?.data ?? (br.data as any)?.data ?? [];
        const sList = (sr.data as any)?.data?.data ?? (sr.data as any)?.data ?? [];
        const poList = (por.data as any)?.data?.data ?? (por.data as any)?.data ?? [];
        const pList = (pr.data as any)?.data?.data ?? (pr.data as any)?.data ?? [];

        setBranches(Array.isArray(bList) ? bList : []);
        setSuppliers(Array.isArray(sList) ? sList : []);
        setPurchaseOrders(Array.isArray(poList) ? poList : []);
        setProducts(Array.isArray(pList) ? pList : []);

        if (bList.length > 0) setSelectedBranchId(bList[0].id);

        if (preselectedPoId && Array.isArray(poList)) {
          const matchedPo = poList.find((p: any) => p.id === preselectedPoId);
          if (matchedPo) {
            setSelectedPoId(matchedPo.id);
            if (matchedPo.branchId) setSelectedBranchId(matchedPo.branchId);
            if (matchedPo.supplierId) setSelectedSupplierId(matchedPo.supplierId);
            if (matchedPo.lines) {
              setLines(
                matchedPo.lines.map((l: any) => ({
                  productId: l.productId,
                  name: l.product?.name ?? 'Item',
                  sku: l.product?.sku ?? 'SKU',
                  orderedQty: Number(l.quantity || 0),
                  receivedQty: Number(l.quantity || 0),
                  unitPrice: Number(l.unitPrice || 0),
                  batchNumber: '',
                  expiryDate: '',
                }))
              );
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [preselectedPoId]);

  // Barcode Scanning auto-increment
  const handleBarcodeScan = (code: string) => {
    setBarcodeQuery(code);
    if (!code) return;

    const matched = products.find(
      (p) =>
        p.sku.toLowerCase() === code.toLowerCase() ||
        (p as any).barcode?.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      const idx = lines.findIndex((l) => l.productId === matched.id);
      if (idx >= 0) {
        const updated = [...lines];
        updated[idx].receivedQty += 1;
        setLines(updated);
        toast.success(`Incremented: ${matched.name} (${updated[idx].receivedQty} received)`);
      } else {
        setPickedProduct(matched);
      }
      setBarcodeQuery('');
    }
  };

  const handleAddDirectItem = () => {
    if (!pickedProduct) {
      toast.error('Choose a product to receive');
      return;
    }

    const idx = lines.findIndex((l) => l.productId === pickedProduct.id);
    if (idx >= 0) {
      const updated = [...lines];
      updated[idx].receivedQty += receivedCount;
      setLines(updated);
    } else {
      setLines([
        ...lines,
        {
          productId: pickedProduct.id,
          name: pickedProduct.name,
          sku: pickedProduct.sku,
          orderedQty: 0,
          receivedQty: receivedCount,
          unitPrice: Number(pickedProduct.costPrice || 0),
          batchNumber: batchNo,
          expiryDate: expiry,
        },
      ]);
    }

    setPickedProduct(null);
    setReceivedCount(1);
    setBatchNo('');
    setExpiry('');
    toast.success('Item added to shipment manifest');
  };

  const handleCommitGoodsReceipt = async () => {
    if (!selectedBranchId) {
      toast.error('Select receiving branch location');
      return;
    }
    if (lines.length === 0) {
      toast.error('Manifest is empty. Add or scan items to receive.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/purchasing/receipts', {
        purchaseOrderId: selectedPoId || undefined,
        branchId: selectedBranchId,
        supplierId: selectedSupplierId || undefined,
        notes: receivingNotes || 'Goods receipt verification',
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.receivedQty,
          unitPrice: l.unitPrice,
          batchNumber: l.batchNumber || undefined,
          expiryDate: l.expiryDate || undefined,
        })),
      });

      toast.success(`Shipment successfully received into inventory! (${lines.length} items verified)`);
      setLines([]);
      setReceivingNotes('');
      setSelectedPoId('');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const totalReceivedUnits = lines.reduce((acc, l) => acc + l.receivedQty, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receiving"
        description="Verify incoming vendor shipments and receive stock into inventory"
        action={
          <Link href="/purchasing/orders">
            <Button variant="outline" className="rounded-xl shadow-xs">
              <Truck className="h-4 w-4 mr-2 text-blue-500" />
              View Purchase Orders
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Shipment & Scanner Details */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Receiving Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Match Against Purchase Order</Label>
                <Select
                  value={selectedPoId || 'direct'}
                  onValueChange={(val) => {
                    if (val === 'direct') {
                      setSelectedPoId('');
                    } else {
                      setSelectedPoId(val);
                      const po = purchaseOrders.find((p) => p.id === val);
                      if (po?.branchId) setSelectedBranchId(po.branchId);
                      if (po?.supplierId) setSelectedSupplierId(po.supplierId);
                      if (po?.lines) {
                        setLines(
                          po.lines.map((l: any) => ({
                            productId: l.productId,
                            name: l.product?.name ?? 'Item',
                            sku: l.product?.sku ?? 'SKU',
                            orderedQty: Number(l.quantity || 0),
                            receivedQty: Number(l.quantity || 0),
                            unitPrice: Number(l.unitPrice || 0),
                            batchNumber: '',
                            expiryDate: '',
                          }))
                        );
                      }
                    }
                  }}
                >
                  <SelectTrigger className="rounded-lg text-xs">
                    <SelectValue placeholder="Select Purchase Order (Optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct Vendor Delivery (No PO)</SelectItem>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.poNumber} — {po.supplier?.name} ({po.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Receiving Branch *</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="rounded-lg text-xs">
                    <SelectValue placeholder="Target branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Vendor / Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="rounded-lg text-xs">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Delivery Note / Bill of Lading Ref</Label>
                <Input
                  placeholder="e.g. BL-QA-2026-9901"
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  className="rounded-lg text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Scanner */}
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Barcode className="h-4 w-4 text-emerald-600" />
                Continuous Barcode Receiving
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Scan barcode to auto-increment..."
                  value={barcodeQuery}
                  onChange={(e) => handleBarcodeScan(e.target.value)}
                  className="rounded-lg text-xs pl-8 font-mono"
                  autoFocus
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              <div className="pt-2 border-t space-y-2.5">
                <Label className="text-xs font-medium text-slate-500">Or Select Product Manually</Label>

                {/* Instant Product Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search product by name or SKU..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="h-8 text-xs pl-8 rounded-lg"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <Select
                  value={pickedProduct?.id || ''}
                  onValueChange={(val) => {
                    const p = products.find((item) => item.id === val);
                    setPickedProduct(p || null);
                  }}
                >
                  <SelectTrigger className="h-9 rounded-lg text-xs">
                    <SelectValue placeholder="Catalog product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => {
                        if (!catalogSearch.trim()) return true;
                        const q = catalogSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.sku.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 50)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Received Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={receivedCount}
                      onChange={(e) => setReceivedCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Batch #</Label>
                    <Input
                      placeholder="BATCH-001"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="h-8 text-xs rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddDirectItem}
                  className="w-full h-8 text-xs bg-slate-900 text-white rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add to Received Manifest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Verified Received Manifest */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-emerald-600" />
                    Verified Shipment Manifest ({lines.length} lines)
                  </CardTitle>
                  <CardDescription>
                    All items received here will immediately update inventory stock balances in QAR
                  </CardDescription>
                </div>
                {lines.length > 0 && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono">
                    Total Units: {totalReceivedUnits}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {lines.length === 0 ? (
                <div className="p-12 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                  <PackageCheck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                    No items on receiving manifest
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Scan a product barcode or select an active Purchase Order to verify delivery items.
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Product Name</TableHead>
                        <TableHead className="text-xs font-semibold">SKU</TableHead>
                        {selectedPoId && <TableHead className="text-xs font-semibold text-center">Ordered</TableHead>}
                        <TableHead className="text-xs font-semibold text-right">Received</TableHead>
                        <TableHead className="text-xs font-semibold">Batch / Expiry</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, idx) => {
                        const variance = line.receivedQty - line.orderedQty;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm text-slate-900 dark:text-white">
                              {line.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-500">{line.sku}</TableCell>
                            {selectedPoId && (
                              <TableCell className="text-center font-mono text-xs text-slate-500">
                                {line.orderedQty}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-bold text-sm text-emerald-600">
                                  {line.receivedQty}
                                </span>
                                {selectedPoId && variance !== 0 && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      variance > 0 ? 'text-amber-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {variance > 0 ? `+${variance}` : variance}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-slate-500">
                                {line.batchNumber || 'Standard'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded"
                                onClick={() => setLines(lines.filter((_, i) => i !== idx))}
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
              <CardFooter className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                <Button variant="outline" onClick={() => setLines([])} className="rounded-xl text-xs">
                  Clear Manifest
                </Button>
                <Button
                  onClick={handleCommitGoodsReceipt}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Commit Received Goods to Stock Ledger
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReceivingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Goods Receiving module...</div>}>
      <ReceivingContent />
    </Suspense>
  );
}
