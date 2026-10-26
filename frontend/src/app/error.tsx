'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error caught by ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xl shadow-rose-500/10">
          <AlertTriangle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-rose-600 dark:text-rose-400 uppercase">
            Application Error
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Something unexpected occurred
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {error?.message && error.message.length < 120
              ? error.message
              : 'An unexpected application glitch occurred. Your session and inventory data remain secure.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Reloading Component
          </Button>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full rounded-xl">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
