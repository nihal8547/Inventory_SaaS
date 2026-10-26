'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  RefreshCw,
  CreditCard,
  Package,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isChecking, setIsChecking] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(typeof window !== 'undefined' ? navigator.onLine : false);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setIsChecking(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            InventoryOS
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Offline Mode
          </span>
        </div>

        {/* Animated Wi-Fi Off Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center">
          <WifiOff className="h-10 w-10 animate-pulse" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isOnline ? 'Connection Restored!' : 'You are currently offline'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {isOnline
              ? 'Your internet connection is active again. Click below to reconnect to the live server.'
              : 'No internet connection detected. The PWA application shell and cached workspaces are safely preserved on your device.'}
          </p>
        </div>

        {/* Status indicator pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-medium">
          {isOnline ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online Detected</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Disconnected</span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 font-medium text-xs sm:text-sm rounded-xl gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking connection...' : isOnline ? 'Reload Now' : 'Check Connection & Retry'}</span>
          </Button>

          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/pos" className="w-full">
              <Button
                variant="outline"
                className="w-full h-10 text-xs rounded-xl gap-1.5 border-slate-200 dark:border-slate-800"
              >
                <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                <span>POS Terminal</span>
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full">
              <Button
                variant="outline"
                className="w-full h-10 text-xs rounded-xl gap-1.5 border-slate-200 dark:border-slate-800"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* PWA Offline capabilities footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
          <p>InventoryOS Enterprise Progressive Web App (PWA)</p>
          <p className="mt-0.5">Offline-first local caching • Background auto-sync</p>
        </div>
      </div>
    </div>
  );
}
