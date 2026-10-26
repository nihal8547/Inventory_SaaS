import { api } from '@/lib/api';
import { Tenant, Branch } from '@/types';

export const tenantsService = {
  listMine: () => api.get<{ tenants: Tenant[] }>('/tenants/my-tenants'),
  create: (data: Partial<Tenant>) => api.post<Tenant>('/tenants', data),
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  update: (id: string, data: Partial<Tenant>) => api.patch<Tenant>(`/tenants/${id}`, data),

  listBranches: () => api.get<Branch[]>('/branches'),
  getBranch: (id: string) => api.get<Branch>(`/branches/${id}`),
  createBranch: (data: Partial<Branch>) => api.post<Branch>('/branches', data),
  updateBranch: (id: string, data: Partial<Branch>) => api.patch<Branch>(`/branches/${id}`, data),
};
