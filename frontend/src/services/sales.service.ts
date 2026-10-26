import { api } from '@/lib/api';
import { Sale, PaginatedResponse } from '@/types';

export const salesService = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Sale>>('/sales', params),
  get: (id: string) => api.get<Sale>(`/sales/${id}`),
  checkout: (data: {
    idempotencyKey: string;
    lines: { productId: string; productVariantId?: string; quantity: number; unitPrice: number }[];
    payments: { method: string; amount: number; reference?: string }[];
    customerId?: string;
    discount?: number;
    notes?: string;
  }) => api.post<Sale>('/sales', data),
  void: (id: string, reason: string) =>
    api.post<Sale>(`/sales/${id}/void`, { reason }),
  quote: (data: { branchId: string; customerId?: string; lines: { productId: string; productVariantId?: string; quantity: number; discount?: number }[] }) =>
    api.post<any>('/sales/quote', data),
  createReturn: (data: { saleId: string; reason?: string; lines: { productId: string; productVariantId?: string; quantity: number }[] }) =>
    api.post<any>('/sales/returns', data),
  getDailyRegister: (params?: { date?: string; branchId?: string; cashierId?: string }) =>
    api.get<any>('/sales/daily-register', params),
  getMonthlyRegister: (params?: { year?: number | string; month?: number | string; branchId?: string }) =>
    api.get<any>('/sales/monthly-register', params),
};
