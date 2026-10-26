'use client';

import { BarcodePreview } from './barcode-preview';
import type { Barcode, BarcodeLabelTemplate, Product } from '@/types';

interface Props {
  barcode: Barcode;
  product: Product;
  template?: Partial<BarcodeLabelTemplate>;
}

export function BarcodeLabel({ barcode, product, template }: Props) {
  const t: Partial<BarcodeLabelTemplate> = {
    showProductName: true,
    showSku: true,
    showBarcode: true,
    showBarcodeValue: true,
    showPrice: true,
    fontSize: 10,
    ...template,
  };

  return (
    <div
      className="barcode-label flex flex-col items-center border border-dashed border-slate-300 p-2 bg-white"
      style={{ width: `${(template?.width ?? 50) * 3}px`, minHeight: `${(template?.height ?? 30) * 3}px` }}
    >
      {t.showProductName && (
        <p className="font-bold text-center leading-tight" style={{ fontSize: `${t.fontSize}px` }}>
          {product.name}
        </p>
      )}
      {t.showSku && (
        <p className="text-center font-mono text-muted-foreground" style={{ fontSize: `${(t.fontSize ?? 10) - 1}px` }}>
          {product.sku}
        </p>
      )}
      {t.showBarcode && (
        <BarcodePreview
          value={barcode.barcodeValue}
          format={barcode.barcodeFormat}
          showValue={t.showBarcodeValue}
          height={40}
        />
      )}
      {t.showPrice && (
        <p className="font-bold" style={{ fontSize: `${t.fontSize}px` }}>
          ${product.sellingPrice.toFixed(2)}
        </p>
      )}
    </div>
  );
}
