import { api } from '@/lib/api';
import { AuthResponse } from '@/types';

export const authService = {
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};
