import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-400 tracking-wide">
        Loading inventory workspace...
      </p>
    </div>
  );
}
