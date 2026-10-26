'use client';

import { useAuthStore } from '@/store/auth.store';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronDown } from 'lucide-react';

export function BranchSwitcher() {
  const { currentBranch, branches, setBranch } = useAuthStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[180px]">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{currentBranch?.name ?? 'Select Branch'}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setBranch(branch)}
            className={currentBranch?.id === branch.id ? 'bg-accent' : ''}
          >
            {branch.name}
          </DropdownMenuItem>
        ))}
        {branches.length === 0 && (
          <DropdownMenuItem disabled>No branches available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
