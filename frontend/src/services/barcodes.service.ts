import { api } from '@/lib/api';
import { Barcode, BarcodeLabelTemplate, PaginatedResponse } from '@/types';

export const barcodesService = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Barcode>>('/barcodes', params),
  generate: (productId: string, data?: { format?: string; variantId?: string }) =>
    api.post<Barcode>(`/barcodes/generate`, { productId, ...data }),
  assign: (data: { productId: string; barcodeValue: string; format?: string; variantId?: string }) =>
    api.post<Barcode>('/barcodes/assign', data),
  lookup: (barcodeValue: string) =>
    api.get<Barcode>(`/barcodes/lookup`, { params: { value: barcodeValue } }),
  bulkGenerate: (productIds: string[], format?: string) =>
    api.post<Barcode[]>('/barcodes/bulk-generate', { productIds, format }),
  delete: (id: string) => api.delete(`/barcodes/${id}`),

  // Print jobs
  createPrintJob: (data: { barcodeIds: string[]; templateId?: string; copies?: number }) =>
    api.post('/barcodes/print-jobs', data),
  listPrintJobs: () => api.get('/barcodes/print-jobs'),

  // Label templates
  listTemplates: () => api.get<BarcodeLabelTemplate[]>('/barcodes/label-templates'),
  getTemplate: (id: string) => api.get<BarcodeLabelTemplate>(`/barcodes/label-templates/${id}`),
  createTemplate: (data: Partial<BarcodeLabelTemplate>) =>
    api.post<BarcodeLabelTemplate>('/barcodes/label-templates', data),
  updateTemplate: (id: string, data: Partial<BarcodeLabelTemplate>) =>
    api.patch<BarcodeLabelTemplate>(`/barcodes/label-templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/barcodes/label-templates/${id}`),
};
