import { api } from '@/lib/api';
import { StockBalance, StockLedger, StockTransfer, PaginatedResponse } from '@/types';

export const inventoryService = {
  // Stock
  getStock: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<StockBalance>>('/inventory/stock', params),
  getLedger: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<StockLedger>>('/inventory/ledger', params),
  adjust: (data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reason: string;
    notes?: string;
  }) => api.post('/inventory/adjust', data),
  receive: (data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    notes?: string;
    referenceId?: string;
  }) => api.post('/inventory/receive', data),

  // Transfers
  listTransfers: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<StockTransfer>>('/inventory/transfers', params),
  getTransfer: (id: string) => api.get<StockTransfer>(`/inventory/transfers/${id}`),
  createTransfer: (data: Partial<StockTransfer>) =>
    api.post<StockTransfer>('/inventory/transfers', data),
  updateTransferStatus: (id: string, status: string, data?: Record<string, unknown>) =>
    api.patch<StockTransfer>(`/inventory/transfers/${id}/status`, { status, ...data }),

  // Stock counts
  listStockCounts: (params?: Record<string, unknown>) =>
    api.get('/inventory/stock-counts', params),
  getStockCount: (id: string) => api.get(`/inventory/stock-counts/${id}`),
  createStockCount: (data: Record<string, unknown>) =>
    api.post('/inventory/stock-counts', data),
  submitStockCount: (id: string, lines: Record<string, unknown>[]) =>
    api.post(`/inventory/stock-counts/${id}/submit`, { lines }),
  approveStockCount: (id: string) =>
    api.post(`/inventory/stock-counts/${id}/approve`, {}),
};
