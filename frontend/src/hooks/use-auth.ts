'use client';

import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const { user, isAuthenticated, currentTenant, currentBranch, logout } = useAuthStore();
  return { user, isAuthenticated, currentTenant, currentBranch, logout };
}
