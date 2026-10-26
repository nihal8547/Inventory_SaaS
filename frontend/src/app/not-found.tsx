import React from 'react';
import Link from 'next/link';
import { PackageX, ArrowLeft, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-24 w-24 rounded-3xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/10">
          <PackageX className="h-12 w-12" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
            404 Error — Page Not Found
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inventory Route Missing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The page or resource you are trying to access does not exist, has been moved, or belongs to another store branch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/products" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full rounded-xl">
              <Search className="h-4 w-4 mr-2" />
              Browse Catalog
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
