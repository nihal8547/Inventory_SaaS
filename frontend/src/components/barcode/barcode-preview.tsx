'use client';

import { useEffect, useRef } from 'react';
import type { BarcodeFormat } from '@/types';

interface Props {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  showValue?: boolean;
}

export function BarcodePreview({ value, format = 'CODE128', width = 160, height = 60, showValue = true }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    import('jsbarcode').then((mod) => {
      const JsBarcode = mod.default;
      const jsFmt = format === 'QR_CODE' ? 'CODE128' : format;
      try {
        JsBarcode(ref.current, value, {
          format: jsFmt,
          width: 1.5,
          height: height,
          displayValue: showValue,
          fontSize: 10,
          margin: 4,
        });
      } catch {
        // Invalid barcode value for format — silently skip
      }
    });
  }, [value, format, height, showValue]);

  return (
    <div className="flex justify-center">
      <svg ref={ref} className="max-w-full" />
    </div>
  );
}
