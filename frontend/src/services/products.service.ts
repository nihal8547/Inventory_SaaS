import { api } from '@/lib/api';
import { Product, Category, Brand, Unit, PaginatedResponse } from '@/types';

export const productsService = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Product>>('/products', params),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (id: string, data: Partial<Product>) => api.patch<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),

  listCategories: () => api.get<Category[]>('/products/categories'),
  createCategory: (data: Partial<Category>) => api.post<Category>('/products/categories', data),

  listBrands: () => api.get<Brand[]>('/products/brands'),
  createBrand: (data: Partial<Brand>) => api.post<Brand>('/products/brands', data),

  listUnits: () => api.get<Unit[]>('/products/units'),
};
