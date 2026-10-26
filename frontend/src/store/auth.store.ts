import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Tenant, Branch } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  currentTenant: Tenant | null;
  currentBranch: Branch | null;
  tenants: Tenant[];
  branches: Branch[];
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setTenant: (tenant: Tenant) => void;
  setBranch: (branch: Branch) => void;
  setTenants: (tenants: Tenant[]) => void;
  setBranches: (branches: Branch[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      currentTenant: null,
      currentBranch: null,
      tenants: [],
      branches: [],
      isAuthenticated: false,

      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", token);
        }
        set({ user, accessToken: token, isAuthenticated: true });
      },

      setTenant: (tenant) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("tenant_id", tenant.id);
        }
        set({ currentTenant: tenant, currentBranch: null });
      },

      setBranch: (branch) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("branch_id", branch.id);
        }
        set({ currentBranch: branch });
      },

      setTenants: (tenants) => set({ tenants }),
      setBranches: (branches) => set({ branches }),

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("tenant_id");
          localStorage.removeItem("branch_id");
        }
        set({
          user: null,
          accessToken: null,
          currentTenant: null,
          currentBranch: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        currentTenant: state.currentTenant,
        currentBranch: state.currentBranch,
        tenants: state.tenants,
        branches: state.branches,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
