'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    currentTenant,
    setTenants,
    setTenant,
    currentBranch,
    setBranches,
    setBranch,
  } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('access_token');
    if (!isAuthenticated && !token) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  const initializedRef = useRef<string | null>(null);

  // Context loading: ensure tenant and branch are set
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    const tenantKey = currentTenant?.id || 'none';
    if (initializedRef.current === tenantKey && currentBranch) return;
    initializedRef.current = tenantKey;

    const initContext = async () => {
      try {
        let activeTenant = currentTenant;

        // If no tenant is selected and user is superadmin, fetch tenants
        if (!activeTenant && user?.isSuperAdmin) {
          const res = await api.get('/tenants');
          const list = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? [];
          if (list.length > 0) {
            setTenants(list);
            setTenant(list[0]);
            activeTenant = list[0];
          }
        }

        // If tenant is selected but branch is missing, fetch branches
        if (activeTenant && !currentBranch) {
          const bRes = await api.get('/branches');
          const bList = (bRes.data as any)?.data?.data ?? (bRes.data as any)?.data ?? [];
          if (bList.length > 0) {
            setBranches(bList);
            const defBranch = bList.find((b: any) => b.isDefault) || bList[0];
            setBranch(defBranch);
          }
        }
      } catch (err) {
        console.error('Error initializing dashboard context:', err);
      }
    };

    initContext();
  }, [mounted, isAuthenticated, currentTenant?.id, currentBranch, user?.isSuperAdmin, setTenants, setTenant, setBranches, setBranch]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
