import { api } from '@/lib/api';
import { Membership, Role, PaginatedResponse } from '@/types';

export const usersService = {
  listMembers: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Membership>>('/users/members', params),
  inviteMember: (data: { email: string; roleId: string; branchIds?: string[] }) =>
    api.post<Membership>('/users/invite', data),
  updateMembership: (memberId: string, data: { roleId?: string; branchIds?: string[]; isActive?: boolean }) =>
    api.patch<Membership>(`/users/members/${memberId}`, data),
  removeMember: (memberId: string) => api.delete(`/users/members/${memberId}`),

  listRoles: () => api.get<Role[]>('/roles'),
  createRole: (data: Partial<Role>) => api.post<Role>('/roles', data),
  updateRole: (id: string, data: Partial<Role>) => api.patch<Role>(`/roles/${id}`, data),
};
