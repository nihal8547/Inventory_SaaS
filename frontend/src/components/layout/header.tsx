'use client';

import { TenantSwitcher } from './tenant-switcher';
import { BranchSwitcher } from './branch-switcher';
import { useAuthStore } from '@/store/auth.store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsDropdown } from './notifications-dropdown';
import { Sparkles, Shield, Download } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : '??');

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center px-6 gap-4 z-20 transition-all">
      {/* Left: Organization & Branch Selectors */}
      <div className="flex items-center gap-2.5">
        <TenantSwitcher />
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <BranchSwitcher />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="ml-auto flex items-center gap-3">
        {user?.isSuperAdmin && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Shield className="h-3 w-3" />
            Super Admin
          </span>
        )}

        {/* Notification Center Popover */}
        <NotificationsDropdown />

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer">
              <Avatar className="h-8 w-8 ring-2 ring-blue-500/30">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {user?.isSuperAdmin ? 'Platform Admin' : 'Store Member'}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5">
            <DropdownMenuLabel className="p-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground font-normal truncate mt-0.5">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new CustomEvent('inventoryos-install-pwa'))}
              className="text-xs font-medium cursor-pointer rounded-lg text-slate-700 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-400" />
              <span>Install Desktop / Tablet App</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
            <DropdownMenuItem
              onClick={logout}
              className="text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40 rounded-lg text-xs font-medium cursor-pointer"
            >
              Sign out of account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
