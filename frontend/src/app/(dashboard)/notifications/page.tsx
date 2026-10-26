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
  Search,
  Filter,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { notificationsService } from '@/services/notifications.service';
import { AppNotification } from '@/types';
import { useAuthStore } from '@/store/auth.store';

export default function NotificationsPage() {
  const router = useRouter();
  const { currentTenant, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'STOCK' | 'SALE' | 'SYSTEM'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'WARNING' | 'ERROR' | 'INFO'>('ALL');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await notificationsService.list({ limit: 100 });
      const raw = res.data as any;
      const payload = raw?.data ?? raw;
      const list = payload?.data ?? (Array.isArray(payload) ? payload : []);
      const unread = typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0;

      setNotifications(list);
      setUnreadCount(unread);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, currentTenant?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.success('Marked as read');
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
      toast.error('Failed to clear read notifications');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsService.delete(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification dismissed');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const filteredList = notifications.filter((item) => {
    // 1. Tab filter
    if (activeTab === 'UNREAD' && item.isRead) return false;
    if (activeTab === 'STOCK' && item.type !== 'LOW_STOCK' && item.type !== 'OUT_OF_STOCK')
      return false;
    if (activeTab === 'SALE' && item.type !== 'SALE') return false;
    if (activeTab === 'SYSTEM' && item.type !== 'SYSTEM' && item.type !== 'SECURITY')
      return false;

    // 2. Severity filter
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchMsg = item.message.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }

    return true;
  });

  const stockAlertsCount = notifications.filter(
    (n) => n.type === 'LOW_STOCK' || n.type === 'OUT_OF_STOCK'
  ).length;

  const criticalCount = notifications.filter((n) => n.severity === 'ERROR').length;

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return (
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
        );
      case 'LOW_STOCK':
        return (
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        );
      case 'SALE':
        return (
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
        );
      case 'ORDER':
        return (
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5" />
          </div>
        );
      case 'SECURITY':
        return (
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Bell className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notification Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time operational alerts for stock availability, POS transactions, and enterprise governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="h-9 gap-1.5 text-xs rounded-xl"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-9 gap-1.5 text-xs rounded-xl border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All as Read</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearRead}
            className="h-9 gap-1.5 text-xs rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Read</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Alerts</span>
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <Inbox className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {notifications.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Logged notifications</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unread</span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {unreadCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Require your attention</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Stock Warnings</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {stockAlertsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Below threshold level</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Critical Alerts</span>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
              {criticalCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Out of stock / Security</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & List Card */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Alerts' },
                { id: 'UNREAD', label: `Unread (${unreadCount})` },
                { id: 'STOCK', label: `Stock Warnings (${stockAlertsCount})` },
                { id: 'SALE', label: 'Sales & POS' },
                { id: 'SYSTEM', label: 'System & Security' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="WARNING">Warnings</option>
              <option value="ERROR">Critical/Errors</option>
              <option value="INFO">Informational</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredList.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No notifications match your filter
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Everything is up to date. You will be alerted automatically when stock falls below reorder points or system events occur.
              </p>
              {(searchQuery || activeTab !== 'ALL' || severityFilter !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('ALL');
                    setSeverityFilter('ALL');
                  }}
                  className="mt-4 text-xs h-8 rounded-xl"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  item.isRead
                    ? 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-slate-900/30'
                    : 'bg-blue-50/25 dark:bg-blue-950/15 hover:bg-blue-50/50 dark:hover:bg-blue-950/25'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  {/* Icon */}
                  {getNotificationIcon(item.type, item.severity)}

                  {/* Body */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm ${
                          item.isRead
                            ? 'font-medium text-slate-800 dark:text-slate-200'
                            : 'font-bold text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold ${
                          item.severity === 'ERROR'
                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                            : item.severity === 'WARNING'
                            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                        }`}
                      >
                        {item.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Metadata details if stock alert */}
                    {item.metadata && (
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                        {item.metadata.sku && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                            SKU: {item.metadata.sku}
                          </span>
                        )}
                        {item.metadata.branchName && (
                          <span>Location: {item.metadata.branchName}</span>
                        )}
                        {item.metadata.onHand !== undefined && (
                          <span>
                            On Hand: <strong className="text-slate-700 dark:text-slate-200">{item.metadata.onHand}</strong>
                          </span>
                        )}
                        {item.metadata.reorderLevel !== undefined && (
                          <span>Threshold: {item.metadata.reorderLevel}</span>
                        )}
                      </div>
                    )}

                    <span className="text-[11px] text-slate-400 mt-1.5 block">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(item.link!)}
                      className="h-8 text-xs gap-1 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}

                  {!item.isRead ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(item.id)}
                      className="h-8 text-xs rounded-xl text-slate-500 hover:text-slate-900"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400 px-2 py-1 flex items-center gap-1">
                      <CheckCheck className="h-3 w-3 text-emerald-500" /> Read
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="h-8 text-xs rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Dismiss"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
