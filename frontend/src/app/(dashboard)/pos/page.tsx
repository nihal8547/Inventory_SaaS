'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Printer,
  CheckCircle2,
  Wallet,
  Lock,
  Unlock,
  UserCheck,
  Building2,
  Loader2,
  Search,
  ScanLine,
  Barcode,
  Tag,
  Layers,
  Box,
  Boxes,
  Package,
  Sparkles,
  Hash,
  X,
  LayoutGrid,
  List,
  ArrowRight,
  PackageCheck,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Receipt,
  Calendar,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { barcodesService } from '@/services/barcodes.service';
import { salesService } from '@/services/sales.service';
import { api, handleApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PaymentMethod } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { HardwareStatusDialog } from '@/components/pos/hardware-status-dialog';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useDeviceStore } from '@/store/device.store';
import { printReceipt, kickCashDrawer } from '@/lib/hardware-printer';
import { playSaleCompleteChime, playScanErrorBeep } from '@/lib/audio-feedback';

interface CartItem {
  productId: string;
  productVariantId?: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unitPrice: number;
  quantity: number;
  stockOnHand?: number;
}

interface CompletedSaleRecord {
  receiptNo: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountTendered?: number;
  change?: number;
  date: string;
  customerName?: string;
  branchName?: string;
}

type SearchColumn = 'ALL' | 'NAME' | 'SKU' | 'BARCODE' | 'CATEGORY' | 'BRAND';

interface SearchColumnOption {
  key: SearchColumn;
  label: string;
  icon: any;
  placeholder: string;
  hint: string;
}

const SEARCH_COLUMNS: SearchColumnOption[] = [
  {
    key: 'ALL',
    label: 'All Columns',
    icon: Sparkles,
    placeholder: 'Search by Name, SKU, Barcode, Brand or Category (or scan barcode)...',
    hint: 'Comprehensive search across all item columns',
  },
  {
    key: 'NAME',
    label: 'Product Name',
    icon: Box,
    placeholder: 'Search by product title or model name (e.g. iPhone, ThinkPad)...',
    hint: 'Targeting item name column',
  },
  {
    key: 'SKU',
    label: 'SKU Code',
    icon: Hash,
    placeholder: 'Search by exact or partial SKU (e.g. LAP-MAC-01)...',
    hint: 'Targeting inventory SKU code column',
  },
  {
    key: 'BARCODE',
    label: 'Barcode',
    icon: Barcode,
    placeholder: 'Scan or type Barcode number (e.g. 100000000001)...',
    hint: 'Targeting Barcode scan column',
  },
  {
    key: 'CATEGORY',
    label: 'Category',
    icon: Layers,
    placeholder: 'Search by category (e.g. Electronics, Groceries, Apparel)...',
    hint: 'Targeting item category column',
  },
  {
    key: 'BRAND',
    label: 'Brand',
    icon: Tag,
    placeholder: 'Search by brand or manufacturer (e.g. Apple, Dell, Logitech)...',
    hint: 'Targeting manufacturer brand column',
  },
];

export default function POSPage() {
  const { currentTenant, currentBranch } = useAuthStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [processing, setProcessing] = useState(false);

  // Customer Loyalty Selection
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');

  // Cashier Shift State
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftAction, setShiftAction] = useState<'OPEN' | 'CLOSE'>('OPEN');
  const [floatCash, setFloatCash] = useState(500);
  const [closingCash, setClosingCash] = useState(0);
  const [shiftNotes, setShiftNotes] = useState('');
  const [submittingShift, setSubmittingShift] = useState(false);

  // Branches
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSaleRecord | null>(null);

  // POS Item Search & Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState<SearchColumn>('ALL');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentOrPopular, setRecentOrPopular] = useState<any[]>([]);
  const [showStockCount, setShowStockCount] = useState<boolean>(true);

  // Catalog / Grid View State
  const [viewMode, setViewMode] = useState<'SEARCH' | 'CATALOG'>('SEARCH');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Server-Authoritative Quotation State
  const [serverQuote, setServerQuote] = useState<{
    subtotal: number;
    tax: number;
    total: number;
    isStockSufficient: boolean;
  } | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);

  // Today's Live Sales Register Drawer / Modal
  const [todayRegisterOpen, setTodayRegisterOpen] = useState(false);
  const [todayRegisterData, setTodayRegisterData] = useState<any>(null);
  const [loadingTodayRegister, setLoadingTodayRegister] = useState(false);

  const fetchTodayRegister = useCallback(async () => {
    setLoadingTodayRegister(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await salesService.getDailyRegister({
        date: today,
        branchId: selectedBranchId || undefined,
      });
      const data = (res.data as any)?.data ?? res.data;
      setTodayRegisterData(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load today register summary');
    } finally {
      setLoadingTodayRegister(false);
    }
  }, [selectedBranchId]);

  // Real-time debounced authoritative server quote
  useEffect(() => {
    if (cart.length === 0 || !selectedBranchId) {
      setServerQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setFetchingQuote(true);
        const res = await api.post('/sales/quote', {
          branchId: selectedBranchId,
          lines: cart.map((i) => ({
            productId: i.productId,
            productVariantId: i.productVariantId,
            quantity: i.quantity,
          })),
        });
        const qData = (res.data as any)?.data ?? res.data;
        if (qData) {
          setServerQuote({
            subtotal: Number(qData.subtotal),
            tax: Number(qData.tax),
            total: Number(qData.total),
            isStockSufficient: qData.isStockSufficient,
          });
        }
      } catch (err) {
        console.error('Failed to fetch server quote:', err);
      } finally {
        setFetchingQuote(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [cart, selectedBranchId]);

  const clientSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const subtotal = serverQuote ? serverQuote.subtotal : clientSubtotal;
  const tax = serverQuote ? serverQuote.tax : 0;
  const total = serverQuote ? serverQuote.total : subtotal;
  const change = Math.max(0, parseFloat(amountTendered || '0') - total);

  // Helper to compute available stock at current active branch
  const getBranchStock = useCallback((product: any, branchId?: string) => {
    if (!product?.stockBalances || !Array.isArray(product.stockBalances)) return 0;
    const targetBranch = branchId || selectedBranchId;
    const list = targetBranch && targetBranch !== 'all'
      ? product.stockBalances.filter((sb: any) => sb.branchId === targetBranch)
      : product.stockBalances;
    return list.reduce((acc: number, sb: any) => acc + Number(sb.onHand ?? 0), 0);
  }, [selectedBranchId]);

  // Helper to compute total stock across all branches
  const getTotalStock = useCallback((product: any) => {
    if (!product?.stockBalances || !Array.isArray(product.stockBalances)) return 0;
    return product.stockBalances.reduce((acc: number, sb: any) => acc + Number(sb.onHand ?? 0), 0);
  }, []);

  // Load Initial Shift, Customers, Branches, Categories, and Top Items
  useEffect(() => {
    Promise.all([
      api.get('/branches'),
      api.get('/sales/customers?limit=100'),
      api.get('/sales/shifts/current'),
      api.get('/products/categories/list'),
      api.get('/products?limit=12&sortBy=createdAt&sortOrder=desc'),
    ])
      .then(([bRes, cRes, sRes, catRes, pRes]) => {
        const bList = (bRes.data as any)?.data?.data ?? (bRes.data as any)?.data ?? [];
        const cList = (cRes.data as any)?.data?.data ?? (cRes.data as any)?.data ?? [];
        const shift = (sRes.data as any)?.data ?? sRes.data;
        const catList = (catRes.data as any)?.data ?? [];
        const prodList = (pRes.data as any)?.data?.data ?? (pRes.data as any)?.data ?? [];

        const bArr = Array.isArray(bList) ? bList : [];
        setBranches(bArr);
        if (bArr.length > 0) setSelectedBranchId(bArr[0].id);

        setCustomers(Array.isArray(cList) ? cList : []);
        if (shift && !shift.endedAt) setCurrentShift(shift);
        setCategories(Array.isArray(catList) ? catList : []);

        const prods = Array.isArray(prodList) ? prodList : [];
        setRecentOrPopular(prods);
        setCatalogItems(prods);
      })
      .catch(console.error);
  }, []);

  // Universal Add Product to Cart
  const addProductToCart = useCallback((product: any, variant?: any) => {
    if (!product) return;
    const price = Number(product.sellingPrice ?? product.basePrice ?? product.costPrice ?? 0);
    const barcodeVal = product.barcodes?.[0]?.barcodeValue || '';
    const stockQty = getBranchStock(product);

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && (variant?.id ? i.productVariantId === variant.id : true)
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productVariantId: variant?.id,
          name: product.name,
          sku: product.sku,
          barcode: barcodeVal,
          category: product.category?.name,
          brand: product.brand?.name,
          unitPrice: price,
          quantity: 1,
          stockOnHand: stockQty,
        },
      ];
    });

    toast.success(`Added ${product.name} to cart`);
  }, [getBranchStock]);

  const { paperSize, autoPrintReceipt, autoKickDrawer } = useDeviceStore();

  // Barcode or Direct Enter lookup
  const handleDirectScanOrLookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      const res = await barcodesService.lookup(trimmed);
      const data = (res.data as any)?.data ?? res.data;
      const product = data?.product;
      if (product) {
        addProductToCart(product, data.variant);
        setSearchQuery('');
        setIsDropdownOpen(false);
        return;
      }
    } catch {
      // Continue to product search fallback
    }

    try {
      const searchRes = await api.get('/products', {
        params: { search: trimmed, searchColumn: 'all', limit: 5 },
      });
      const list = (searchRes.data as any)?.data?.data ?? (searchRes.data as any)?.data ?? [];
      if (Array.isArray(list) && list.length > 0) {
        addProductToCart(list[0]);
        setSearchQuery('');
        setIsDropdownOpen(false);
        return;
      }
      playScanErrorBeep();
      toast.error(`No item found for barcode or code: "${trimmed}"`);
    } catch (err) {
      playScanErrorBeep();
      toast.error('Search failed, please check connection');
    }
  }, [addProductToCart]);

  // Connect Global Hardware Barcode Scanner (Keyboard Wedge)
  useBarcodeScanner({
    onScan: (barcode) => {
      handleDirectScanOrLookup(barcode);
    },
    enabled: !receiptOpen && !shiftModalOpen,
  });

  // Debounced search when searchQuery or searchColumn changes
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    setLoadingSuggestions(true);
    const handler = setTimeout(async () => {
      try {
        const res = await api.get('/products', {
          params: {
            search: q,
            searchColumn: searchColumn.toLowerCase(),
            limit: 10,
          },
        });
        const list = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
        setIsDropdownOpen(true);
        setSelectedIndex(-1);
      } catch (e) {
        console.error('Error fetching suggestions', e);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery, searchColumn]);

  // Fetch catalog products when category tab changes
  useEffect(() => {
    if (viewMode !== 'CATALOG') return;
    setLoadingCatalog(true);
    const params: any = { limit: 24, sortBy: 'createdAt', sortOrder: 'desc' };
    if (selectedCategoryTab !== 'ALL') {
      params.categoryId = selectedCategoryTab;
    }

    api.get('/products', { params })
      .then((res) => {
        const list = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
        setCatalogItems(Array.isArray(list) ? list : []);
      })
      .catch(console.error)
      .finally(() => setLoadingCatalog(false));
  }, [viewMode, selectedCategoryTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions dropdown & barcode scanning
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : suggestions.length > 0 ? 0 : -1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addProductToCart(suggestions[selectedIndex]);
        setSearchQuery('');
        setIsDropdownOpen(false);
      } else if (suggestions.length === 1) {
        addProductToCart(suggestions[0]);
        setSearchQuery('');
        setIsDropdownOpen(false);
      } else if (searchQuery.trim()) {
        handleDirectScanOrLookup(searchQuery.trim());
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Open / Close Shift
  const handleShiftSubmit = async () => {
    setSubmittingShift(true);
    try {
      if (shiftAction === 'OPEN') {
        const res = await api.post('/sales/shifts/open', {
          branchId: selectedBranchId || branches[0]?.id,
          openingCash: Number(floatCash),
          notes: shiftNotes || 'Morning shift opening float',
        });
        const shiftData = (res.data as any)?.data ?? res.data;
        setCurrentShift(shiftData);
        toast.success(`Register shift opened with ${formatCurrency(floatCash)} float cash`);
      } else {
        await api.post(`/sales/shifts/${currentShift.id}/close`, {
          closingCash: Number(closingCash),
          notes: shiftNotes || 'End of day register closure',
        });
        setCurrentShift(null);
        toast.success(`Register shift closed and reconciled`);
      }
      setShiftModalOpen(false);
      setShiftNotes('');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmittingShift(false);
    }
  };

  const checkout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (serverQuote && !serverQuote.isStockSufficient) {
      toast.error('One or more items in the cart exceed available stock. Please adjust quantities.');
      return;
    }
    if (paymentMethod === 'CASH' && parseFloat(amountTendered || '0') < total) {
      toast.error('Insufficient payment amount');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/sales', {
        branchId: selectedBranchId || branches[0]?.id,
        customerId: selectedCustomerId !== 'walk-in' ? selectedCustomerId : undefined,
        idempotencyKey:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2),
        lines: cart.map((i) => ({
          productId: i.productId,
          productVariantId: i.productVariantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payments: [{ method: paymentMethod, amount: total }],
      });

      const officialSale = (res.data as any)?.data ?? res.data;
      const customerObj = customers.find((c) => c.id === selectedCustomerId);
      const branchObj = branches.find((b) => b.id === (officialSale.branchId || selectedBranchId));

      setCompletedSale({
        receiptNo: officialSale.saleNumber,
        items: officialSale.lines && officialSale.lines.length > 0
          ? officialSale.lines.map((l: any) => ({
              productId: l.productId,
              name: l.productName || cart.find((c) => c.productId === l.productId)?.name || 'Item',
              unitPrice: Number(l.unitPrice),
              quantity: Number(l.quantity),
              total: Number(l.total),
            }))
          : [...cart],
        subtotal: Number(officialSale.subtotal ?? subtotal),
        tax: Number(officialSale.tax ?? tax),
        total: Number(officialSale.total ?? total),
        paymentMethod,
        amountTendered: paymentMethod === 'CASH' ? parseFloat(amountTendered || '0') : Number(officialSale.total),
        change: paymentMethod === 'CASH' ? Math.max(0, parseFloat(amountTendered || '0') - Number(officialSale.total)) : 0,
        date: new Date(officialSale.createdAt || Date.now()).toLocaleString(),
        customerName: customerObj?.name || 'Walk-in Retail Shopper',
        branchName: branchObj?.name || 'Main Retail Branch',
      });

      toast.success(`Sale completed successfully! Invoice #${officialSale.saleNumber}`);
      setCart([]);
      setAmountTendered('');
      setReceiptOpen(true);

      // Hardware peripherals automation
      if (autoKickDrawer && paymentMethod === 'CASH') {
        kickCashDrawer();
      }
      playSaleCompleteChime();
      if (autoPrintReceipt) {
        setTimeout(() => {
          handlePrintReceipt();
        }, 200);
      }
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = useCallback(() => {
    if (!completedSale) return;

    printReceipt({
      receiptNo: completedSale.receiptNo,
      date: completedSale.date,
      storeName: currentTenant?.name || 'Qatar Retail Store',
      branchName: completedSale.branchName || currentBranch?.name || 'Main Retail Branch',
      crNumber: 'CR-99214-QA',
      phone: '+974 4400 1234',
      cashierName: currentShift?.openedBy?.firstName || 'POS Cashier',
      customerName: completedSale.customerName,
      paymentMethod: completedSale.paymentMethod,
      subtotal: completedSale.subtotal,
      tax: completedSale.tax,
      total: completedSale.total,
      amountTendered: completedSale.amountTendered,
      change: completedSale.change,
      paperSize: paperSize || '80mm',
      items: completedSale.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
  }, [completedSale, currentTenant, currentBranch, currentShift, paperSize]);

  const activeColumnDef = SEARCH_COLUMNS.find((c) => c.key === searchColumn) || SEARCH_COLUMNS[0];
  const ActiveIcon = activeColumnDef.icon;

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      {/* Left: Search Bar, Suggestions, Catalog & Cart */}
      <div className="flex-1 flex flex-col space-y-3 min-w-0">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-blue-600" />
              Point of Sale (POS)
            </h1>
          </div>

          {/* View Mode + Branch & Shift Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Search vs Catalog Grid */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border">
              <Button
                variant={viewMode === 'SEARCH' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('SEARCH')}
                className={`h-7 text-xs px-2.5 rounded-lg gap-1.5 transition-all ${
                  viewMode === 'SEARCH'
                    ? 'bg-white dark:bg-slate-900 shadow-xs font-bold text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Search Bar</span>
              </Button>
              <Button
                variant={viewMode === 'CATALOG' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('CATALOG')}
                className={`h-7 text-xs px-2.5 rounded-lg gap-1.5 transition-all ${
                  viewMode === 'CATALOG'
                    ? 'bg-white dark:bg-slate-900 shadow-xs font-bold text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Catalog Grid</span>
              </Button>
            </div>

            {branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border text-xs">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="h-6 border-0 bg-transparent p-0 text-xs font-semibold focus:ring-0 shadow-none w-auto gap-1">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentShift ? (
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 font-mono text-xs gap-1 py-1">
                <Unlock className="h-3 w-3 text-emerald-600" />
                Shift Active ({formatCurrency(Number(currentShift.openingCash || 0))})
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 font-mono text-xs gap-1 py-1">
                <Lock className="h-3 w-3 text-amber-600" />
                Register Closed
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShiftAction(currentShift ? 'CLOSE' : 'OPEN');
                setShiftModalOpen(true);
              }}
              className="h-8 text-xs rounded-xl"
            >
              <Wallet className="h-3.5 w-3.5 mr-1" />
              {currentShift ? 'Close Register' : 'Open Shift'}
            </Button>

            <Link href="/pos/today" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-xl gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                title="Open Today's Live Sales Register in a separate dedicated page"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Today&apos;s Live Summary ↗</span>
              </Button>
            </Link>

            {/* POS Hardware Peripherals Indicator & Configuration */}
            <HardwareStatusDialog storeName={currentTenant?.name} branchName={currentBranch?.name} />
          </div>
        </div>

        {/* --- DEDICATED ITEMS SEARCH & ALL SEARCHING COLUMNS SUGGESTIONS --- */}
        <div className="relative space-y-2">
          {/* Column Filter Suggestion Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
            {SEARCH_COLUMNS.map((col) => {
              const IconComp = col.icon;
              const isActive = searchColumn === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => {
                    setSearchColumn(col.key);
                    searchInputRef.current?.focus();
                    if (searchQuery.trim()) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <IconComp className="h-3 w-3" />
                  <span>{col.label}</span>
                </button>
              );
            })}

            {/* Show Stock Count Option Toggle */}
            <button
              type="button"
              onClick={() => setShowStockCount((p) => !p)}
              className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                showStockCount
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle live inventory stock count in search results"
            >
              <Boxes className="h-3.5 w-3.5 text-emerald-600" />
              <span>Stock Count: {showStockCount ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Real-time Omnichannel Search Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
              <ActiveIcon className="h-4 w-4 text-blue-500" />
            </div>

            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length > 0 || recentOrPopular.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={activeColumnDef.placeholder}
              className="pl-9 pr-24 h-11 rounded-xl text-sm font-medium border-slate-300 dark:border-slate-700 focus-visible:ring-blue-500 bg-white dark:bg-slate-900 shadow-xs"
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {loadingSuggestions && (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-1" />
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setIsDropdownOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-500">
                ↵ Enter
              </Badge>
            </div>
          </div>

          {/* Quick Item Suggestion Badges (When Search Bar is Empty) */}
          {!searchQuery && recentOrPopular.length > 0 && viewMode === 'SEARCH' && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">Quick Add:</span>
              {recentOrPopular.slice(0, 6).map((item) => {
                const stock = getBranchStock(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addProductToCart(item)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 rounded-full font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-all shrink-0 hover:border-blue-300"
                  >
                    <Plus className="h-3 w-3 text-blue-500" />
                    <span className="truncate max-w-[140px]">{item.name}</span>
                    <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400">
                      {formatCurrency(item.sellingPrice ?? 0)}
                    </span>
                    {showStockCount && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        stock > 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        {stock} in stock
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* --- REAL-TIME MULTI-COLUMN SUGGESTIONS DROPDOWN --- */}
          {isDropdownOpen && searchQuery.trim() && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[460px] flex flex-col"
            >
              {/* Dropdown Header Info */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/80 border-b flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 gap-1 text-[11px]">
                    <ActiveIcon className="h-3 w-3" />
                    {activeColumnDef.label}
                  </Badge>
                  <span className="text-muted-foreground">
                    {loadingSuggestions
                      ? 'Searching catalog...'
                      : `${suggestions.length} matching item${suggestions.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Use ↑↓ arrows to navigate, Enter to add, Esc to close
                </span>
              </div>

              {/* Suggestions List */}
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                {suggestions.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No products found matching &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchColumn !== 'ALL'
                        ? `No match in ${activeColumnDef.label}. Try selecting "All Columns" or scanning exact barcode.`
                        : 'Verify SKU, Barcode, or Product Name in catalog.'}
                    </p>
                    {searchColumn !== 'ALL' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSearchColumn('ALL')}
                        className="mt-2 text-xs rounded-xl gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        Switch to &ldquo;All Columns&rdquo; Search
                      </Button>
                    )}
                  </div>
                ) : (
                  suggestions.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const stock = getBranchStock(item);
                    const barcode = item.barcodes?.[0]?.barcodeValue;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          addProductToCart(item);
                          setSearchQuery('');
                          setIsDropdownOpen(false);
                          searchInputRef.current?.focus();
                        }}
                        className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-blue-950/50 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Item Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs uppercase">
                            {item.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </p>
                              {item.category && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 font-normal">
                                  {item.category.name}
                                </Badge>
                              )}
                              {item.brand && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 font-normal">
                                  {item.brand.name}
                                </Badge>
                              )}
                            </div>

                            {/* Column badges: SKU, Barcode, & Live Stock Count */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono flex-wrap">
                              <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">
                                <Hash className="h-2.5 w-2.5" /> SKU: {item.sku}
                              </span>
                              {barcode && (
                                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">
                                  <Barcode className="h-2.5 w-2.5" /> {barcode}
                                </span>
                              )}
                              {showStockCount && (
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  stock > 5
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                    : stock > 0
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                }`}>
                                  <Boxes className="h-3 w-3" />
                                  Stock: {stock} units
                                  {getTotalStock(item) > stock && (
                                    <span className="text-[10px] font-normal opacity-80">
                                      (All Branches: {getTotalStock(item)})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stock & Price */}
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div className="space-y-0.5">
                            <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                              {formatCurrency(item.sellingPrice ?? 0)}
                            </p>
                            {showStockCount && (
                              <div>
                                {stock > 5 ? (
                                  <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                    {stock} in stock
                                  </span>
                                ) : stock > 0 ? (
                                  <span className="inline-block text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                                    {stock} left (low)
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                    0 in stock
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className="h-8 px-2.5 rounded-xl text-xs gap-1 font-bold shadow-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              addProductToCart(item);
                              setSearchQuery('');
                              setIsDropdownOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* --- MAIN CONTENT AREA: SEARCH CART vs CATALOG GRID --- */}
        {viewMode === 'CATALOG' ? (
          /* Catalog Touch Grid View */
          <div className="flex-1 flex flex-col space-y-3 min-h-0">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Button
                variant={selectedCategoryTab === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryTab('ALL')}
                className="h-7 text-xs rounded-xl shrink-0"
              >
                All Categories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategoryTab === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategoryTab(cat.id)}
                  className="h-7 text-xs rounded-xl shrink-0"
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Catalog Grid Cards */}
            <div className="flex-1 overflow-y-auto">
              {loadingCatalog ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : catalogItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border border-dashed rounded-xl">
                  <PackageCheck className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No items in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {catalogItems.map((prod) => {
                    const stock = getBranchStock(prod);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => addProductToCart(prod)}
                        className="group p-3 border rounded-2xl bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span className="truncate">{prod.category?.name || 'General'}</span>
                            <span className={stock > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500'}>
                              {stock > 0 ? `${stock} left` : 'Out of stock'}
                            </span>
                          </div>
                          <p className="font-bold text-xs line-clamp-2 text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {prod.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{prod.sku}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t">
                          <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400">
                            {formatCurrency(prod.sellingPrice ?? 0)}
                          </span>
                          <span className="h-6 w-6 rounded-lg bg-blue-50 group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 text-blue-600 flex items-center justify-center transition-colors">
                            <Plus className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Search Cart View */
          <div className="flex-1 overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-muted-foreground border border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 p-6">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30 text-blue-500" />
                <p className="text-sm font-semibold">Cart is empty</p>
                <p className="text-xs text-slate-400 text-center max-w-xs mt-1">
                  Scan a barcode or search products above to add items.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 border rounded-2xl bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5 flex-wrap">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        {item.sku}
                      </span>
                      {item.barcode && (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                          {item.barcode}
                        </span>
                      )}
                      {showStockCount && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          (item.stockOnHand ?? 0) >= item.quantity
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          Stock: {item.stockOnHand ?? 0}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateQty(item.productId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateQty(item.productId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <p className="w-24 text-right font-bold text-sm text-blue-600 dark:text-blue-400">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Checkout & Tender Panel */}
      <div className="w-full md:w-80 flex-shrink-0">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs sticky top-4">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Payment & Tender</span>
              <Badge variant="outline" className="font-mono text-xs">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Customer selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                Customer
              </Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.loyaltyPoints ?? 0} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {serverQuote && !serverQuote.isStockSufficient && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>One or more items exceed branch available stock</span>
              </div>
            )}

            <div className="space-y-2 text-sm font-medium">
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  Subtotal
                  {fetchingQuote && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                </span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (VAT)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white">
                <span>Total Due</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'CASH' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Amount Tendered (QAR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="0.00"
                    className="rounded-xl font-bold font-mono"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {[50, 100, 200, 500].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => setAmountTendered(denom.toString())}
                      className="px-2 py-1 text-[11px] font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                    >
                      {denom} QAR
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountTendered(total.toString())}
                    className="px-2 py-1 text-[11px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg"
                  >
                    Exact
                  </button>
                </div>

                {parseFloat(amountTendered || '0') >= total && (
                  <div className="flex justify-between font-bold text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/30">
                    <span>Change Due:</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
              </>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11 shadow-sm"
              size="lg"
              onClick={checkout}
              disabled={processing || cart.length === 0 || Boolean(serverQuote && !serverQuote.isStockSufficient)}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Sale...
                </>
              ) : (
                'Complete Sale & Print Receipt'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* --- SHIFT OPEN / CLOSE MODAL --- */}
      <Dialog open={shiftModalOpen} onOpenChange={setShiftModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-500" />
              {shiftAction === 'OPEN' ? 'Open Cashier Register Shift' : 'Close Register Shift & Reconcile'}
            </DialogTitle>
            <DialogDescription>
              {shiftAction === 'OPEN'
                ? 'Enter the starting cash float in drawer to begin checkout session.'
                : 'Enter closing cash count in drawer for daily end reconciliation.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {shiftAction === 'OPEN' ? (
              <div>
                <Label className="text-xs font-semibold">Opening Float Cash (QAR) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={floatCash}
                  onChange={(e) => setFloatCash(Number(e.target.value))}
                  className="mt-1 font-mono font-bold rounded-xl"
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold">Actual Closing Cash In Drawer (QAR) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(Number(e.target.value))}
                  className="mt-1 font-mono font-bold rounded-xl"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Shift Notes / Register ID</Label>
              <Input
                placeholder="e.g. Counter 01 morning shift"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleShiftSubmit}
              disabled={submittingShift}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {submittingShift ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : shiftAction === 'OPEN' ? (
                'Open Register'
              ) : (
                'Close & Reconcile'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- RECEIPT MODAL --- */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
          {/* Top Success Header */}
          <div className="no-print bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-base leading-tight">Checkout Successful!</h3>
                <p className="text-xs text-emerald-100 mt-0.5 font-medium">Payment received & inventory adjusted</p>
              </div>
            </div>
            <button
              onClick={() => setReceiptOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto space-y-4 print:p-0 print:max-h-none print:overflow-visible">
            {completedSale && (
              <div
                id="printable-pos-receipt"
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4 text-xs font-sans print:border-none print:shadow-none print:p-0 print:m-0"
              >
                {/* Store Branding Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase mb-1">
                    <span>Tax Free Retail • State of Qatar</span>
                  </div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    {currentTenant?.name || 'Qatar Retail Store'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {completedSale.branchName || currentBranch?.name || 'Main Retail Branch'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    CR: 99214-QA • Doha, Qatar
                  </p>

                  <div className="mt-2.5 pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-blue-600 dark:text-blue-400">#{completedSale.receiptNo}</span>
                    <span>{completedSale.date}</span>
                  </div>

                  <div className="text-left text-[11px] text-slate-500 pt-1.5 flex items-center justify-between">
                    <span>Customer:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-medium">{completedSale.customerName}</strong>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2 py-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                    <span>Item Description</span>
                    <span>Total (QAR)</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {completedSale.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white leading-snug">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {item.quantity} × {formatCurrency(item.unitPrice, 'QAR')}
                          </p>
                        </div>
                        <span className="font-bold font-mono text-slate-900 dark:text-white shrink-0 pl-2">
                          {formatCurrency(item.quantity * item.unitPrice, 'QAR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Totals */}
                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(completedSale.subtotal, 'QAR')}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>VAT / Tax (0%)</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {formatCurrency(0, 'QAR')}
                    </span>
                  </div>

                  {/* Total Highlight Bar */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                        Total Amount
                      </span>
                      <span className="text-[10px] text-blue-700 dark:text-blue-400">Qatari Riyal (QAR)</span>
                    </div>
                    <span className="text-xl font-black font-mono text-blue-700 dark:text-blue-300">
                      {formatCurrency(completedSale.total, 'QAR')}
                    </span>
                  </div>

                  {/* Payment Details */}
                  <div className="pt-2 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Payment Method</span>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase py-0 border-slate-300">
                        {completedSale.paymentMethod}
                      </Badge>
                    </div>

                    {completedSale.paymentMethod === 'CASH' && (
                      <>
                        <div className="flex justify-between font-mono">
                          <span>Amount Tendered:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(completedSale.amountTendered || completedSale.total, 'QAR')}
                          </span>
                        </div>
                        <div className="flex justify-between font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
                          <span>Change Returned:</span>
                          <span className="text-xs">
                            {formatCurrency(completedSale.change || 0, 'QAR')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Barcode & Store Appreciation */}
                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex gap-[2px] items-center h-8 justify-center opacity-80">
                      {[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3].map((w, i) => (
                        <div key={i} className="bg-slate-900 dark:bg-slate-200 h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <p className="font-mono text-[10px] tracking-widest text-slate-400 mt-1">
                      {completedSale.receiptNo}
                    </p>
                  </div>

                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    Thank you for shopping with us!
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Return & exchange valid within 14 days with original receipt
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="no-print p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReceipt}
              className="h-10 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 gap-1.5 shadow-xs"
            >
              <Printer className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              Print Receipt
            </Button>
            <Button
              size="sm"
              onClick={() => setReceiptOpen(false)}
              className="h-10 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
            >
              Done / Next Customer &rarr;
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- TODAY'S LIVE SALES REGISTER MODAL --- */}
      <Dialog open={todayRegisterOpen} onOpenChange={setTodayRegisterOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Today&apos;s Live Sales Summary ({todayRegisterData?.dateFormatted || 'Today'})
              </span>
              <Badge variant="outline" className="text-xs font-mono text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                Live Shift Register
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Real-time summary of sales, items sold, and collections recorded at this terminal today.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {loadingTodayRegister ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                Loading today&apos;s register data...
              </div>
            ) : (
              <>
                {/* 4 Mini Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Gross Sales</p>
                    <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {formatCurrency(todayRegisterData?.summary?.grossRevenue || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Invoices</p>
                    <p className="text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                      {todayRegisterData?.summary?.invoicesCount || 0} Bills
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Items Sold</p>
                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                      {todayRegisterData?.summary?.totalItemsSold || 0} Units
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Avg Ticket</p>
                    <p className="text-base font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                      {formatCurrency(todayRegisterData?.summary?.avgOrderValue || 0)}
                    </p>
                  </div>
                </div>

                {/* Collections Breakdown */}
                {todayRegisterData?.payments && todayRegisterData.payments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-[11px] font-semibold text-slate-400">Collections:</span>
                    {todayRegisterData.payments.map((p: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[11px] font-mono">
                        {p.method}: {formatCurrency(p.amount)} ({p.count})
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Items Sold Today List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Items Sold Today ({todayRegisterData?.itemsSold?.length || 0} distinct products):
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {!todayRegisterData?.itemsSold || todayRegisterData.itemsSold.length === 0 ? (
                        <p className="text-center py-6 text-slate-400">No items sold yet today.</p>
                      ) : (
                        todayRegisterData.itemsSold.map((item: any, i: number) => (
                          <div key={i} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">{item.productName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} • {item.category}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] mr-2">
                                {item.quantitySold} Qty
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white font-mono">
                                {formatCurrency(item.totalRevenue)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex sm:justify-between items-center">
            <Link
              href="/sales"
              onClick={() => setTodayRegisterOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Open Full Daily & Monthly Register <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setTodayRegisterOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
