import { api } from '@/lib/api';

export const reportsService = {
  getDashboard: (params?: { branchId?: string }) => api.get('/reports/dashboard', params),
  getSalesReport: (params: { startDate: string; endDate: string; groupBy?: string; branchId?: string }) =>
    api.get('/reports/sales', params),
  getStockValuation: (params?: { branchId?: string }) =>
    api.get('/reports/stock-valuation', params),
  getPurchaseReport: (params?: Record<string, unknown>) =>
    api.get('/reports/purchases', params),
};
