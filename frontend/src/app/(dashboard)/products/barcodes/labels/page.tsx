'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Printer,
  Barcode,
  Sliders,
  Eye,
  ArrowLeft,
  Copy,
  Layers,
  CheckCircle2,
  Package,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  barcodeHeight: number;
  fontSize: string;
}

const PRESETS: LabelPreset[] = [
  { id: '25x15', name: '25 × 15 mm (Jewelry / Small Acc)', widthMm: 25, heightMm: 15, barcodeHeight: 25, fontSize: '8px' },
  { id: '30x20', name: '30 × 20 mm (Compact Retail)', widthMm: 30, heightMm: 20, barcodeHeight: 32, fontSize: '9px' },
  { id: '50x30', name: '50 × 30 mm (Standard Retail Shelf - Most Popular)', widthMm: 50, heightMm: 30, barcodeHeight: 48, fontSize: '11px' },
  { id: '100x50', name: '100 × 50 mm (Warehouse Carton & Pallet)', widthMm: 100, heightMm: 50, barcodeHeight: 70, fontSize: '13px' },
  { id: 'a4-sheet', name: 'A4 Sheet (3 × 8 = 24 Labels Per Page)', widthMm: 70, heightMm: 37, barcodeHeight: 45, fontSize: '11px' },
];

export default function BarcodeLabelDesignerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productFilter, setProductFilter] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('50x30');
  const [printCopies, setPrintCopies] = useState<number>(10);

  // Customization Options
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [companyName, setCompanyName] = useState('Demo Store Qatar');
  const [showProductName, setShowProductName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBatch, setShowBatch] = useState(false);
  const [batchText, setBatchText] = useState('BN: QA-2026-01');

  useEffect(() => {
    api.get('/products?limit=100')
      .then((res) => {
        const list = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        setProducts(Array.isArray(list) ? list : []);
        if (list.length > 0) setSelectedProduct(list[0]);
      })
      .catch(console.error);
  }, []);

  const currentPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[2];

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Area Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-label-container, #print-label-container * {
            visibility: visible;
          }
          #print-label-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-label {
            page-break-inside: avoid;
            margin-bottom: 4mm;
            border: 1px dashed #ccc !important;
          }
        }
      `}</style>

      <div className="no-print space-y-6">
        <PageHeader
          title="Barcode Label Designer & Thermal Print Studio"
          description="Design custom shelf talkers and thermal product stickers with precise millimeter sizing and QAR pricing"
          action={
            <div className="flex items-center gap-2">
              <Link href="/products/barcodes">
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Barcode Registry
                </Button>
              </Link>
              <Button onClick={handleTriggerPrint} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
                <Printer className="h-4 w-4 mr-2" />
                Print {printCopies} Label(s)
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel */}
          <Card className="lg:col-span-6 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-600" />
                Label Dimensions & Elements
              </CardTitle>
              <CardDescription>Configure physical print dimensions and content fields</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Product</Label>

                {/* Instant Product Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search product by name or SKU..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="h-8 text-xs pl-8 rounded-lg"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <Select
                  value={selectedProduct?.id || ''}
                  onValueChange={(val) => {
                    const p = products.find((item) => item.id === val);
                    if (p) setSelectedProduct(p);
                  }}
                >
                  <SelectTrigger className="rounded-lg text-xs">
                    <SelectValue placeholder="Choose product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => {
                        if (!productFilter.trim()) return true;
                        const q = productFilter.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.sku.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 50)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(Number(p.sellingPrice))} ({p.sku})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Millimeter Size Preset</Label>
                  <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                    <SelectTrigger className="rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESETS.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {pr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Number of Copies</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={printCopies}
                    onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Company Header Brand</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="rounded-lg text-xs"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Show Brand Header</p>
                    <p className="text-[10px] text-muted-foreground">Print store title across label top</p>
                  </div>
                  <Switch checked={showCompanyName} onCheckedChange={setShowCompanyName} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Show Product Name</p>
                    <p className="text-[10px] text-muted-foreground">Title of merchandise</p>
                  </div>
                  <Switch checked={showProductName} onCheckedChange={setShowProductName} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Show Price (QAR Standard)</p>
                    <p className="text-[10px] text-muted-foreground">Formatted as QAR X.XX</p>
                  </div>
                  <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Show SKU Code</p>
                    <p className="text-[10px] text-muted-foreground">Alphanumeric stock keeping unit</p>
                  </div>
                  <Switch checked={showSku} onCheckedChange={setShowSku} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Show Batch Number / Expiry</p>
                    <p className="text-[10px] text-muted-foreground">Pharmaceutical or grocery shelf life</p>
                  </div>
                  <Switch checked={showBatch} onCheckedChange={setShowBatch} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview Canvas */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-600" />
                    WYSIWYG Print Preview Canvas
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {currentPreset.widthMm} × {currentPreset.heightMm} mm
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[300px]">
                {/* Physical Label Replica */}
                <div
                  className="bg-white text-slate-900 border border-slate-300 shadow-md rounded-sm p-2 flex flex-col justify-between text-center select-none"
                  style={{
                    width: `${currentPreset.widthMm * 3.8}px`,
                    minHeight: `${currentPreset.heightMm * 3.8}px`,
                  }}
                >
                  {showCompanyName && (
                    <p className="font-bold uppercase tracking-wider text-slate-700" style={{ fontSize: '9px' }}>
                      {companyName}
                    </p>
                  )}

                  {showProductName && (
                    <p className="font-bold text-slate-900 line-clamp-2 leading-tight my-0.5" style={{ fontSize: '10px' }}>
                      {selectedProduct?.name || 'Selected Product Name'}
                    </p>
                  )}

                  {/* SVG Barcode Graphic */}
                  <div className="my-1 flex flex-col items-center justify-center">
                    <svg
                      className="mx-auto"
                      width="85%"
                      height={currentPreset.barcodeHeight * 0.6}
                      viewBox="0 0 160 40"
                    >
                      <rect x="0" y="0" width="160" height="40" fill="#ffffff" />
                      {/* Barcode lines simulation */}
                      {[
                        2, 6, 8, 14, 18, 22, 28, 30, 36, 42, 46, 50, 56, 62, 66, 72, 76, 82, 88, 92, 98,
                        102, 108, 114, 118, 124, 130, 136, 140, 146, 152, 156,
                      ].map((x, i) => (
                        <rect
                          key={i}
                          x={x}
                          y="2"
                          width={i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1}
                          height="36"
                          fill="#000000"
                        />
                      ))}
                    </svg>
                    <p className="font-mono text-[9px] tracking-widest text-slate-800">
                      {(selectedProduct as any)?.barcode || selectedProduct?.sku || '123456789012'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono border-t border-slate-200 pt-0.5">
                    {showSku && <span>SKU: {selectedProduct?.sku || 'SKU-001'}</span>}
                    {showPrice && (
                      <span className="font-black text-blue-700 text-[10px]">
                        {formatCurrency(Number(selectedProduct?.sellingPrice || 0))}
                      </span>
                    )}
                  </div>

                  {showBatch && (
                    <p className="text-[8px] font-mono text-slate-500 mt-0.5 text-left">{batchText}</p>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-4">
                  Rendered at 100% DPI scale. Direct hardware print output matches label dimensions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* --- HIDDEN PRINT ENGINE CONTAINER --- */}
      <div id="print-label-container" className="hidden print:block p-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: printCopies }).map((_, i) => (
            <div
              key={i}
              className="printable-label bg-white text-black p-2 border border-black flex flex-col justify-between text-center"
              style={{
                width: `${currentPreset.widthMm}mm`,
                height: `${currentPreset.heightMm}mm`,
                pageBreakInside: 'avoid',
              }}
            >
              {showCompanyName && (
                <p className="font-bold uppercase tracking-wider text-[8px] leading-tight">{companyName}</p>
              )}
              {showProductName && (
                <p className="font-bold text-[9px] line-clamp-1 leading-tight">{selectedProduct?.name}</p>
              )}
              <div className="my-0.5 flex flex-col items-center">
                <svg width="90%" height="22" viewBox="0 0 160 30">
                  <rect x="0" y="0" width="160" height="30" fill="#ffffff" />
                  {[2, 6, 8, 14, 18, 22, 28, 30, 36, 42, 46, 50, 56, 62, 66, 72, 76, 82, 88, 92, 98, 102, 108, 114, 118, 124, 130, 136, 140, 146, 152, 156].map((x, idx) => (
                    <rect key={idx} x={x} y="2" width={idx % 3 === 0 ? 3 : idx % 2 === 0 ? 2 : 1} height="26" fill="#000000" />
                  ))}
                </svg>
                <p className="font-mono text-[8px]">
                  {(selectedProduct as any)?.barcode || selectedProduct?.sku}
                </p>
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono border-t pt-0.5">
                {showSku && <span>{selectedProduct?.sku}</span>}
                {showPrice && <span className="font-bold">{formatCurrency(Number(selectedProduct?.sellingPrice || 0))}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
