'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  AlertTriangle,
  AlertCircle,
  ShoppingBag,
  Truck,
  ShieldAlert,
  Info,
  Check,
  X,
  RotateCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { notificationsService } from '@/services/notifications.service';
import { AppNotification } from '@/types';
import { useAuthStore } from '@/store/auth.store';

export function NotificationsDropdown() {
  const router = useRouter();
  const { currentTenant, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'STOCK' | 'SYSTEM'>('ALL');
  const [open, setOpen] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await notificationsService.list({ limit: 20 });
      const raw = res.data as any;
      const payload = raw?.data ?? raw;
      const list = payload?.data ?? (Array.isArray(payload) ? payload : []);
      const unread = typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0;

      setNotifications(list);
      setUnreadCount(unread);
    } catch {
      // Background poll failure is silent
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 45 seconds for new operational alerts
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications, currentTenant?.id]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationsService.clearRead();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      toast.success('Read notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.delete(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return !item.isRead;
    if (activeTab === 'STOCK')
      return item.type === 'LOW_STOCK' || item.type === 'OUT_OF_STOCK';
    if (activeTab === 'SYSTEM')
      return item.type === 'SYSTEM' || item.type === 'SECURITY';
    return true;
  });

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return (
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
        );
      case 'LOW_STOCK':
        return (
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      case 'SALE':
        return (
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-4 w-4" />
          </div>
        );
      case 'ORDER':
        return (
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4" />
          </div>
        );
      case 'SECURITY':
        return (
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors focus:outline-none"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white dark:ring-slate-950 animate-in zoom-in-50">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[420px] p-0 rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                onClick={fetchNotifications}
                title="Refresh"
              >
                <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                onClick={handleClearRead}
                title="Clear read"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: `Unread (${unreadCount})` },
                { id: 'STOCK', label: 'Stock Alerts' },
                { id: 'SYSTEM', label: 'System' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                All caught up!
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeTab === 'UNREAD'
                  ? 'No unread notifications at the moment.'
                  : 'No notifications found for this filter.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                  item.isRead
                    ? 'bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-900/40 opacity-80 hover:opacity-100'
                    : 'bg-blue-50/30 dark:bg-blue-950/15 hover:bg-blue-50/60 dark:hover:bg-blue-950/25'
                }`}
              >
                {/* Icon */}
                {getNotificationIcon(item.type, item.severity)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs truncate ${
                        item.isRead
                          ? 'font-medium text-slate-700 dark:text-slate-300'
                          : 'font-bold text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </p>
                    {!item.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    <span>{formatRelativeTime(item.createdAt)}</span>
                    {item.link && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium group-hover:underline">
                          View details <ChevronRight className="h-2.5 w-2.5" />
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Individual Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            Automated Operational Alerts
          </span>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Notification Center <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
