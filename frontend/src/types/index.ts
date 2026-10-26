// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Auth
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  currency: string;
  timezone: string;
  locale: string;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
}

// Catalog
export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Unit {
  id: string;
  tenantId: string;
  name: string;
  abbreviation: string;
  type: 'PIECE' | 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA';
  isBase: boolean;
  isActive: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  brandId?: string;
  brand?: Brand;
  unitId?: string;
  unit?: Unit;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate?: number;
  trackInventory: boolean;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  barcodes?: Barcode[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  costPrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  isActive: boolean;
  barcodes?: Barcode[];
}

// Barcode
export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' | 'CODE39' | 'QR_CODE' | 'GS1_128';
export type BarcodeType = 'INTERNAL' | 'EXTERNAL' | 'SUPPLIER' | 'PACKAGING';

export interface Barcode {
  id: string;
  tenantId: string;
  productId: string;
  productVariantId?: string;
  barcodeValue: string;
  barcodeFormat: BarcodeFormat;
  barcodeType: BarcodeType;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  product?: Product;
  productVariant?: ProductVariant;
}

export interface BarcodeLabelTemplate {
  id: string;
  tenantId: string;
  name: string;
  width: number;
  height: number;
  showCompanyLogo: boolean;
  showProductName: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showBarcodeValue: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  customText?: string;
  fontSize: number;
  isDefault: boolean;
}

// Inventory
export interface StockBalance {
  id: string;
  tenantId: string;
  productId: string;
  productVariantId?: string;
  branchId: string;
  warehouseId?: string;
  onHand: number;
  reserved: number;
  incoming: number;
  reorderLevel?: number;
  product?: Product;
  branch?: Branch;
  warehouse?: Warehouse;
  updatedAt: string;
}

export interface StockLedger {
  id: string;
  tenantId: string;
  productId: string;
  branchId: string;
  transactionType: string;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export type TransferStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RESERVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'REJECTED' | 'CANCELLED';

export interface StockTransfer {
  id: string;
  tenantId: string;
  transferNumber: string;
  status: TransferStatus;
  sourceBranchId: string;
  destinationBranchId: string;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  requestedBy?: string;
  approvedBy?: string;
  notes?: string;
  lines?: StockTransferLine[];
  sourceBranch?: Branch;
  destinationBranch?: Branch;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferLine {
  id: string;
  transferId: string;
  productId: string;
  productVariantId?: string;
  requestedQuantity: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  discrepancyReason?: string;
  product?: Product;
}

// Purchasing
export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  supplier?: Supplier;
  branchId: string;
  branch?: Branch;
  expectedDate?: string;
  lines?: PurchaseOrderLine[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  receivedQuantity?: number;
  unitPrice: number;
  totalPrice: number;
}

// Sales
export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints?: number;
  isActive: boolean;
}

export type SaleStatus = 'PENDING' | 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';

export interface Sale {
  id: string;
  tenantId: string;
  saleNumber: string;
  status: SaleStatus;
  branchId: string;
  customerId?: string;
  customer?: Customer;
  lines: SaleLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: Payment[];
  notes?: string;
  cashierId: string;
  createdAt: string;
}

export interface SaleLine {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  productVariantId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  createdAt: string;
}

// Role & Permissions
export interface Role {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  roleId: string;
  role?: Role;
  isActive: boolean;
  branches: string[];
}

// Daily & Monthly Sales Register Types
export interface DailyRegisterSummary {
  grossRevenue: number;
  subtotal: number;
  tax: number;
  discount: number;
  invoicesCount: number;
  totalItemsSold: number;
  avgOrderValue: number;
}

export interface SoldItemRecord {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantitySold: number;
  unitPrice: number;
  totalRevenue: number;
  contributionPercent: number;
}

export interface HourlyBreakdownRecord {
  hour: string;
  orders: number;
  items: number;
  revenue: number;
}

export interface DailyTransactionRecord {
  id: string;
  saleNumber: string;
  createdAt: string;
  time: string;
  cashier: string;
  customer: string;
  customerPhone?: string | null;
  branchName: string;
  itemsCount: number;
  total: number;
  paymentMethod: string;
}

export interface DailySalesRegisterResponse {
  date: string;
  dateFormatted: string;
  currency: string;
  summary: DailyRegisterSummary;
  payments: { method: string; amount: number; count: number }[];
  itemsSold: SoldItemRecord[];
  hourlyBreakdown: HourlyBreakdownRecord[];
  transactions: DailyTransactionRecord[];
}

export interface MonthlyDayBreakdown {
  date: string;
  dayNumber: number;
  dayOfWeek: string;
  invoicesCount: number;
  itemsSold: number;
  revenue: number;
  topItem: string;
}

export interface MonthlyTopItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface CategoryDistribution {
  name: string;
  itemsSold: number;
  revenue: number;
  percentage: number;
}

export interface MonthlySalesRegisterResponse {
  year: number;
  month: number;
  monthName: string;
  currency: string;
  summary: {
    totalRevenue: number;
    totalInvoices: number;
    totalItemsSold: number;
    avgDailyRevenue: number;
    activeSellingDays: number;
    peakDay: { date: string; revenue: number; itemsSold: number } | null;
    lowestDay: { date: string; revenue: number; itemsSold: number } | null;
  };
  dailyBreakdown: MonthlyDayBreakdown[];
  monthlyTopItems: MonthlyTopItem[];
  categoryDistribution: CategoryDistribution[];
}

// Notifications
export interface AppNotification {
  id: string;
  tenantId: string;
  userId?: string | null;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'SALE' | 'ORDER' | 'SECURITY' | 'SYSTEM' | 'INFO';
  severity: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean | string;
  type?: string;
  severity?: string;
}

