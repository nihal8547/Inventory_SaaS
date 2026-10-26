'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Download,
  Wifi,
  WifiOff,
  Check,
  X,
  Sparkles,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone PWA mode
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    // 2. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for service worker updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    toast.info('New InventoryOS update available!', {
                      action: {
                        label: 'Update Now',
                        onClick: () => window.location.reload(),
                      },
                      duration: 10000,
                    });
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration failed:', err);
          });
      });
    }

    // 3. Capture beforeinstallprompt for native install trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      // Automatically show install banner after 5 seconds if not in standalone
      const timer = setTimeout(() => {
        if (!isApp) setShowInstallBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Manual install event from menu
    const handleManualInstallTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt().then(() => {
          setDeferredPrompt(null);
        });
      } else {
        toast.info('App is already installed or your browser doesn\'t support automatic PWA install.');
      }
    };
    window.addEventListener('inventoryos-install-pwa', handleManualInstallTrigger);

    // 4. Online/Offline network transition alerts
    const handleOnline = () => {
      toast.success('Connection Restored! Reconnected to live server.', {
        icon: <Wifi className="h-4 w-4 text-emerald-500" />,
        duration: 4000,
      });
    };

    const handleOffline = () => {
      toast.warning('Offline Mode: Internet disconnected. Workspaces & POS Terminal remain accessible.', {
        icon: <WifiOff className="h-4 w-4 text-amber-500" />,
        duration: 8000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('InventoryOS installed successfully!');
        setIsInstallable(false);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('PWA install error:', err);
    }
  };

  // If already running inside standalone window or not installable, don't show prompt
  if (isStandalone || !isInstallable || !showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-950 text-white border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">Install InventoryOS App</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Install as a fast native desktop or tablet application with offline POS caching and fullscreen support.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg gap-1.5 font-medium px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install Now</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstallBanner(false)}
              className="h-8 text-xs text-slate-400 hover:text-white rounded-lg px-2"
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={() => setShowInstallBanner(false)}
          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
