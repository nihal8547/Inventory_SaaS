'use client';

import { useRef, useEffect, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  onScan: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function BarcodeScannerInput({ onScan, placeholder = 'Scan barcode...', className, autoFocus = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      setScanning(true);
      onScan(value.trim());
      setValue('');
      setTimeout(() => {
        setScanning(false);
        inputRef.current?.focus();
      }, 300);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
        scanning ? 'text-green-500' : 'text-muted-foreground'
      )}>
        <ScanLine className="h-4 w-4" />
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('pl-9', scanning && 'border-green-400 bg-green-50 dark:bg-green-900/20')}
      />
    </div>
  );
}
